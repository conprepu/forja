import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { getGoals, getProfile, saveGoals, saveProfile } from '../../db/nutrition'
import type { Goals, Profile } from '../../db/schema'
import { ACTIVITY, calcGoals, DEFAULT_GOALS, DEFAULT_PROFILE, GOAL_LABEL } from '../../lib/nutrition'
import { btn, btnPri, card, field } from '../../ui/cls'
import { NumField } from '../../ui/NumField'

type N = number | null

export function GoalsSection() {
  const stored = useLiveQuery(async () => ({ profile: await getProfile(db), goals: await getGoals(db) }), [])
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS)
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState('')

  // se carga una sola vez; después el usuario edita sin que lo pise la base
  useEffect(() => {
    if (stored && !loaded) {
      setProfile(stored.profile)
      setGoals(stored.goals)
      setLoaded(true)
    }
  }, [stored, loaded])

  const suggestion = calcGoals(profile)
  const setP = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }))
  const num = (label: string, value: number, onChange: (v: number) => void, decimal = false) => (
    <label className="grid gap-1 text-sm text-mut">
      {label}
      <NumField decimal={decimal} label={label} value={value} onChange={(v: N) => onChange(v ?? 0)} />
    </label>
  )

  async function save() {
    await saveProfile(db, profile)
    await saveGoals(db, goals)
    setMsg('Guardado ✓')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <section aria-labelledby="metas-h" className={card}>
      <h2 id="metas-h">Perfil y metas</h2>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm text-mut">
          Sexo
          <select className={`${field} text-ink`} value={profile.sex} onChange={(e) => setP({ sex: e.target.value as Profile['sex'] })}>
            <option value="m">Hombre</option>
            <option value="f">Mujer</option>
          </select>
        </label>
        {num('Edad (años)', profile.age, (v) => setP({ age: v }))}
        {num('Estatura (cm)', profile.height, (v) => setP({ height: v }), true)}
        {num('Peso (kg)', profile.weight, (v) => setP({ weight: v }), true)}
      </div>
      <label className="mt-2 grid gap-1 text-sm text-mut">
        Actividad
        <select className={`${field} text-ink`} value={profile.act} onChange={(e) => setP({ act: Number(e.target.value) })}>
          {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="mt-2 grid gap-1 text-sm text-mut">
        Objetivo
        <select className={`${field} text-ink`} value={profile.goal} onChange={(e) => setP({ goal: e.target.value as Profile['goal'] })}>
          {(Object.keys(GOAL_LABEL) as Profile['goal'][]).map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
        </select>
      </label>

      <div className="mt-3 rounded-xl bg-soft p-3 text-sm" aria-live="polite">
        <p className="text-mut">Mifflin-St Jeor · BMR {suggestion.bmr} · TDEE {suggestion.tdee} kcal</p>
        <p className="mt-1 font-semibold">
          Sugerido: {suggestion.kcal} kcal · P {suggestion.p} g · C {suggestion.c} g · G {suggestion.f} g
        </p>
        <button type="button" className={`${btn} mt-2 w-full`} onClick={() => setGoals((g) => ({ ...g, kcal: suggestion.kcal, p: suggestion.p, c: suggestion.c, f: suggestion.f }))}>
          Usar metas sugeridas
        </button>
      </div>

      <h3 className="mt-4">Metas diarias</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {num('Calorías (kcal)', goals.kcal, (v) => setGoals((g) => ({ ...g, kcal: v })))}
        {num('Proteína (g)', goals.p, (v) => setGoals((g) => ({ ...g, p: v })), true)}
        {num('Carbohidratos (g)', goals.c, (v) => setGoals((g) => ({ ...g, c: v })), true)}
        {num('Grasa (g)', goals.f, (v) => setGoals((g) => ({ ...g, f: v })), true)}
        {num('Agua (ml)', goals.waterMl, (v) => setGoals((g) => ({ ...g, waterMl: v })))}
      </div>

      <button type="button" className={`${btnPri} mt-3 w-full`} onClick={() => void save()}>Guardar</button>
      <p role="status" className="mt-2 min-h-5 text-center text-sm font-semibold text-ok">{msg}</p>
    </section>
  )
}
