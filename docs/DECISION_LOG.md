# DECISION LOG
## RN Layout Engine

---

# PURPOSE

Centralized registry of architectural and operational decisions for this repository.

Exists to:
- prevent architectural drift
- preserve historical reasoning
- help future AI agents understand why decisions were made
- avoid re-litigating resolved questions

---

# FORMAT

## DEC-XXXX

### Date
YYYY-MM-DD

### Area
Architecture / Infrastructure / Canvas / DevOps / Governance

### Decision
Short description.

### Reason
Why this decision was made.

### Impact
Technical and operational implications.

### Status
ACTIVE / REPLACED / DEPRECATED

---

# DECISIONS

---

## DEC-0028

### Date
2026-05-21

### Area
Canvas / Color Controls

### Decision
Operational color controls (fill color + opacity) are implemented as PropertiesPanel fields using preset swatches + native `<input type="color">`. No color toolbar, no floating color picker, no stroke/fill split for assets.

### Reason
The tool is an operational layout engine, not a design editor. Operators need to assign meaning to objects (green = confirmed, red = flagged) without complex tooling. Preset swatches cover 90% of use cases; the native color input handles edge cases. Keeping controls inside PropertiesPanel prevents toolbar overcrowding.

### Impact
- `LayoutElement.opacity?: number` and `DrawingPrimitive.opacity?: number` are optional fields
- Default values (0.65 for elements, 1.0 for drawings) are applied at render time via `?? fallback`
- Color changes via PropertiesPanel update React state immediately; Konva re-renders on next frame
- The 9 preset colors have no semantic enforcement — meaning is assigned by the operator

### Status
ACTIVE

---

## DEC-0027

### Date
2026-05-21

### Area
Canvas / Selection Model

### Decision
Drawing primitives (line, arrow, text) use a separate `selectedDrawingId` state, parallel to `selectedId` for elements. The two selections are mutually exclusive. Selecting an element clears drawing selection; selecting a drawing clears element selection.

### Reason
Drawing primitives are not `LayoutElement` objects — they don't have position/dimension fields, Transformer handles, or category data. Merging them into the same selection state would require either a discriminated union (complex) or casting (unsafe). A parallel state cleanly separates the two object types while maintaining simple mutation paths.

### Impact
- `useCanvasState` exposes `selectedDrawingId`, `selectDrawing`, `deleteDrawing`, `updateDrawing`, `selectedDrawing`
- `LayoutCanvas` receives all drawing selection props and routes keyboard delete to the correct handler
- `PropertiesPanel` shows `DrawingProperties` when a drawing is selected, `ElementProperties` when an element is selected
- Transformer is NOT attached to drawings (only to element Groups)
- Future: if drawings need resize handles, they should use a separate mini-transformer or handle points

### Status
ACTIVE

---

## DEC-0026

### Date
2026-05-21

### Area
Canvas / Export

### Decision
PNG export uses `pixelRatio: 2` (2x resolution) and fills the combined canvas background with `#020617` before compositing the stage image. Footer is rendered in CSS-pixel space via `ctx.scale(EXPORT_RATIO, EXPORT_RATIO)`.

### Reason
The Konva Stage renders at device-pixel-ratio 1 by default, producing blurry text and thin lines when printed or displayed at larger sizes. A 2x export ensures the plan remains readable at A3/A4 print dimensions. Filling the background explicitly handles the transparent areas of the Konva toDataURL output (areas with no shapes would otherwise be transparent/white).

### Impact
- Export file size increases ~4x (2x in each dimension)
- `EXPORT_RATIO` constant in LayoutCanvas — change it there to adjust quality
- `renderFooterToCanvas` receives CSS-pixel dimensions; caller is responsible for context scaling
- Export remains WYSIWYG: only the visible viewport area is captured

### Status
ACTIVE

---

## DEC-0025

### Date
2026-05-21

### Area
Canvas / Grid

### Decision
The 1-meter minor grid lines are permanently removed from the canvas. Only 5m and 10m grid lines remain, at very low opacity (`rgba(148, 163, 184, 0.07)` and `0.14` respectively). This applies to both the live canvas and the PNG export.

