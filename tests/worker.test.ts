import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { allowedOrigins, upstreamUrl } from '../worker/src/index'

const ORIGIN = 'https://conprepu.github.io'
const call = (path: string, init: RequestInit = {}) => worker.fetch(new Request(`https://proxy.test${path}`, init), {})

afterEach(() => vi.unstubAllGlobals())

const stubUpstream = (body: unknown, status = 200) => {
  const f = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', f)
  return f
}

describe('proxy de Open Food Facts', () => {
  it('busca en Open Food Facts con el User-Agent de la app y devuelve solo los hits', async () => {
    const f = stubUpstream({ hits: [{ code: '1', product_name: 'Pozole' }], debug: { secreto: true }, facets: {} })
    const res = await call('/search?q=pozole', { headers: { Origin: ORIGIN } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hits: [{ code: '1', product_name: 'Pozole' }] })
    const [url, init] = f.mock.calls[0]!
    expect(String(url)).toContain('search.openfoodfacts.org/search?q=pozole')
    expect(String(url)).toContain('langs=es')
    expect((init?.headers as Record<string, string>)['User-Agent']).toMatch(/^Forja\/1\.0/)
  })

  it('responde con CORS para el origen permitido', async () => {
    stubUpstream({ hits: [] })
    const res = await call('/search?q=pozole', { headers: { Origin: ORIGIN } })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('rechaza otros sitios', async () => {
    const f = stubUpstream({ hits: [] })
    const res = await call('/search?q=pozole', { headers: { Origin: 'https://malo.example' } })
    expect(res.status).toBe(403)
    expect(f).not.toHaveBeenCalled()
  })

  it('el preflight responde 204 sin consultar nada', async () => {
    const f = stubUpstream({})
    const res = await call('/search?q=x', { method: 'OPTIONS', headers: { Origin: ORIGIN } })
    expect(res.status).toBe(204)
    expect(f).not.toHaveBeenCalled()
  })

  it('solo acepta GET', async () => {
    expect((await call('/search?q=pozole', { method: 'POST' })).status).toBe(405)
  })

  it('búsquedas de menos de 2 letras no consultan', async () => {
    const f = stubUpstream({ hits: [{}] })
    expect(await (await call('/search?q=a')).json()).toEqual({ hits: [] })
    expect(await (await call('/search')).json()).toEqual({ hits: [] })
    expect(f).not.toHaveBeenCalled()
  })

  it('limita el texto y la cantidad de resultados, y codifica la búsqueda', async () => {
    const f = stubUpstream({ hits: [] })
    await call(`/search?q=${encodeURIComponent('a'.repeat(300) + ' & x')}&limit=999`)
    const url = String(f.mock.calls[0]![0])
    expect(url).toContain('page_size=40')
    expect(url.match(/q=([^&]*)/)![1]!.length).toBeLessThan(120)
  })

  it('errores de Open Food Facts se reportan como 502', async () => {
    stubUpstream({}, 503)
    expect((await call('/search?q=pozole')).status).toBe(502)
    vi.stubGlobal('fetch', async () => { throw new TypeError('red') })
    expect((await call('/search?q=pozole')).status).toBe(502)
    stubUpstream('no es objeto json {')
    vi.stubGlobal('fetch', async () => new Response('<html>', { status: 200 }))
    expect((await call('/search?q=pozole')).status).toBe(502)
  })

  it('la raíz dice que está vivo', async () => {
    expect(await (await call('/')).json()).toMatchObject({ ok: true })
  })

  it('los orígenes se pueden configurar', () => {
    expect(allowedOrigins({ ALLOWED_ORIGINS: 'https://a.com, https://b.com' })).toEqual(['https://a.com', 'https://b.com'])
    expect(allowedOrigins({})).toContain(ORIGIN)
    expect(upstreamUrl('a b', 5)).toContain('q=a%20b')
  })
})
