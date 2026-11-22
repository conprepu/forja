# Forja: plan de construcción con Claude Code

PWA personal de **entreno tipo Hevy Premium** + **tracking de calorías, proteína y comidas**. Local-first, gratis, instalable en iPhone desde Safari.

Punto de partida: `index.html` (prototipo de un solo archivo, ~83 KB). Ya trae diseño, rutinas, sets, timer de descanso, calculadora de discos, PRs, comida rápida, alimentos propios, metas (Mifflin-St Jeor) y peso corporal, todo guardado en `localStorage`. **No se tira**: es la referencia visual y funcional. Se migra a un proyecto con estructura.

---

## 1. Alcance (qué debe hacer)

### Entreno (paridad con Hevy Pro)
- Rutinas ilimitadas, carpetas, duplicar y reordenar
- Entreno en vivo: sets normal / calentamiento / drop / al fallo, peso × reps, RPE, notas por ejercicio
- Supersets y circuitos
- "Anterior": muestra lo que hiciste la última vez en cada set
- Timer de descanso por ejercicio, con vibración y sonido
- Calculadora de discos y de calentamiento
- Biblioteca de ejercicios (~200 con grupo muscular y equipo) + ejercicios propios
- PRs automáticos: peso máximo, 1RM estimado (Epley), mejor volumen y mejor set
- Gráficas por ejercicio: 1RM estimado, peso máximo, volumen y reps a lo largo del tiempo
- Historial y calendario, resumen semanal y mensual, mapa de músculos trabajados
- Medidas corporales (peso, % grasa, cintura, etc.) con gráfica

### Nutrición
- Diario por día: desayuno, comida, cena y snacks
- Metas de kcal y macros (TDEE + objetivo), editables a mano
- Anillo de calorías y barras de P/C/G en vivo
- Búsqueda de alimentos en **Open Food Facts** (gratis, sin API key) + base local de alimentos mexicanos comunes
- **Escáner de código de barras** con la cámara
- Alimentos propios, recetas (suma de ingredientes ÷ porciones) y comidas guardadas ("mi desayuno de siempre")
- Quick add (solo kcal/macros), copiar el día de ayer
- Agua
- Tendencias: promedio semanal de kcal y proteína vs. meta, peso vs. calorías

### Cruce entreno ↔ comida
- Pantalla "Hoy": entreno del día + anillo de calorías + proteína restante
- Opcional: ajustar la meta de kcal en días de entreno

### Fuera de alcance (v1)
Social/feed, cuentas, backend propio, integración con Apple Health (una PWA no puede).

---

## 2. Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Build | **Vite + React + TypeScript** | Rápido, Claude Code lo maneja muy bien |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest, service worker y offline sin configurar a mano |
| Datos | **Dexie** (IndexedDB) + `dexie-react-hooks` | Mucho más espacio que `localStorage`, consultas, versiones de esquema |
| Estado UI | **Zustand** | Solo para el entreno en vivo y los timers |
| Estilos | **Tailwind** con los tokens CSS del prototipo | Se conserva el look de Forja |
| Gráficas | **Recharts** | Simple y suficiente |
| Rutas | **React Router** | Tabs: Hoy, Entreno, Comida, Progreso, Perfil |
| Barcode | **@zxing/browser** (o `zxing-wasm`) | `BarcodeDetector` no existe en Safari iOS |
| Fechas | **date-fns** | Ligero |
| Tests | **Vitest** + **Playwright** | Lógica (1RM, macros, TDEE) y flujos clave |
| Deploy | **Cloudflare Pages** o **Vercel** (gratis) | HTTPS obligatorio para PWA y cámara |

Sync entre dispositivos (opcional, fase 7): Supabase gratis, o solo export/import JSON.

---

## 3. Modelo de datos (Dexie)

```ts
exercises    { id, name, muscle, secondary[], equipment, type: 'weight_reps'|'reps'|'time'|'distance', custom }
routines     { id, name, folderId?, order, items: [{ exerciseId, sets: [{ type, targetReps?, targetWeight? }], restSec, supersetId?, note? }] }
workouts     { id, routineId?, name, startedAt, endedAt, note, items: [{ exerciseId, supersetId?, sets: [{ type, weight, reps, rpe?, done }] }] }
prs          { id, exerciseId, kind: 'weight'|'e1rm'|'volume'|'reps', value, workoutId, date }
body         { id, date, weight?, bodyFat?, waist?, chest?, arm?, thigh? }
foods        { id, name, brand?, barcode?, per100: { kcal, p, c, f, fiber? }, servings: [{ label, grams }], source: 'off'|'custom'|'local' }
recipes      { id, name, servings, ingredients: [{ foodId, grams }] }
meals        { id, name, entries: [{ foodId, grams }] }           // comidas guardadas
diary        { id, date, slot: 'desayuno'|'comida'|'cena'|'snack', foodId?, recipeId?, grams?, quick?: { kcal, p, c, f }, name }
water        { date, ml }
settings     { key, value }   // perfil, metas, unidades, tema
```
Índices: `workouts.startedAt`, `diary.date`, `foods.barcode`, `foods.name`, `prs.exerciseId`.

---

## 4. Fases (cada fase = una sesión de Claude Code)

