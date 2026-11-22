import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { getHaptics, getTheme, saveHaptics, saveTheme } from '../../db/prefs'
import { hapticsSupported } from '../../lib/haptics'
import { THEMES } from '../../lib/theme'
import { card } from '../../ui/cls'
import { Segmented } from '../../ui/Segmented'

/** Tema claro/oscuro y vibración. */
export function AppearanceSection() {
  const theme = useLiveQuery(() => getTheme(db), [])
  const haptics = useLiveQuery(() => getHaptics(db), [])
  const supported = hapticsSupported()

  return (
    <section aria-labelledby="aspecto-h" className={card}>
      <h2 id="aspecto-h">Aspecto</h2>
      <div className="mt-3">
        <Segmented label="Tema" value={theme ?? 'auto'} options={THEMES} onChange={(t) => void saveTheme(db, t)} />
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--acc)]"
          checked={haptics ?? true}
          disabled={!supported}
          onChange={(e) => void saveHaptics(db, e.target.checked)}
        />
        <span className="flex-1">Vibrar al marcar series</span>
      </label>
      {!supported && <p className="text-xs text-mut">Este dispositivo no permite vibración desde una app web (iPhone). En Android sí funciona.</p>}
    </section>
  )
}
