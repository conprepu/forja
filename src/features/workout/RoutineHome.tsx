import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import type { Folder, Routine, Workout } from '../../db/schema'
import {
  addSampleRoutines,
  createFolder,
  deleteFolder,
  deleteRoutine,
  duplicateRoutine,
  moveRoutine,
  recentWorkouts,
  renameFolder,
  setRoutineFolder,
} from '../../db/workouts'
import { fmtN, fmtT } from '../../lib/time'
import { workoutVolume } from '../../lib/workout'
import { btn, btnDanger, btnGhost, btnPri, card, field } from '../../ui/cls'
import { Screen } from '../../ui/Screen'
import { Sheet } from '../../ui/Sheet'
import { countsVolume, useExerciseMap } from './hooks'
import { RoutineEditor } from './RoutineEditor'
import { useWorkout } from './store'
import { WorkoutDetail } from './WorkoutDetail'

type Editor = { routine: Routine | null; folderId?: string } | null

export function RoutineHome() {
  const exercises = useExerciseMap()
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [])
  const folders = useLiveQuery(() => db.folders.orderBy('order').toArray(), [])
  const recents = useLiveQuery(() => recentWorkouts(db, 3), [])
  const st = useWorkout.getState
  const active = useWorkout((s) => s.active)

  const [editor, setEditor] = useState<Editor>(null)
  const [menu, setMenu] = useState<Routine | null>(null)
  const [moving, setMoving] = useState<Routine | null>(null)
  const [folderSheet, setFolderSheet] = useState<{ folder?: Folder } | null>(null)
  const [folderName, setFolderName] = useState('')
  const [detail, setDetail] = useState<Workout | null>(null)

  const loaded = routines !== undefined && folders !== undefined
  const byFolder = (id: string | undefined) => (routines ?? []).filter((r) => r.folderId === id)

  const summary = (r: Routine) =>
    r.items.map((it) => exercises.get(it.exerciseId)?.name ?? '…').join(', ') || 'Sin ejercicios'

  const routineCard = (r: Routine) => (
    <article key={r.id} className={card}>
      <div className="flex items-center gap-1">
        <h3 className="min-w-0 flex-1 truncate">{r.name}</h3>
        <button type="button" className={`${btn} w-11 px-0`} aria-label={`Opciones de ${r.name}`} onClick={() => setMenu(r)}>•••</button>
      </div>
      <p className="mt-1 mb-3 line-clamp-2 text-sm text-mut">{summary(r)}</p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button type="button" className={btnPri} onClick={() => st().startFromRoutine(r)}>Empezar</button>
        <button type="button" className={btn} onClick={() => setEditor({ routine: r })}>Editar</button>
      </div>
    </article>
  )

  const openFolderSheet = (folder?: Folder) => {
    setFolderName(folder?.name ?? '')
    setFolderSheet({ folder })
  }

  return (
    <Screen title="Entreno">
      <button type="button" className={`${btnPri} mt-1.5 min-h-[52px] w-full text-[17px]`} onClick={() => st().startEmpty()}>
        Empezar entrenamiento vacío
      </button>

      <div className="mt-5 mb-1 flex items-center gap-1">
        <h2 className="flex-1">Mis rutinas</h2>
        <button type="button" className={btnGhost} onClick={() => openFolderSheet()}>+ Carpeta</button>
        <button type="button" className={btnGhost} onClick={() => setEditor({ routine: null })}>+ Rutina</button>
      </div>

      {loaded && (routines?.length ?? 0) === 0 && (folders?.length ?? 0) === 0 && (
        <div className={`${card} text-center text-mut`}>
          Todavía no tienes rutinas.
          <button type="button" className={`${btn} mt-4 w-full`} onClick={() => void addSampleRoutines(db)}>
            Agregar ejemplo Push / Pull / Pierna
          </button>
        </div>
      )}

      {(folders ?? []).map((f) => (
        <section key={f.id} aria-label={`Carpeta ${f.name}`} className="mt-3">
          <div className="flex items-center gap-1">
            <h3 className="min-w-0 flex-1 truncate text-mut">📁 {f.name} · {byFolder(f.id).length}</h3>
            <button type="button" className={btnGhost} onClick={() => setEditor({ routine: null, folderId: f.id })}>+ Rutina</button>
            <button type="button" className={btnGhost} onClick={() => openFolderSheet(f)}>Editar</button>
          </div>
          {byFolder(f.id).map(routineCard)}
        </section>
      ))}
      {(folders?.length ?? 0) > 0 && byFolder(undefined).length > 0 && <h3 className="mt-4 text-mut">Sin carpeta</h3>}
      {byFolder(undefined).map(routineCard)}

      {(recents?.length ?? 0) > 0 && (
        <>
          <h2 className="mt-6 mb-1">Recientes</h2>
          {recents!.map((w) => {
            const sets = w.items.reduce((n, i) => n + i.sets.length, 0)
            const vol = workoutVolume(w.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets })), (id) => countsVolume(exercises.get(id)))
            return (
              <button key={w.id} type="button" onClick={() => setDetail(w)} className={`${card} block w-full text-left`}>
                <div className="flex items-baseline gap-2">
                  <h3 className="min-w-0 flex-1 truncate">{w.name}</h3>
                  <span className="text-xs text-mut">{new Date(w.startedAt).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3.5 text-sm text-mut">
                  <span>{fmtT((w.endedAt - w.startedAt) / 1000)}</span>
                  <span>{fmtN(vol)} kg</span>
                  <span>{sets} series</span>
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs text-mut">
                  {w.items.map((i) => `${i.sets.length}× ${exercises.get(i.exerciseId)?.name ?? '…'}`).join(' · ')}
                </p>
              </button>
            )
          })}
        </>
      )}

      <RoutineEditor open={!!editor} routine={editor?.routine} defaultFolderId={editor?.folderId} onClose={() => setEditor(null)} />
      <WorkoutDetail workout={detail} canStart={!active} onClose={() => setDetail(null)} />

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name ?? 'Rutina'}>
        {menu && (
          <div className="grid gap-2">
            <button type="button" className={btn} onClick={async () => { await duplicateRoutine(db, menu.id); setMenu(null) }}>Duplicar</button>
            <button type="button" className={btn} onClick={() => { setMoving(menu); setMenu(null) }}>Mover a carpeta…</button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={btn} onClick={() => void moveRoutine(db, menu.id, -1)}>Subir</button>
              <button type="button" className={btn} onClick={() => void moveRoutine(db, menu.id, 1)}>Bajar</button>
            </div>
            <button
              type="button"
              className={btnDanger}
              onClick={async () => {
                if (!window.confirm(`¿Eliminar la rutina "${menu.name}"? Tus entrenos pasados no se borran.`)) return
                await deleteRoutine(db, menu.id)
                setMenu(null)
              }}
            >
              Eliminar rutina
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!moving} onClose={() => setMoving(null)} title="Mover a carpeta">
        {moving && (
          <div className="grid gap-2">
            <button type="button" className={`${btn} ${!moving.folderId ? 'bg-acc text-accink' : ''}`} onClick={async () => { await setRoutineFolder(db, moving.id, undefined); setMoving(null) }}>
              Sin carpeta
            </button>
            {(folders ?? []).map((f) => (
              <button key={f.id} type="button" className={`${btn} ${moving.folderId === f.id ? 'bg-acc text-accink' : ''}`} onClick={async () => { await setRoutineFolder(db, moving.id, f.id); setMoving(null) }}>
                {f.name}
              </button>
            ))}
            {(folders?.length ?? 0) === 0 && <p className="text-center text-sm text-mut">Primero crea una carpeta.</p>}
          </div>
        )}
      </Sheet>

      <Sheet open={!!folderSheet} onClose={() => setFolderSheet(null)} title={folderSheet?.folder ? 'Editar carpeta' : 'Nueva carpeta'}>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-mut">
            Nombre
            <input className={`${field} text-ink`} value={folderName} placeholder="Ej. Fuerza" onChange={(e) => setFolderName(e.target.value)} />
          </label>
          <button
            type="button"
            className={btnPri}
            onClick={async () => {
              if (folderSheet?.folder) await renameFolder(db, folderSheet.folder.id, folderName)
              else await createFolder(db, folderName)
              setFolderSheet(null)
            }}
          >
            Guardar
          </button>
          {folderSheet?.folder && (
            <button
              type="button"
              className={btnDanger}
              onClick={async () => {
                if (!window.confirm('¿Eliminar la carpeta? Sus rutinas se conservan, sin carpeta.')) return
                await deleteFolder(db, folderSheet.folder!.id)
                setFolderSheet(null)
              }}
            >
              Eliminar carpeta
            </button>
          )}
        </div>
      </Sheet>
    </Screen>
  )
}