> Regla: al terminar cada fase, `npm run build` y `npm test` pasan, haces commit y pruebas en el iPhone.

### Fase 0: Scaffold y PWA instalable
Vite + React + TS, Tailwind con los tokens de `index.html`, vite-plugin-pwa, íconos, tab bar inferior con safe areas. Mover `index.html` a `legacy/prototype.html`.
**Listo cuando:** se instala desde Safari y abre offline.

### Fase 1: Capa de datos
Esquema Dexie, seed de ~200 ejercicios en `src/data/exercises.json`, `navigator.storage.persist()`, export/import JSON, **migración desde el `localStorage` del prototipo**.
**Listo cuando:** exportas, borras e importas sin perder nada.

### Fase 2: Rutinas y entreno en vivo
CRUD de rutinas, entreno en vivo, tipos de set, "anterior", supersets, timer de descanso, calculadora de discos, terminar entreno con resumen y PRs nuevos.
**Listo cuando:** registras un entreno completo en el gym sin fricción.

### Fase 3: Progreso de entreno
Detección de PRs, gráficas por ejercicio, historial y calendario, resumen semanal y mensual, mapa muscular, medidas corporales.

### Fase 4: Nutrición base
Perfil y metas (TDEE), diario por comida, anillo de calorías y macros, alimentos propios, quick add, copiar día, agua.

### Fase 5: Base de alimentos y escáner
Cliente de Open Food Facts (búsqueda + barcode) con caché en `foods`, base local mexicana (tortilla, frijoles, huevo, pollo, arroz, etc.), escáner con cámara, recetas y comidas guardadas.

### Fase 6: Pantalla Hoy y pulido
Hoy combinado, tendencias de nutrición, tema claro/oscuro, haptics, estados vacíos, accesibilidad, Lighthouse PWA ≥ 90.

### Fase 7 (opcional): Sync y backups
Backup automático a archivo, o Supabase con auth por magic link.

---

## 5. Prompts para Claude Code

Abre la carpeta y empieza con:

```
Lee CLAUDE.md y PLAN.md. Vamos a hacer la Fase 0. Primero dame tu plan de archivos y espera mi OK antes de escribir código.
```

Luego, fase por fase:

```
Fase 1 del PLAN.md. Incluye la migración desde localStorage del prototipo en legacy/prototype.html (revisa la estructura de S para mapear los campos). Escribe tests de Vitest para export/import.
```
```
Fase 2. El flujo de entreno en vivo es lo más importante de la app: copia la UX del prototipo (vActive, exCard, startRest, sheetPlates) y mejórala. El estado del entreno activo debe sobrevivir a cerrar la app.
```
```
Fase 3. Calcula el 1RM con Epley, ignora sets de calentamiento y escribe tests para la detección de PRs.
```
```
Fase 4. Reutiliza calcGoals del prototipo (Mifflin-St Jeor). Todos los cálculos de macros van en src/lib/nutrition.ts con tests.
```
```
Fase 5. Open Food Facts: usa https://world.openfoodfacts.org/api/v2/product/{barcode}.json y el endpoint de búsqueda, con user-agent "Forja/1.0" y caché en Dexie. Escáner con @zxing/browser y cámara trasera.
```
```
Fase 6. Corre Lighthouse y arregla todo lo de PWA y accesibilidad.
```

Trucos útiles:
- Usa **modo plan** (Shift+Tab) antes de cada fase grande.
- Pide `/review` o "revisa el diff contra el PLAN" al cerrar cada fase.
- Si algo se rompe en el iPhone, pásale una captura y el error de la consola de Safari (Mac → Safari → Desarrollar → tu iPhone).

---

## 6. Limitaciones de iOS que hay que tener en cuenta

- **Timer de descanso en segundo plano:** iOS congela la PWA. Guarda la hora de fin (`endsAt`) y recalcula al volver. Para avisar con la app cerrada, programa una notificación push (iOS 16.4+, solo con la app instalada). Mínimo viable: vibración y sonido con la app abierta.
- **Almacenamiento:** Safari puede borrar datos de sitios sin uso. Instalar en la pantalla de inicio + `storage.persist()` + export periódico.
- **Cámara:** solo con HTTPS. En el iPhone abre la URL desplegada, no `localhost`.
- **Sin Apple Health:** el peso y los pasos se meten a mano.

---

## 7. Estructura de carpetas

```
forja/
├─ CLAUDE.md
├─ PLAN.md
├─ legacy/prototype.html
├─ public/icons/
├─ src/
│  ├─ app/            # rutas, layout, tab bar
│  ├─ db/             # dexie schema, migraciones, seed, backup
│  ├─ data/           # exercises.json, foods-mx.json
│  ├─ features/
│  │  ├─ workout/     # rutinas, entreno en vivo, timer, discos
│  │  ├─ progress/    # PRs, gráficas, calendario, medidas
│  │  ├─ nutrition/   # diario, metas, búsqueda, escáner, recetas
│  │  └─ today/
│  ├─ lib/            # 1rm.ts, nutrition.ts, units.ts, dates.ts
│  └─ ui/             # botones, sheets, ring, inputs numéricos
└─ tests/
```
