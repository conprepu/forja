import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { BODY_FIELDS, BODY_LABEL, deleteBody, saveBody, type BodyField } from '../../db/body'
import { db } from '../../db/db'
import { formatDay, formatShort, todayStr } from '../../lib/dates'
import { btnPri, card, chip, field } from '../../ui/cls'
import { NumField } from '../../ui/NumField'
import { LineSeries } from './charts'

export function BodyTab() {
  const entries = useLiveQuery(() => db.body.orderBy('date').toArray(), [])
  const [date, setDate] = useState(todayStr())
  const [values, setValues] = useState<Partial<Record<BodyField, number | null>>>({})
  const [formKey, setFormKey] = useState(0)
  const [metric, setMetric] = useState<BodyField>('weight')
  const [msg, setMsg] = useState('')

  const list = entries ?? []
  const withMetric = list.filter((e) => e[metric] !== undefined)
  const data = withMetric.map((e) => ({ fecha: formatShort(e.date), valor: e[metric] ?? 0 }))
  const present = BODY_FIELDS.filter((f) => list.some((e) => e[f] !== undefined))
  const hasValues = BODY_FIELDS.some((f) => values[f] != null)
  const { label, unit } = BODY_LABEL[metric]

  async function save() {
    await saveBody(db, date, values)
    setValues({})
    setFormKey((k) => k + 1)
    setMsg('Guardado ✓')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <section className={card} aria-label="Registrar medidas">
        <h3>Registrar medidas</h3>
        <label className="mt-2 grid gap-1 text-sm text-mut">
          Fecha
          <input type="date" className={`${field} text-ink`} value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <div key={formKey} className="mt-3 grid grid-cols-2 gap-2">
          {BODY_FIELDS.map((f) => (
            <label key={f} className="grid gap-1 text-sm text-mut">
              {BODY_LABEL[f].label} ({BODY_LABEL[f].unit})
              <NumField decimal label={BODY_LABEL[f].label} value={values[f] ?? null} onChange={(v) => setValues((s) => ({ ...s, [f]: v }))} />
            </label>
          ))}
        </div>
        <button type="button" className={`${btnPri} mt-3 w-full`} disabled={!hasValues} onClick={() => void save()}>
          Guardar
        </button>
        <p role="status" className="mt-2 min-h-5 text-center text-sm font-semibold text-ok">{msg}</p>
      </section>

      {present.length > 0 && (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Medida">
            {present.map((f) => (
              <button key={f} type="button" aria-pressed={metric === f} className={`${chip} ${metric === f ? 'bg-ink text-bg' : ''}`} onClick={() => setMetric(f)}>
                {BODY_LABEL[f].label}
              </button>
            ))}
          </div>
          <section className={card} aria-label={`Gráfica de ${label}`}>
            <LineSeries data={data} xKey="fecha" yKey="valor" name={label} unit={unit} label={`${label} a lo largo del tiempo`} />
          </section>
        </>
      )}

      {list.length > 0 && (
        <section className={card} aria-label="Historial de medidas">
          <h3>Historial</h3>
          <ul className="mt-1">
            {[...list].reverse().map((e) => (
              <li key={e.id} className="flex items-center gap-2 border-t border-line py-2 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-mut">{formatDay(e.date)}</p>
                  <p className="text-sm font-semibold">
                    {BODY_FIELDS.filter((f) => e[f] !== undefined).map((f) => `${BODY_LABEL[f].label} ${e[f]} ${BODY_LABEL[f].unit}`).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 min-w-11 rounded-xl text-p"
                  aria-label={`Eliminar medidas del ${formatDay(e.date)}`}
                  onClick={() => window.confirm('¿Eliminar estas medidas?') && void deleteBody(db, e.date)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
