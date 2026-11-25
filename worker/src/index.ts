// Mini proxy gratis (Cloudflare Workers) para buscar alimentos por nombre en Open Food Facts.
// Open Food Facts no permite esa búsqueda desde el navegador (CORS); este Worker la hace por ti,
// con el User-Agent que ellos piden, y deja pasar solo a esta app.

export interface Env {
  /** Orígenes permitidos, separados por coma. */
  ALLOWED_ORIGINS?: string
}

const DEFAULT_ORIGINS = 'https://conprepu.github.io,http://localhost:4173,http://localhost:5173'
const UA = 'Forja/1.0 (personal PWA; https://github.com/conprepu/forja)'
const FIELDS = 'code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity'
const UPSTREAM = 'https://search.openfoodfacts.org/search'

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } })

export function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean)
}

export function upstreamUrl(q: string, limit: number): string {
  return `${UPSTREAM}?q=${encodeURIComponent(q)}&page_size=${limit}&langs=es&fields=${FIELDS}`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    const allowed = allowedOrigins(env)
    const cors = {
      'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : (allowed[0] ?? ''),
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }

    // Un navegador desde otra página: rechazado. Sin Origin (curl, pruebas) se permite.
    if (origin && !allowed.includes(origin)) return json({ error: 'origin_not_allowed' }, 403, cors)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors)

    const url = new URL(request.url)
    if (url.pathname !== '/search') return json({ ok: true, service: 'forja-off-proxy' }, 200, cors)

    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100)
    if (q.length < 2) return json({ hits: [] }, 200, cors)
    const limit = Math.min(40, Math.max(1, Number(url.searchParams.get('limit')) || 25))
    const target = upstreamUrl(q, limit)

    // caché de una hora: las mismas búsquedas no vuelven a pegarle a Open Food Facts
    const cache = typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : null
    const key = new Request(target)
    const hit = await cache?.match(key)
    if (hit) {
      // los encabezados CORS se ponen con set(): copiarlos con un spread los duplica (distinta mayúscula) y el navegador rechaza la respuesta
      const headers = new Headers(hit.headers)
      for (const [k, v] of Object.entries(cors)) headers.set(k, v)
      return new Response(hit.body, { status: 200, headers })
    }

    let res: Response
    try {
      res = await fetch(target, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    } catch {
      return json({ error: 'upstream_unreachable' }, 502, cors)
    }
    if (!res.ok) return json({ error: 'upstream_error', status: res.status }, 502, cors)

    let data: { hits?: unknown }
    try {
      data = (await res.json()) as { hits?: unknown }
    } catch {
      return json({ error: 'upstream_invalid' }, 502, cors)
    }
    // solo lo necesario (la respuesta original trae información de depuración)
    const out = json({ hits: Array.isArray(data.hits) ? data.hits : [] }, 200, { ...cors, 'Cache-Control': 'public, max-age=3600' })
    if (cache) await cache.put(key, out.clone())
    return out
  },
}
