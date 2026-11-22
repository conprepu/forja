import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Row = Record<string, string | number | undefined>

const axis = { fill: 'var(--mut)', fontSize: 11 }
const tooltip = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)', fontSize: 13 },
  labelStyle: { color: 'var(--mut)' },
  cursor: { stroke: 'var(--line)' },
}

interface Props {
  data: Row[]
  xKey: string
  yKey: string
  /** Nombre y unidad que se muestran en el tooltip. */
  name: string
  unit?: string
  label: string
  height?: number
  color?: string
}

export function LineSeries({ data, xKey, yKey, name, unit = '', label, height = 200, color = 'var(--acc)' }: Props) {
  return (
    <figure role="img" aria-label={label} className="m-0">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
          <YAxis tick={axis} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={44} />
          <Tooltip {...tooltip} formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, name]} />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

export function BarSeries({ data, xKey, yKey, name, unit = '', label, height = 160, color = 'var(--acc)' }: Props) {
  return (
    <figure role="img" aria-label={label} className="m-0">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={28} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={44} />
          <Tooltip {...tooltip} cursor={{ fill: 'var(--soft)' }} formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, name]} />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 2, 2]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
