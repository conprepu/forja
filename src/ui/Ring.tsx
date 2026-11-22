import { progress } from '../lib/nutrition'

interface Props {
  value: number
  goal: number
  size?: number
  /** Texto accesible, p. ej. "1500 de 2400 kcal". */
  label: string
}

/** Anillo de progreso: restantes al centro; se pone naranja si te pasas de la meta. */
export function Ring({ value, goal, size = 150, label }: Props) {
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const over = goal > 0 && value > goal
  const left = Math.round(goal - value)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'var(--warn)' : 'var(--acc)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress(value, goal))}
          style={{ transition: 'stroke-dashoffset .3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
        <b className={`font-num text-[32px] leading-none font-extrabold ${over ? 'text-warn' : ''}`}>{Math.abs(left).toLocaleString('es-MX')}</b>
        <span className="mt-1 text-xs text-mut">{over ? 'kcal de más' : 'kcal restantes'}</span>
      </div>
    </div>
  )
}
