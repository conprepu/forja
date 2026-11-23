import { progress } from '../lib/nutrition'

interface Props {
  value: number
  goal: number
  size?: number
  /** Texto accesible, p. ej. "1500 de 2400 kcal". */
  label: string
}

const TICKS = 48

/** Anillo HUD de segmentos: restantes al centro; se pone naranja si te pasas de la meta. */
export function Ring({ value, goal, size = 150, label }: Props) {
  const mid = size / 2
  const outer = mid - 2
  const inner = outer - 12
  const over = goal > 0 && value > goal
  const left = Math.round(goal - value)
  const filled = over ? TICKS : Math.round(progress(value, goal) * TICKS)
  const on = over ? 'var(--warn)' : 'var(--cy)'

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" style={{ filter: 'drop-shadow(0 0 3px var(--glow))' }}>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2
          const cos = Math.cos(a)
          const sin = Math.sin(a)
          const lit = i < filled
          return (
            <line
              key={i}
              x1={mid + cos * inner}
              y1={mid + sin * inner}
              x2={mid + cos * outer}
              y2={mid + sin * outer}
              stroke={lit ? on : 'var(--line)'}
              strokeWidth={lit ? 3 : 2}
              style={{ transition: 'stroke .25s' }}
            />
          )
        })}
        <circle cx={mid} cy={mid} r={inner - 7} fill="none" stroke="var(--acc)" strokeWidth={1} strokeDasharray="2 5" opacity={0.7} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
        <b className={`font-num text-[36px] leading-none font-bold ${over ? 'text-warn' : ''}`}>{Math.abs(left).toLocaleString('es-MX')}</b>
        <span className="mt-1 font-num text-[12px] font-semibold tracking-[0.12em] text-mut uppercase">{over ? 'kcal de más' : 'kcal restantes'}</span>
      </div>
    </div>
  )
}
