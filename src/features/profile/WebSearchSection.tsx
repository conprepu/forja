import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { getOffProxy, setOffProxy } from '../../db/off'
import { normalizeProxyUrl, searchOff } from '../../lib/off'
import { btn, btnPri, card, field } from '../../ui/cls'

type Msg = { kind: 'ok' | 'error'; text: string } | null

/** URL del proxy de Open Food Facts (ver worker/README.md) que permite buscar alimentos por nombre en internet. */
export function WebSearchSection() {
  const saved = useLiveQuery(async () => (await getOffProxy(db)) ?? '', [])
  const [url, setUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (saved !== undefined && !loaded) {
      setUrl(saved)
      setLoaded(true)
    }
  }, [saved, loaded])

  const normalized = normalizeProxyUrl(url)

  async function test() {
    if (!normalized) return setMsg({ kind: 'error', text: 'Pega una URL que empiece con https://' })
    setBusy(true)
    setMsg(null)
    try {
      const r = await searchOff('pozole', normalized)
      setMsg({ kind: 'ok', text: r.length ? `Funciona: ${r.length} resultados con datos para “pozole”.` : 'Responde, pero sin resultados con datos para “pozole”.' })
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo probar.' })
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!url.trim()) {
      await setOffProxy(db, null)
      return setMsg({ kind: 'ok', text: 'Búsqueda en internet desactivada.' })
    }
    if (!normalized) return setMsg({ kind: 'error', text: 'Pega una URL que empiece con https://' })
    await setOffProxy(db, normalized)
    setUrl(normalized)
    setMsg({ kind: 'ok', text: 'Guardado ✓' })
  }

  return (
    <section aria-labelledby="web-h" className={card}>
      <h2 id="web-h">Búsqueda en internet</h2>
      <p className="mt-1 text-sm text-mut">
        Busca por nombre en Open Food Facts lo que “Describir” no encuentra. Ya viene con el proxy de Forja (un mini servicio gratis en Cloudflare, ver
        <b> worker/README.md</b>); pega otra URL para usar el tuyo o déjala vacía y guarda para apagarlo. El código de barras funciona sin esto.
      </p>
      <label className="mt-3 grid gap-1 text-sm text-mut">
        URL del proxy
        <input
          className={`${field} text-ink`}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="https://forja-off-proxy.tu-usuario.workers.dev"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className={btn} disabled={busy || !url.trim()} onClick={() => void test()}>Probar</button>
        <button type="button" className={btnPri} disabled={busy} onClick={() => void save()}>Guardar</button>
      </div>
      <p role="status" className={`mt-2 min-h-5 text-sm font-semibold ${msg?.kind === 'error' ? 'text-p' : 'text-ok'}`}>{msg?.text}</p>
    </section>
  )
}
