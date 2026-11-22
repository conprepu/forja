import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { getLastBackup, markBackup } from '../../db/prefs'
import { backupLabel } from '../../lib/backupReminder'
import { backupToJson, exportBackup, importBackup, parseBackup, wipeAll } from '../../db/backup'
import { db } from '../../db/db'
import {
  applyMigration,
  convertPrototype,
  parsePrototypeBackup,
  type MigrationSummary,
} from '../../db/migratePrototype'
import { storageEstimate } from '../../db/storage'
import { btn, btnDanger, btnPri } from '../../ui/cls'
import { formatBytes, localDateStamp, saveTextFile } from './files'

type Msg = { kind: 'ok' | 'error'; text: string }


function summaryText(s: MigrationSummary): string {
  const parts: [number, string, string][] = [
    [s.workouts, 'entreno', 'entrenos'],
    [s.routines, 'rutina', 'rutinas'],
    [s.diary, 'comida registrada', 'comidas registradas'],
    [s.body, 'peso', 'pesos'],
    [s.meals, 'comida guardada', 'comidas guardadas'],
    [s.exercises, 'ejercicio propio', 'ejercicios propios'],
    [s.foods, 'alimento propio', 'alimentos propios'],
  ]
  const text = parts.filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
  return text.length ? text.join(', ') : 'sin datos nuevos'
}

export function BackupSection() {
  const lastBackup = useLiveQuery(() => getLastBackup(db), [])
  const [msg, setMsg] = useState<Msg | null>(null)
  const [busy, setBusy] = useState(false)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<number | null>(null)
  const restoreRef = useRef<HTMLInputElement>(null)
  const protoRef = useRef<HTMLInputElement>(null)

  const refreshStorage = () => {
    void navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(false))
    void storageEstimate().then((e) => setUsage(e?.usage ?? null))
  }
  useEffect(refreshStorage, [])

  async function run(task: () => Promise<Msg | null>) {
    setBusy(true)
    setMsg(null)
    try {
      setMsg(await task())
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Algo salió mal.' })
    } finally {
      setBusy(false)
      refreshStorage()
    }
  }

  const onExport = () =>
    run(async () => {
      const json = backupToJson(await exportBackup(db))
      await saveTextFile(`forja-respaldo-${localDateStamp()}.json`, json)
      await markBackup(db)
      return { kind: 'ok', text: 'Respaldo listo. Guárdalo en Archivos o iCloud.' }
    })

  const onRestore = (file: File | undefined) =>
    run(async () => {
      if (!file) return null
      const backup = parseBackup(await file.text()) // valida todo antes de tocar la base
      if (!window.confirm('Esto reemplaza TODOS tus datos actuales por los del respaldo. ¿Continuar?')) return null
      await importBackup(db, backup)
      return { kind: 'ok', text: 'Respaldo restaurado.' }
    })

  const onProto = (file: File | undefined) =>
    run(async () => {
      if (!file) return null
      const res = convertPrototype(parsePrototypeBackup(await file.text()))
      const summary = await applyMigration(db, res)
      return { kind: 'ok', text: `Importado del prototipo: ${summaryText(summary)}.` }
    })

  const onWipe = () =>
    run(async () => {
      if (!window.confirm('¿Borrar TODOS tus datos? No se puede deshacer. Exporta un respaldo antes.')) return null
      await wipeAll(db)
      return { kind: 'ok', text: 'Datos borrados.' }
    })

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => () => ref.current?.click()
  const onFile =
    (handler: (f: File | undefined) => Promise<void>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // permite elegir el mismo archivo otra vez
      void handler(file)
    }

  return (
    <section aria-labelledby="respaldo-h" className="my-3 rounded-[18px] border border-line bg-card p-4">
      <h2 id="respaldo-h">Respaldo</h2>
      <p className="mt-1 text-sm text-mut">
        Tus datos viven solo en este iPhone. Exporta un respaldo seguido: si Safari limpia el almacenamiento, es
        lo único que te salva.
      </p>

      <p className="mt-1 text-sm font-semibold">{backupLabel(lastBackup ?? null, Date.now())}</p>

      <div className="mt-3 grid gap-2">
        <button type="button" className={btnPri} disabled={busy} onClick={() => void onExport()}>
          Exportar respaldo
        </button>
        <button type="button" className={btn} disabled={busy} onClick={pick(restoreRef)}>
          Importar respaldo
        </button>
        <button type="button" className={btn} disabled={busy} onClick={pick(protoRef)}>
          Importar del prototipo
        </button>
        <button type="button" className={btnDanger} disabled={busy} onClick={() => void onWipe()}>
          Borrar todos los datos
        </button>
      </div>
      <input ref={restoreRef} type="file" accept="application/json,.json" hidden onChange={onFile(onRestore)} />
      <input ref={protoRef} type="file" accept="application/json,.json" hidden onChange={onFile(onProto)} />

      <div role="status" aria-live="polite" className="mt-3 min-h-6 text-sm font-semibold">
        {msg && <span className={msg.kind === 'ok' ? 'text-ok' : 'text-p'}>{msg.text}</span>}
      </div>

      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
        <dt className="text-mut">Almacenamiento protegido</dt>
        <dd className="text-right font-semibold">{persisted == null ? '…' : persisted ? 'Sí' : 'No'}</dd>
        <dt className="text-mut">Espacio usado</dt>
        <dd className="text-right font-semibold">{usage == null ? '—' : formatBytes(usage)}</dd>
      </dl>
      {persisted === false && (
        <p className="mt-2 text-xs text-warn">
          Safari puede borrar los datos si no usas la app. Instálala en la pantalla de inicio y exporta respaldos.
        </p>
      )}
    </section>
  )
}
