# AVANCE DE SESIÓN — SESSION-0014
**Proyecto:** RN Layout Engine
**Fecha:** 2026-05-23
**Rama:** `feat/vite-migration`
**Operador:** JBD & Claude
**Estado:** COMPLETADO — confirmado en iPhone Safari

---

## Objetivo de la Sesión

Investigación de causa raíz del pantallazco negro en iPhone Safari. La sesión SESSION-0013 entregó correcciones válidas (desbordamiento de paneles, cadena de altura, touch handlers), pero el problema persistió en el dispositivo real. Prioridad: no adivinar — encontrar la causa exacta.

---

## Causa Raíz Identificada

### PRIMARIA — Agotamiento de memoria de canvas en iOS Safari

`containerSize` se inicializaba con `{ width: 800, height: 600 }`. En iPhone 12+ (`devicePixelRatio = 3`), Konva crea los canvas backing stores a:

```
2400 × 1800 px × 4 bytes = 16,588,800 bytes ≈ 16.5 MB por capa
```

Konva utiliza **dos capas por defecto** (scene layer + hit layer):

```
16.5 MB × 2 = ~33 MB de memoria de canvas al cargar la página
```

iOS Safari impone un límite estricto de **~16 MB por página** para memoria de canvas. Al superar este límite, Safari elimina silenciosamente el contenido de los canvas — sin excepción JavaScript, sin error en consola, sin cambio visible en el DOM. El Stage existe pero es completamente invisible. Solo se veía el fondo oscuro del body (`bg-slate-950`).

### SECUNDARIA — Protección de deployments en Vercel

Todos los nuevos deployments de Vercel tenían activada la protección SSO, devolviendo HTTP 401 en iPhone. El alias público antiguo (`frontend-eta-five-50.vercel.app`) seguía sirviendo el build cacheado previo a la corrección. Resuelto desactivando Deployment Protection en la configuración del proyecto Vercel.

---

## Método de Diagnóstico

Se añadieron dos marcadores visuales de diagnóstico a nivel de DOM (sin depender de React ni de CSS):

1. **Barra verde** (inyectada en `main.tsx` antes de que React monte): DOM puro, confirma que JavaScript se ejecuta en Safari
2. **Barra azul/naranja** (componente `DebugOverlay` en `App.tsx`): se renderiza tras el primer paint de React, muestra dimensiones de `#root` y `App`

En iPhone Safari, ambas barras aparecieron correctamente. React montaba y el layout tenía dimensiones correctas (390×710 px). La causa raíz se acotó al rendering del canvas — memoria.

---

## Cambios Entregados

### `frontend/src/components/canvas/LayoutCanvas.tsx`
- `containerSize` cambia de `{ width: 800, height: 600 }` a `null` — el Stage no se renderiza hasta que ResizeObserver entrega las dimensiones reales del dispositivo
- `{containerSize !== null && <Stage ...>}` — renderizado condicional
- `pixelRatio={Math.min(window.devicePixelRatio, 2)}` — limita el DPR de Konva a 2, reduciendo la memoria de canvas a ≤ ~12.5 MB totales en DPR=3
- Guard en `exportPNG`: `if (!containerSize) return` — no-op seguro antes de que el Stage esté listo
- Eliminado `'use client'` (directiva Next.js, no-op en Vite)

### `frontend/src/hooks/useCanvasState.ts`
- Eliminado `'use client'` (directiva Next.js, no-op en Vite)

### `frontend/vite.config.ts`
- Añadido `build.target: ['es2020', 'safari15']` — garantiza transpilación de sintaxis moderna para Safari 15+

### `frontend/src/main.tsx` / `frontend/src/App.tsx`
- Añadidos overlays de diagnóstico DEBUG-0014 (fase de diagnóstico)
- Eliminados en el deploy limpio final tras confirmación en iPhone

---

## Validación

| Comportamiento | Estado |
|---|---|
| iPhone Safari — canvas renderiza con assets visibles | ✅ confirmado en dispositivo |
| iPhone Safari — barras de diagnóstico aparecieron correctamente | ✅ confirmado en dispositivo |
| URL de producción Vercel accesible sin autenticación | ✅ |
| Overlays de diagnóstico eliminados del build de producción | ✅ |
| Layout desktop sin regresiones visuales | ✅ |
| Export PNG funciona (guard containerSize null añadido) | ✅ |
| TypeScript 0 errores | ✅ |
| Mobile panel toggles de SESSION-0013 preservados | ✅ |
| Interacciones de SESSION-0012 preservadas | ✅ |

---

## URL de Producción

**Alias público:** https://frontend-eta-five-50.vercel.app
**Deployment actual:** https://frontend-6o0rrn6xc-javier-bambaren-d-s-projects.vercel.app

---

## Riesgos Actualizados

| Riesgo | Estado |
|---|---|
| RISK-0019 — Agotamiento de memoria canvas iOS Safari | RESUELTO (SESSION-0014) |
| RISK-0014 — Sin target de deployment | RESUELTO (SESSION-0013) |
| RISK-0015 — Sin persistencia de layout | ABIERTO |
| RISK-0016 — Export solo captura viewport visible | ABIERTO |
| RISK-0017 — Herramientas de dibujo no funcionan en touch | ABIERTO |
| RISK-0018 — `window.prompt()` bloqueado en iOS Safari | ABIERTO |

---

## Commits de la Sesión

| Hash | Descripción |
|---|---|
| `718fcfe` | fix: canvas memory exhaustion + diagnostic overlay (SESSION-0014) |
| `b88d210` | chore: remove SESSION-0014 debug overlays — iPhone fix confirmed |

---

## Pendientes

1. **Merge `feat/vite-migration` → `main`** — no quedan bloqueantes técnicos
2. **Conectar repositorio GitHub → Vercel** para auto-deploy en push a `main`
3. **Testing de oficina** — validar planes exportados, estabilidad de interacciones con equipo real
4. **Candidatos siguiente sesión:** Grid snapping, save/load en localStorage, soporte de dibujo táctil (RISK-0017)
