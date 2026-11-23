import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../db/db'
import { getGoals } from '../../db/nutrition'
import { addDays, formatShort, todayStr } from '../../lib/dates'
import { DEFAULT_GOALS } from '../../lib/nutrition'
import { dailyTotals, nutritionTrend } from '../../lib/today'
import { card } from '../../ui/cls'
import { Empty } from '../../ui/Screen'
import { Segmented } from '../../ui/Segmented'

type Range = '7' | '30'

export function NutritionTab() {
  const [range, setRange] = useState<Range>('7')
  const days = Number(range)
  const end = todayStr()
  const start = addDays(end, -(days - 1))
  const entries = useLiveQuery(() => db.diary.where('date').between(start, end, true, true).toArray(), [start, end])
  const goals = useLiveQuery(() => getGoals(db), []) ?? DEFAULT_GOALS

  const totals = useMemo(() => dailyTotals(entries ?? [], end, days), [entries, end, days])
  const trend = nutritionTrend(totals, goals)
  const data = totals.map((d) => ({ dia: formatShort(d.date), kcal: d.logged ? d.kcal : 0 }))
  const macros = [
    { k: 'Proteína', v: trend.avg.p, g: goals.p, cls: 'text-p' },
    { k: 'Carbos', v: trend.avg.c, g: goals.c, cls: 'text-c' },
    { k: 'Grasa', v: trend.avg.f, g: goals.f, cls: 'text-f' },
  ]

  return (
    <>
      <Segmented
        label="Periodo"
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: '7 días' },
          { value: '30', label: '30 días' },
        ]}
      />
      {entries === undefined ? null : trend.loggedDays === 0 ? (
        <Empty>No hay comidas registradas en este periodo. Registra lo que comes y aquí verás tus promedios.</Empty>
      ) : (
        <>
          <section className={card} aria-labelledby="nt-prom">
            <h2 id="nt-prom">Promedio diario</h2>
            <p className="text-sm text-mut">De {trend.loggedDays} {trend.loggedDays === 1 ? 'día registrado' : 'días registrados'}</p>
            <p className="mt-2">
              <b className="font-num text-3xl">{trend.avg.kcal.toLocaleString('es-MX')}</b> <span className="text-mut">/ {goals.kcal.toLocaleString('es-MX')} kcal</span>
            </p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              {macros.map((m) => (
                <div key={m.k} className="cut-sm bg-soft px-2 py-2">
                  <dt className="text-xs text-mut">{m.k}</dt>
                  <dd className={`font-num text-xl font-extrabold ${m.cls}`}>
                    {m.v}
                    <span className="text-xs font-semibold text-mut"> / {m.g} g</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={card} aria-labelledby="nt-cumple">
            <h2 id="nt-cumple">Cumplimiento</h2>
            <ul className="mt-1 grid gap-1 text-sm">
              <li>🎯 <b>{trend.onTargetDays}</b> de {trend.loggedDays} días dentro de ±10 % de tu meta de calorías</li>
              <li>💪 <b>{trend.proteinDays}</b> de {trend.loggedDays} días con la proteína completa (≥ 90 %)</li>
            </ul>
          </section>

          <section className={card} aria-labelledby="nt-cal">
            <h2 id="nt-cal">Calorías por día</h2>
            <figure role="img" aria-label={`Calorías por día en los últimos ${days} días; meta ${goals.kcal} kcal`} className="m-0 mt-2">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: 'var(--mut)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={days > 7 ? 24 : 4} />
                  <YAxis tick={{ fill: 'var(--mut)', fontSize: 11 }} tickLine={false} axisLine={false} width={44} domain={[0, (max: number) => Math.ceil(Math.max(max, goals.kcal) * 1.1)]} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)', fontSize: 13 }}
                    labelStyle={{ color: 'var(--mut)' }}
                    cursor={{ fill: 'var(--soft)' }}
                    formatter={(v) => [`${v} kcal`, 'Calorías']}
                  />
                  <ReferenceLine y={goals.kcal} stroke="var(--c)" strokeDasharray="4 4" />
                  <Bar dataKey="kcal" fill="var(--acc)" radius={0} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </figure>
            <p className="text-xs text-mut">La línea punteada es tu meta. Los días sin registro quedan vacíos y no cuentan en el promedio.</p>
          </section>
        </>
      )}
    </>
  )
}
