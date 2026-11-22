# TickTick Private

PWA personal de tareas y hábitos para iPhone. Sin backend, sin cuentas, costo cero. Los datos viven solo en IndexedDB del dispositivo; el respaldo JSON es la única copia externa.

## Stack (no cambiar sin pedirlo)

- Vite + React + TypeScript (strict, `noUncheckedIndexedAccess`).
- Dexie (`dexie`, `dexie-react-hooks`) sobre IndexedDB.
- `vite-plugin-pwa` (Workbox, `registerType: 'prompt'`) para offline y actualizaciones.
- CSS Modules + variables CSS. **Sin** librerías de UI, Tailwind ni gestor de estado.
- Vitest + `fake-indexeddb` para tests.
- Deploy: GitHub Pages con GitHub Actions (`.github/workflows/deploy.yml`).

## Comandos

```
npm run dev        # servidor local (http://localhost:5173)
npm test           # tests (vitest run)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ (para probar el service worker)
```

Antes de cada commit: `npm run typecheck && npm run lint && npm test`.

## Reglas duras

1. **Cero backend y cero servicios de pago.** Nada de APIs remotas, analítica, fuentes externas ni CDNs. Todo debe funcionar sin red después de la primera carga.
2. **Fechas de calendario = string local `'YYYY-MM-DD'`** (`ISODate`). Usar siempre `src/lib/dates.ts`. Nunca `toISOString()` para fechas de calendario (convierte a UTC y cambia el día). Las marcas de tiempo (`createdAt`, `completedAt`…) sí son `toISOString()`.
3. **Las semanas empiezan en lunes.** Días de la semana como `Date.getDay()` (0 = domingo … 6 = sábado); para mostrarlos usar `WEEK_ORDER`.
4. **Lógica en funciones puras con tests.** Rachas (`lib/habits.ts`), repetición (`lib/recurrence.ts`), orden (`lib/taskSort.ts`), vista Hoy (`lib/today.ts`) y respaldo (`lib/backup.ts`). Si cambias su comportamiento, actualiza o añade tests en el mismo commit. La UI no lleva tests.
5. **Escrituras solo en `src/db/repo.ts`** (y `lib/backup.ts` para importar). Los componentes solo leen con `useLiveQuery`. Operaciones que tocan varias filas van en `db.transaction`.
6. **Migraciones de Dexie:** nunca editar una `version(N)` ya publicada. Agregar `version(N+1).stores(...).upgrade(...)`, subir `SCHEMA_VERSION` en `src/db/db.ts` y extender `migrate()` en `lib/backup.ts`.
7. **Compatibilidad de respaldos:** cualquier respaldo de una versión anterior debe poder importarse. `parseBackup` valida todo lo que entra; un respaldo de versión futura se rechaza con un mensaje claro. Importar reemplaza todo en una sola transacción y guarda la copia previa para "Deshacer".
8. **La bandeja de entrada (`INBOX_ID = 'inbox'`) siempre existe** y no se puede borrar.
9. **UI en español**, mensajes de error legibles para el usuario (sin jerga técnica).

## Dominio

- **Tareas:** fecha opcional, hora opcional (solo con fecha), prioridad 0–3, notas y repetición `daily | weekly(days) | monthly(day)`. Sin fecha no hay hora ni repetición (`normalize` en repo). Al completar una tarea repetitiva se crea la siguiente ocurrencia (`nextOccurrence`: la primera posterior a `dueDate` que no quede en el pasado) y se guarda en `spawnedTaskId`; al desmarcarla se borra esa ocurrencia si sigue pendiente.
- **Hábitos:** `daily`, `weekdays(days)` o `weekly(times)`.
  - Diario / días: la racha cuenta días programados consecutivos cumplidos; los días no programados no suman ni rompen; hoy sin marcar no rompe.
  - X veces por semana: la racha cuenta semanas (lun–dom) cumplidas consecutivas; la semana en curso sin cumplir no rompe.
  - Un registro por hábito y día (índice único `[habitId+date]`).
- **Vista Hoy:** vencidas, de hoy, hábitos que tocan hoy (en semanal: mientras falte cumplir la semana, o si se marcó hoy) y completadas hoy.

## Diseño (mobile-first, estilo iOS)

- Usar solo los tokens de `src/styles/global.css` (`--bg`, `--bg-elevated`, `--label`, `--tint`, colores de sistema…). Nada de colores sueltos; modo oscuro automático vía `prefers-color-scheme`.
- Colores de listas y hábitos: nombres de `COLORS` (`types.ts`), renderizados como `var(--<color>)`.
- Componentes base: `Screen` (barra + large title), `Group`/`Row` (inset grouped), `Sheet` (modal inferior), `Segmented`, `WeekdayPicker`, `ColorPicker`, `Stepper`.
- Tap targets ≥ 44px, inputs ≥ 16px (evita el zoom de Safari), respetar `safe-area-inset-*`.
- Navegación por hash (`#/today`, `#/lists/<id>`, `#/habits/<id>`, `#/settings`) con `lib/router.ts`; no usar History API (GitHub Pages devolvería 404).

## Estructura

```
src/
  db/        types.ts, db.ts (esquema Dexie), repo.ts (escrituras)
  lib/       lógica pura + hooks (dates, recurrence, habits, taskSort, today, backup, router, useToday, useHabits, share)
  components/ UI reutilizable
  screens/   Hoy, Listas, Hábitos, Ajustes
  styles/    global.css (tokens)
```

## Deploy

- El workflow corre lint, tests y build con `BASE_PATH=/<nombre-del-repo>/` (Vite `base`). En local `BASE_PATH` no se define y la base es `/`.
- En GitHub: Settings → Pages → Source: **GitHub Actions**. Cada push a `main` publica en `https://<usuario>.github.io/<repo>/`.
- En el iPhone: abrir la URL en Safari → Compartir → **Añadir a pantalla de inicio**. Instalada, iOS conserva mejor los datos.
- Al construir en Windows con Git Bash, usa `MSYS_NO_PATHCONV=1` si defines `BASE_PATH`; si no, Git Bash lo convierte en una ruta de Windows.

## Fuera del MVP (no implementar sin pedirlo)

Subtareas, notificaciones push (requieren servidor), sincronización entre dispositivos, fusionar respaldos.
