# Forja: instrucciones para Claude Code

App personal (PWA) de entreno estilo Hevy Premium + tracking de calorías y macros. Un solo usuario, local-first, sin backend. El plan completo está en `PLAN.md`; trabaja una fase a la vez.

## Reglas
- Idioma de la UI: **español (México)**. Unidades: kg, g, ml, kcal.
- Stack fijo: Vite + React + TypeScript (strict), Tailwind, Dexie, Zustand, Recharts, React Router, vite-plugin-pwa. No agregues dependencias sin preguntar.
- Todos los datos van en IndexedDB vía Dexie (`src/db`). Nada de `localStorage`, salvo la migración del prototipo.
- Cambios de esquema = nueva `db.version(n)` con su migración. Nunca rompas los datos existentes.
- La lógica pura (1RM, PRs, macros, TDEE, recetas) va en `src/lib` con tests de Vitest.
- Mobile-first para iPhone: targets de 44 px o más, `env(safe-area-inset-*)`, teclado numérico (`inputmode="decimal"`) en peso, reps y gramos.
- El entreno activo debe sobrevivir a recargar o cerrar la app (persistido en Dexie).
- Los timers se basan en timestamps (`endsAt`), nunca en contar ticks.
- Diseño: estilo HUD de Cyberpunk 2077 (decisión del usuario, 2026-11-22; sustituye a los tokens de `legacy/prototype.html`). Tokens en `src/styles/index.css`: amarillo neón `--acc` (relleno) y `--accfg` (texto), cian `--cy`, Rajdhani para títulos y números, Share Tech Mono solo para datos, Inter para texto. Clases `hud`, `cut-sm`, `ui-btn`. Colores de macros: P rojo, C ámbar, G morado. Contexto del producto en `PRODUCT.md`.

## Comandos
- `npm run dev`: servidor local
- `npm run build && npm run preview`: probar la PWA y offline
- `npm test`: Vitest
- `npx playwright test`: e2e

## Al terminar cada tarea
1. `npm run build` y `npm test` sin errores
2. Resume qué cambió y qué falta de la fase
3. Propón el mensaje de commit
