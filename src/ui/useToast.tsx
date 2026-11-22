import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/** Aviso breve sobre la tab bar. `show("texto")` lo muestra 2.5 s. */
export function useToast(): { toast: ReactNode; show: (msg: string) => void } {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const show = useCallback((m: string) => {
    setMsg(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2500)
  }, [])

  const toast = msg ? (
    <div
      role="status"
      className="fixed left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-center text-sm font-semibold text-bg bottom-[calc(var(--tabbar-h)+84px+env(safe-area-inset-bottom))]"
    >
      {msg}
    </div>
  ) : null
  return { toast, show }
}