### Reason
The 1m minor grid added visual noise that made the exported plan look like a spreadsheet instead of an operational layout document. Operators need spatial reference (the 5m/10m grid) but not millimeter precision guidance. The cleaner grid significantly improves the exported plan's professional appearance.

### Impact
- Grid is drawn with a `Shape` sceneFunc component (`GridLines`) accessing the raw Canvas 2D context
- The `GridLines` component is non-interactive (`<Layer listening={false}>`)
- Background `<Rect fill="#020617">` fills the grid area so the dark canvas color appears correctly on export

### Status
ACTIVE

---

## DEC-0024

### Date
2026-05-21

### Area
Canvas / Drawing Tools

### Decision
Drawing primitives (line, arrow, text) are stored in a flat `drawings: DrawingPrimitive[]` array in `useCanvasState`. They are rendered as Konva nodes in the same Layer as elements. Text annotation is captured via `window.prompt()` (browser native dialog, no custom input UI).

### Reason
Storing drawings separately from elements keeps the selection model clean. Rendering them in the same Layer avoids z-ordering complexity. `window.prompt()` for text input is the minimum viable approach — avoids building an in-canvas text editor, a complex overlay, or a separate dialog component. Operationally acceptable for short annotation strings.

### Impact
- `DrawingPrimitive.points` uses world-pixel coordinates (same as element positions)
- `window.prompt()` blocks the browser main thread during text entry — acceptable for MVP
- Future: replace `window.prompt()` with an inline input overlay if text UX becomes a friction point

### Status
ACTIVE

---

## DEC-0023

### Date
2026-05-21

### Area
Canvas / Interaction

### Decision
Stage panning uses entirely manual implementation via `isPanning` ref + `onMouseMove` direct Konva node mutation (`stage.x/y/batchDraw()`). The Stage has NO `draggable` prop. Pan commits to React state on global `window mouseup`. This supersedes DEC-0022.

### Reason
The React-state `stageDraggable` approach (DEC-0022) failed because React state batching is asynchronous: Konva evaluates `draggable` at `mousedown` time, BEFORE React's state flush. When an element drag starts, toggling `stageDraggable = false` in state is too late — the Stage has already consumed the event. The synchronous `e.target === stage` check has no race condition because it evaluates the DOM object reference at call time, not after a React re-render.

### Impact
- `isPanning`, `panOrigin`, `isDraggingElement` are all `useRef` — zero React re-renders during pan gesture
- Stage has no `draggable` prop — Konva never controls the pan
- `handleStageMouseDown` is the exclusive gate: if `e.target !== stage`, pan does not start
- Global `window mouseup` ensures pan commits even if mouse is released outside the canvas

### Status
ACTIVE (supersedes DEC-0022)

---

## DEC-0022

### Date
2026-05-21

### Area
Canvas / Interaction

### Decision
Stage panning is disabled (`draggable={false}`) while any asset element drag is in progress. `stageDraggable` state in `LayoutCanvas` is toggled by `onDragStart` / `onDragEnd` events on `AssetShape`.

### Reason
Real manual testing revealed that Konva's Stage `draggable` and child node `draggable` can race: if the pointer starts on empty canvas near an element or moves off it mid-drag, the Stage drag also activates, causing accidental viewport panning during element manipulation.

### Impact
Initial attempt. Failed in real testing due to React state batching latency. Superseded by DEC-0023.

### Status
SUPERSEDED by DEC-0023

---

## DEC-0021

### Date
2026-05-21

### Area
Canvas / Asset Rendering

### Decision
Added `shape?: 'rect' | 'circle'` (`ElementShape`) to both `AssetTemplate` and `LayoutElement`. Round table assets are tagged `shape: 'circle'`. `AssetShape` renders Konva `Circle` when `shape === 'circle'`, `Rect` otherwise. No other shape variants yet.

