import { useEffect, useRef, useState } from 'react'
import { btn, btnPri, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  onCode: (code: string) => void
}

function cameraError(e: unknown): string {
  const name = (e as DOMException)?.name
  if (!window.isSecureContext) return 'La cámara solo funciona con HTTPS.'
  if (name === 'NotAllowedError') return 'Permite el acceso a la cámara (Ajustes › Safari › Cámara) o escribe el código a mano.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No se encontró una cámara. Escribe el código a mano.'
  return 'No se pudo abrir la cámara. Escribe el código a mano.'
}

/** Escáner de código de barras con la cámara trasera (@zxing, cargado solo cuando se abre). */
export function Scanner({ open, onClose, onCode }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    if (!open) return
    let stopped = false
    let done = false
    let controls: { stop: () => void } | undefined
    setError('')
    setStarting(true)
    ;(async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
        const hints = new Map<number, unknown>([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]]])
        const reader = new BrowserMultiFormatReader(hints as Map<never, never>)
        const c = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video.current!, (result) => {
          if (!result || done) return
          done = true
          try {
            navigator.vibrate?.(60)
          } catch {
            /* sin vibración en iOS */
          }
          onCode(result.getText())
        })
        if (stopped) c.stop()
        else controls = c
        setStarting(false)
      } catch (e) {
        if (!stopped) {
          setError(cameraError(e))
          setStarting(false)
        }
      }
    })()
    return () => {
      stopped = true
      controls?.stop()
    }
    // onCode cambia en cada render del padre; el escáner solo debe arrancar al abrirse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Sheet open={open} onClose={onClose} title="Escanear código">
      <div className="grid gap-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-black">
          <video ref={video} className="h-full w-full object-cover" playsInline muted autoPlay aria-label="Vista de la cámara" />
          {!error && <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-0.5 -translate-y-1/2 bg-p/80" aria-hidden="true" />}
          {starting && !error && <p className="absolute inset-0 grid place-items-center text-sm text-white">Abriendo cámara…</p>}
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-p">{error}</p>}
        {!error && !starting && <p className="text-center text-sm text-mut">Apunta al código de barras del producto.</p>}

        <form
          className="grid grid-cols-[1fr_auto] gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.replace(/\D/g, '')) onCode(manual)
          }}
        >
          <input className={field} inputMode="numeric" placeholder="O escribe el código" aria-label="Código de barras" value={manual} onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ''))} />
          <button type="submit" className={btnPri} disabled={!manual}>Buscar</button>
        </form>
        <button type="button" className={btn} onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  )
}
