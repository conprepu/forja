# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Una sola persona (el dueño), en su iPhone, dentro del gimnasio y en la cocina o el súper. Usa la app con una mano, con prisa entre series, a veces con manos sudadas, con luz de gimnasio (mixta, a veces muy brillante) y de noche. UI en español de México.

## Product Purpose
Forja registra entrenos (rutinas, series, PRs, descansos) y comida (calorías, macros P/C/G, agua, recetas, código de barras) en un solo lugar, local-first, sin cuentas ni servidor. Éxito: registrar una serie o una comida en pocos toques y ver el progreso sin fricción.

## Positioning
Estilo Hevy Premium + tracking de macros en una PWA instalable, funciona sin conexión y todos los datos viven en el teléfono (IndexedDB).

## Capabilities and Constraints
- Stack fijo: Vite + React + TypeScript, Tailwind v4, Dexie, Zustand, Recharts, React Router, vite-plugin-pwa. Sin dependencias nuevas sin preguntar.
- Targets táctiles de 44 px o más, safe areas de iOS, teclado numérico en peso/reps/gramos.
- Unidades: kg, g, ml, kcal. Colores semánticos de macros: P rojo, C ámbar, G morado.
- Tema automático / claro / oscuro ya existe en Perfil › Aspecto.
- Escáner de código de barras con cámara trasera (@zxing) más entrada manual.

## Brand Commitments
El usuario pidió (2026-11-22) rediseñar toda la interfaz con la estética de la UI de Cyberpunk 2077 (HUD). Sustituye la dirección anterior (cobalto, Archivo/Inter) de `legacy/prototype.html`. La accesibilidad y los targets de 44 px se mantienen.

## Evidence on Hand
Datos reales solo del propio usuario en su dispositivo. No hay testimonios ni métricas externas.

## Product Principles
1. Una serie o comida registrada en el menor número de toques.
2. Lo importante (peso, reps, kcal, proteína faltante) se lee de un vistazo, también con una mano y en movimiento.
3. Local-first: nunca depender de la red para registrar.
4. El estilo nunca baja la legibilidad ni la accesibilidad.

## Accessibility & Inclusion
Contraste de texto ≥ 4.5:1 en ambos temas, foco visible, respetar `prefers-reduced-motion`, no depender solo del color.