### Reason
Round tables are circular in the real world. Rendering them as rectangles creates operational confusion when teams use the layout for event planning. A minimal `shape` property avoids building a full renderer abstraction while delivering correct visual semantics for the most common non-rectangular asset type.

### Impact
- `types/layout.ts` exports `ElementShape` type
- `AssetTemplate.shape` is optional — existing templates without `shape` default to `rect` behavior
- `LayoutElement.shape` is optional — existing saved elements without `shape` default to `rect`
- `addElement` propagates `template.shape` to the new element
- Future non-rectangular asset types (triangles, L-shapes, etc.) should extend `ElementShape`, not bypass it

### Status
ACTIVE

---

## DEC-0020

### Date
2026-05-20

### Area
Architecture / Canvas

### Decision
Konva (via react-konva) is the retained and confirmed browser-native canvas engine. It was not changed during the Next.js → Vite migration (SESSION-0009).

### Reason
Konva is the primary reason Next.js was incompatible (SSR blocks Konva's `window`/`document` requirements at module load time). Removing Next.js resolves the incompatibility without replacing Konva. Konva provides the full feature set required: Stage/Layer/Group hierarchy, Transformer handles, event system, zoom/pan, drag-and-drop, and hit detection.

Replacing Konva would introduce migration risk with zero benefit — the underlying canvas problem was Next.js SSR, not Konva.

### Impact
- `konva` and `react-konva` are runtime dependencies in `frontend/package.json`
- All canvas components in `src/components/canvas/` use Konva primitives
- `src/hooks/useCanvasState.ts` manages Konva-specific state (selected nodes, Stage ref, Layer ref)
- All future canvas features (element creation, property panels, export, multi-select) must use Konva APIs
- **Do NOT introduce** Fabric.js, PixiJS, Paper.js, Three.js, or native Canvas API without a new architectural decision
- Three.js is explicitly excluded: this project is 2D canvas only; 3D readiness is a backend data concern, not a rendering concern

### Status
ACTIVE

---

## DEC-0019

### Date
2026-05-20

### Area
Infrastructure / DevOps

### Decision
RN Layout Engine frontend migrated from Next.js 15 (App Router) to Vite 6 + React 19. Migration is infrastructure-only — zero canvas logic changes.

### Reason
Next.js App Router introduced two blockers:

1. **SSR incompatibility with Konva.** Konva requires `window` and `document` at import time. Next.js server-renders by default. Every canvas component required `next/dynamic` with `ssr: false`. This workaround grows brittle as the component tree expands — every new canvas component needs the wrapper, and any import path that reaches Konva without it crashes the server render.

2. **Wrong tool for the use case.** The Layout Engine is a single-page canvas tool with no routing, no server components, no data fetching, and no SEO. Next.js App Router is designed for document-centric apps with server rendering. The overhead (`layout.tsx`, `page.tsx`, `'use client'` on every component, Next.js-specific build pipeline) provided nothing of operational value.

Vite is the industry default for browser-native React canvas/visualization tools. It is zero-SSR, instant HMR, and supports Tailwind v4 natively via `@tailwindcss/vite` (eliminates the PostCSS layer).

### Impact
- `npm run dev` → Vite dev server (was: Next.js dev server)
- `npm run build` → static SPA in `frontend/dist/` (was: Next.js `.next/` build)
- Hosting: must serve a static SPA — Vercel (recommended), Render Static Site, or any CDN (RISK-0014)
- `next/dynamic` workaround removed — canvas components use direct ES imports
- `src/app/` (App Router) deleted; replaced by `src/main.tsx` + `src/App.tsx`
- Tailwind v4 via `@tailwindcss/vite` plugin — no `postcss.config.mjs` required
- `@/` path alias defined in `vite.config.ts` + `tsconfig.json`
- Zero impact on EventOS backend (`RealityNearProject`) — separate repo and deployment

### Rollback
```bash
git reset --hard a89787a  # pre-migration checkpoint on feat/vite-migration
```

### Status
ACTIVE — `feat/vite-migration` locally validated; merge to `main` pending production deploy
