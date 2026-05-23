# AVANCE DE SESIÓN — SESSION-0013
**Fecha:** 2026-05-23
**Rama:** `feat/vite-migration`
**Objetivo:** Mobile Stability & Responsive Pass — corregir pantalla en blanco en iPhone Safari

---

## PROBLEMA ORIGINAL

El Layout Engine se mostraba en **pantalla negra/en blanco** en iPhone Safari después del despliegue en Vercel. En desktop funcionaba correctamente.

---

## DIAGNÓSTICO — CAUSAS RAÍZ IDENTIFICADAS

### CAUSA PRIMARIA — Paneles más anchos que la pantalla del iPhone

Los paneles laterales ocupan en total:
- `AssetLibraryPanel`: `w-56` = **224px**
- `PropertiesPanel`: `w-60` = **240px**
- **Total: 464px**

La pantalla de un iPhone 14 tiene **~390px de ancho**. Los paneles solos ya superan el viewport. El canvas (`flex-1`) recibía ancho 0 o negativo. Con `overflow-hidden` en el contenedor padre, todo quedaba clippeado → **pantalla en negro**.

### CAUSA SECUNDARIA — `#root` sin altura definida

La cadena de altura CSS:
- `html` → `height: 100%` ✅
- `body` → `height: 100%` ✅
- `#root` → **sin altura** ❌
- `App div` → `height: 100vh`

Sin `#root { height: 100% }`, la cadena flex que necesita el canvas para calcular `h-full` se rompe en iOS Safari, produciendo potencialmente una altura de 0 en el contenedor del canvas.

### CAUSA TERCIARIA — Sin handlers de eventos touch

El Stage de Konva solo tenía `onMouseDown`, `onMouseMove`, `onClick`. En iOS Safari, los eventos touch no disparan mouse events confiablemente en elementos canvas. Sin `onTouchStart`/`onTouchMove`, **pan y zoom no funcionaban en dispositivos táctiles**.

---

## SOLUCIÓN IMPLEMENTADA

### Archivos modificados

#### `index.html`
- Agregado `viewport-fit=cover` al meta de viewport → soporte de notch iPhone

#### `src/index.css`
- `#root { height: 100%; }` → completa la cadena de altura HTML → body → root → App
- `canvas { touch-action: none; }` → entrega todos los gestos táctiles a Konva, previene conflicto con scroll/pinch nativo del navegador

#### `src/App.tsx`
- `h-screen` → `h-full` → usa la cadena de altura del padre (más confiable en iOS que `100vh`)
- Hints del footer: `hidden sm:flex` → ocultos en móvil (no tienen espacio)

#### `src/components/DrawingToolbar.tsx`
- Nuevos props: `onToggleLibrary`, `onToggleProperties`, `libraryOpen`, `propertiesOpen`
- Botones de toggle para móvil (`☰` Assets, `⊟` Props), ocultos en desktop (`md:hidden`)
- Texto verbose oculto en pantallas pequeñas (`hidden sm:block`, `hidden md:block`)
- Etiqueta de exportar: "Exportar Plano" en sm+, "Export" en móvil

#### `src/components/LayoutEditor.tsx`
- Estado `mobilePanel: 'library' | 'properties' | null`
- Paneles: en desktop (md+) siempre visibles en flujo normal; en móvil, ocultos por defecto y se muestran como overlay absoluto al togglear
- Backdrop `div` (`z-10 md:hidden bg-black/40`) para cerrar overlay tocando afuera
- `min-w-0` en el `<main>` del canvas — previene overflow flex que consumía todo el ancho

#### `src/components/FooterLegend.tsx`
- Wrapper `overflow-x-auto` + `min-w-[480px]` en el grid interior → el footer hace scroll horizontal en viewports estrechos en lugar de colapsar

#### `src/components/canvas/LayoutCanvas.tsx`
- `Math.max(1, containerSize.width/height)` en Stage → previene Konva Stage con tamaño 0
- `lastTouchDist` ref para tracking de pinch-zoom
- `handleTouchStart`: dedo único → inicia pan; dos dedos → inicia pinch
- `handleTouchMove`: dedo único → actualiza pan; dos dedos → pinch-zoom centrado en el punto medio
- Global `useEffect`: escucha `mouseup` Y `touchend`; touchend también hace commit del scale
- Stage: props `onTouchStart` y `onTouchMove` agregados

---

## RESULTADO

### TypeScript
**0 errores** después de todos los cambios (`npx tsc --noEmit` limpio).

### Comportamiento en Desktop
Idéntico al SESSION-0012 — paneles siempre visibles, sin cambio en UX de escritorio.

### Comportamiento en Móvil (esperado — pendiente validación en dispositivo real)
- Canvas ocupa el ancho completo de la pantalla → **no más pantalla en blanco**
- Botón `☰` en toolbar abre panel de Assets como overlay
- Botón `⊟` en toolbar abre panel de Properties como overlay
- Touch pan (un dedo): funcional en Stage
- Pinch-zoom (dos dedos): funcional en Stage
- Tap en assets: selección via `onTap` (ya existía en SESSION-0012)
- Footer: hace scroll horizontal si el viewport es muy estrecho

---

## LIMITACIONES CONOCIDAS EN MÓVIL (documentadas en KNOWN_RISKS.md)

| Riesgo | Descripción | Impacto |
|---|---|---|
| RISK-0017 | Drawing tools (line/arrow/text) no soportados vía touch | Bajo — mobile es principalmente review, no creación |
| RISK-0018 | `window.prompt()` para texto no funciona en iOS Safari | Bajo — workaround a futuro con input inline |
| RISK-0016 | Export captura solo viewport visible | Bajo — operador debe asegurar layout visible antes de exportar |

---

## VALIDACIÓN REQUERIDA

- [ ] iPhone Safari — pantalla completa, canvas visible, touch pan/zoom
- [ ] Chrome mobile — renderizado correcto
- [ ] iPad — layout con paneles en md+ visible correctamente
- [ ] Desktop — regresión: paneles, export, interacciones SESSION-0012
- [ ] Vercel deploy smoke test

---

## PRÓXIMAS PRIORIDADES (SESSION-0014)

1. **Layout persistence** — `localStorage` save/load (RISK-0015 — pedido en office testing)
2. **Fit-all zoom** — botón que centra y ajusta todo el layout visible antes de exportar (mitiga RISK-0016)
3. **Merge `feat/vite-migration` → `main`** — después de pasar validación móvil en Vercel
