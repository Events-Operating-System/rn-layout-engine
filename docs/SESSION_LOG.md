# SESSION LOG
## RN Layout Engine

---

# PURPOSE

Operational record of major development sessions for this repository.
Each entry records scope, what was delivered, what was validated, and what remains open.

---

# FORMAT

## SESSION-XXXX
**Date:** YYYY-MM-DD
**Branch:** branch-name
**Operator:** name
**Status:** COMPLETED / IN_PROGRESS / BLOCKED / LOCALLY_VALIDATED

### Scope
What was attempted.

### Delivered
What was built or changed.

### Validated
What was confirmed working.

### Open
What remains pending after session.

---

# SESSIONS

---

## SESSION-0016
**Date:** 2026-05-24
**Branch:** `main`
**Operator:** JBD & Claude
**Status:** COMMITTED — pending human push to main + browser validation (includes SESSION-0015)

### Scope
Operational UX Pass v2. Eight fixes targeting quality, correctness, and completeness before first real-world use. No backend, no SSR. All changes additive. Constraint: DO NOT push until all items locally validated together.

### Delivered

**1. Text annotation drag bug fix**
- `DrawingShape.handleDragEnd` now branches on `drawing.tool === 'text'`
- Text uses `[e.target.x(), e.target.y()]` directly (absolute position)
- Line/Arrow use the offset pattern (relative position, unchanged)
- Fixes teleport-on-drag behavior in SESSION-0015

**2. Undo / Redo**
- `useCanvasState.ts`: `pushHistory()`, `undo()`, `redo()` + `canUndo`/`canRedo` reactive booleans
- 50-step history cap; `historyRef` + `elementsRef`/`drawingsRef` for stable snapshots
- Covered: element add, delete, duplicate, drawing add, delete, drag end, transform end
- Toolbar: ↩/↪ buttons (disabled state when stack empty)
- Keyboard: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` redo

**3. Complete EN/ES i18n**
- `LangContext.tsx`: `ASSET_NAME_ES` map (all 40 assets translated) + `getAssetName(lang, name)` helper
- `AssetLibraryPanel.tsx`: uses `getAssetName(lang, asset.name)` for display
- All asset names translate in real-time when language is toggled

**4. Footer branding**
- `FooterLegend.tsx` left block: "EventOS Layout / powered by / {company}"
- `renderFooterToCanvas` in `LayoutCanvas.tsx`: same branding applied to PNG export
- Replaces "Reality Near / Layout Engine" pattern from SESSION-0015

**5. Email clipping fix (final)**
- New `fillTextAdaptive()` in `LayoutCanvas.tsx`: tries 10→9→8→7px before giving up
- All metadata value fields in PNG export use adaptive sizing — no hard truncation
- `fillTextTruncated()` retained for company name (left block) where truncation is acceptable

**6. Smart alignment guides**
- `computeAlignmentGuides()` function: checks center-to-center + 4 edge-to-edge combinations
- 8px screen-pixel threshold (adjusts for zoom scale)
- `alignGuides: { xs, ys }` state replaces old single `dragGuide`
- Multiple cyan guide lines render simultaneously (Figma-style visual feedback)
- No snapping — visual indicator only, per spec

**7. Tree asset visual**
- Replaced `Star` shape with two concentric circles (canopy + inner highlight ring)
- Inner ring: `rgba(255,255,255,0.18)` overlay at 42% radius — professional top-view landscape look
- `Star` removed from react-konva imports entirely

**8. Visual professionalism pass**
- Undo/Redo buttons integrated cleanly into toolbar with disabled state styling
- Light spacing and icon improvements throughout

### TypeScript
Zero errors on `npx tsc --noEmit`. Production build: clean (553 KB).

### iPhone fix code
`containerSize=null` initialization and `pixelRatio=Math.min(DPR,2)` cap — both untouched.

### Commit
`42c0a25` — "feat: Operational UX Pass v2 — undo/redo, i18n, alignment guides, tree visual, footer branding"

### Open
- Human: run `git push origin main` to trigger auto-deploy (includes both SESSION-0015 and SESSION-0016)
- Human: verify on desktop + iPhone Safari before using in production
- RISK-0015 (layout persistence) — still open, next priority after office testing

---

## SESSION-0015
**Date:** 2026-05-24
**Branch:** `main`
**Operator:** JBD & Claude
**Status:** COMMITTED — pending human push to main + browser validation

### Scope
Operational UX Pass v1. Seven features targeting faster layout creation, reduced repetitive actions, better alignment, and improved perceived professionalism. No backend, no SSR, no persistence system. All changes are additive.

### Delivered

**1. Language selector (EN/ES)**
- New `src/context/LangContext.tsx` — React context with full string catalog for English and Spanish
- Language toggle button in `App.tsx` header (shows current opposite lang as the switch target)
- Persisted to `localStorage('rn-lang')` — survives page reload
- Translated: toolbar, library panel, properties panel, category labels, footer hints, legend

**2. Export footer truncation fix**
- Added `fillTextTruncated()` helper in `LayoutCanvas.tsx`
- Long values (email, contact info) now truncate with `…` at the column width boundary
- Company name in left block also truncated if too long
- Fixes PNG export clipping for real operational data

**3. Asset duplication**
- `duplicateElement(id)` added to `useCanvasState.ts` — copies element at +2m offset, auto-selects copy
- "Duplicate" button in `PropertiesPanel.tsx` `ElementProperties` section
- Keyboard shortcut: `Ctrl+D` / `Cmd+D` (handled in `LayoutEditor.tsx`)

**4. Element delete button**
- "Delete Element" button added to `ElementProperties` in `PropertiesPanel.tsx`
- Visible on mobile (in the open Properties panel overlay)
- Matches existing "Delete Drawing" button pattern

**5. Alignment guides**
- Canvas center crosshair at 60m×60m — permanent faint dashed lines (slate 10% opacity)
- During element drag: cyan dashed crosshair tracks element center in real-time
- New guides `Layer` between grid and assets layer in `LayoutCanvas.tsx`
- Cleared automatically on drag end

**6. Draggable drawing annotations**
- All drawing types (line, arrow, text) are now draggable in pointer mode
- Standard Konva offset pattern: drag applies offset to points array, then resets shape position to 0
- `onMoveDrawing` prop added to `DrawingShape`

**7. Primitive shapes category**
- New `'primitive'` asset category (slate #64748b)
- 6 new templates: Rectangle, Circle, Oval, Rounded Box, Tree, Square
- New `ElementShape` values: `'oval'`, `'rounded-rect'`, `'tree'`
- `AssetShape` renders: `Ellipse` for oval, `Rect` w/ high cornerRadius for rounded-rect, `Star` for tree
- Tree defaults to green (`#16a34a`)
- `defaultColor` field added to `AssetTemplate` interface

**Also:**
- Keyboard tool shortcuts (S/L/A/T) now active (handled in `LayoutEditor.tsx`)
- `react-konva` imports expanded: `Ellipse`, `Star`

### TypeScript
Zero errors on `npx tsc --noEmit`. Production build: clean.

### iPhone fix code
`containerSize=null` initialization and `pixelRatio=Math.min(DPR,2)` cap — both untouched.

### Open
- Human: run `git push origin main` to trigger auto-deploy
- Human: verify on desktop + iPhone Safari before using in production
- RISK-0015 (layout persistence) — still open, next priority
- RISK-0016, RISK-0017, RISK-0018 — still open

---

## AUDIT-2026-05-23
**Date:** 2026-05-23
**Branch:** `feat/vite-migration`
**Operator:** JBD & Claude
**Status:** COMPLETED

### Scope
Full deployment and repository audit. No code changes. Stabilize documentation to reflect actual production state.

### Findings

**GitHub:**
- `feat/vite-migration` tip: `dcc8782` — local = remote = deployed. Clean working tree. No local-only changes.
- `main` tip: `0e8d4c` — only 2 initial commits. All SESSION work (`0009`–`0014`) exists only on `feat/vite-migration`. `main` has never been merged.

**Vercel — two projects discovered:**

| Project | URL | Fix present | GitHub-connected |
|---|---|---|---|
| `rn-layout-engine` | https://rn-layout-engine.vercel.app | ✅ `containerSize=null`, DPR cap | ✅ auto-deploys on push |
| `frontend` | https://frontend-eta-five-50.vercel.app | ✅ same fix | ❌ manual only |

`rn-layout-engine` is canonical. `frontend` is a debugging artifact from SESSION-0013/0014.

**iPhone fix verification (binary-level):**
- `rn-layout-engine.vercel.app` production (`pq310qmwp`): `useState(null)` ✅, `Math.min(typeof window<"u"?window.devicePixelRatio:1,2)` ✅, zero `__dbg_js` ✅
- `frontend-eta-five-50.vercel.app` production: same fix confirmed earlier

**`rn-layout-engine` production branch:** Currently `feat/vite-migration` (not `main`). Pushes to `feat/vite-migration` auto-trigger production deploys. Must be updated to `main` after merge.

### Delivered
- `docs/DEPLOYMENT.md` — complete rewrite with canonical URL, two-project explanation, mobile fix documentation, deployment rules
- `docs/SYSTEM_STATE.md` — corrected deployment section, corrected branch state table, updated next priorities
- `docs/KNOWN_RISKS.md` — corrected RISK-0014 production URL, added RISK-0020 (two Vercel projects + empty main)
- `docs/SESSION_LOG.md` — this entry

### Open
- Merge `feat/vite-migration` → `main`
- Update `rn-layout-engine` Vercel production branch to `main`
- Delete or archive `frontend` Vercel project

---

## SESSION-0014
**Date:** 2026-05-23
**Branch:** `feat/vite-migration`
**Operator:** JBD & Claude
**Status:** COMPLETED — confirmed on iPhone Safari

### Scope
Deep root-cause investigation of iPhone Safari blank screen. SESSION-0013 fixes (panel overflow, height chain, touch handlers) were correct and necessary but did not address the primary cause. Full diagnosis required — no guessing, find the exact root cause.

### Root Cause

**PRIMARY — Konva canvas memory exhaustion on iOS Safari:**
`containerSize` was initialized to `{ width: 800, height: 600 }`. On iPhone 12+ (`window.devicePixelRatio = 3`), Konva creates canvas elements at `width × DPR` × `height × DPR` = `2400 × 1800 = 4,320,000 pixels`. Each canvas layer occupies ~16.5 MB (`2400 × 1800 × 4 bytes`). Konva creates two layers by default (scene layer + hit layer), totaling **~33 MB**. iOS Safari enforces a hard per-page canvas memory limit of **~16 MB**. Exceeding this limit causes Safari to silently blank all canvas elements. The body background (`bg-slate-950`) was all that rendered — the entire Konva stage was invisible.

This is a silent failure with no JavaScript exception, no console error, and no visible DOM change. The Stage node exists in the DOM with correct dimensions, but the canvas backing store is deallocated/blanked by the OS.

**SECONDARY — Deployment protection blocking new builds:**
All newly deployed Vercel URLs had Deployment Protection enabled (Vercel SSO), requiring authentication. The old public alias (`frontend-eta-five-50.vercel.app`) was serving a cached pre-fix build from the CDN edge. Resolved by disabling Deployment Protection in Vercel project settings.

### Diagnosis Method
Added two visible diagnostic markers at the DOM level (bypassing React and CSS):
1. **Green bar** (in `main.tsx` before React mounts): pure DOM injection confirming JavaScript executes on Safari
2. **Blue bar** (React `DebugOverlay` component): renders after first React paint, showing `#root` dimensions and `App` dimensions

On iPhone Safari, both bars appeared correctly, confirming React mounted and the layout chain was intact. Canvas was sized correctly by the ResizeObserver (390×710 on iPhone 14). Root cause narrowed to rendering — canvas memory.

### Delivered

**`src/components/canvas/LayoutCanvas.tsx`:**
- `containerSize` state changed from `{ width: 800, height: 600 }` to `null` — Stage not rendered until ResizeObserver fires with real device dimensions. This prevents any canvas memory allocation before the true container size is known.
- `{containerSize !== null && <Stage ...>}` — conditional render gate
- `pixelRatio={Math.min(window.devicePixelRatio, 2)}` — caps canvas DPR at 2 (max ~6.2 MB per layer at 390×844, vs ~16.5 MB at DPR=3). Total Konva memory: ≤ ~12.5 MB, well within iOS Safari limit.
- `exportPNG` guard: `if (!containerSize) return` — safe no-op before Stage is ready
- Removed `'use client'` directive (Next.js remnant, no-op in Vite but added noise)

**`src/hooks/useCanvasState.ts`:**
- Removed `'use client'` directive

**`vite.config.ts`:**
- Added `build.target: ['es2020', 'safari15']` — ensures esbuild transpiles any syntax not supported on Safari 15+

**`src/main.tsx` / `src/App.tsx`:**
- Added DEBUG-0014 diagnostic overlays (SESSION-0014 diagnostic phase only)
- Removed in final clean deploy after iPhone confirmation

### Vercel Deployment Protection
Vercel Deployment Protection was enabled project-wide. New deployment URLs (per-hash) returned HTTP 401. Old production alias was stuck serving CDN-cached pre-fix content. Resolution: disabled Deployment Protection in Vercel project settings dashboard → redeployed → all URLs publicly accessible.

### TypeScript
Zero errors on `npx tsc --noEmit` after all changes.

### Validated (2026-05-23)
| Behavior | Status |
|---|---|
| iPhone Safari — canvas renders with layout assets visible | ✅ confirmed on device |
| iPhone Safari — diagnostic bars appeared (React mounted, correct sizing) | ✅ confirmed on device |
| Vercel production URL publicly accessible (no auth) | ✅ |
| Debug overlays removed from production build | ✅ |
| Desktop layout unchanged — no visual regression | ✅ |
| Export PNG still works (containerSize null guard added) | ✅ |
| TypeScript 0 errors | ✅ |
| SESSION-0013 mobile panel toggles preserved | ✅ |
| SESSION-0012 interactions preserved | ✅ |

### Open
- Merge `feat/vite-migration` → `main`
- Connect GitHub repo to Vercel for auto-deploy on push to `main`
- RISK-0015 (layout persistence), RISK-0016 (export viewport), RISK-0017 (touch drawing), RISK-0018 (iOS prompt)

---

## SESSION-0013
**Date:** 2026-05-23
**Branch:** `feat/vite-migration`
**Operator:** JBD & Claude
**Status:** LOCALLY VALIDATED — pending iPhone/iPad/Chrome mobile smoke test on Vercel

### Scope
Mobile stability and responsive pass. Fix blank/dark screen on iPhone Safari. Ensure canvas renders on all viewports without crashing or collapsing to zero width.

### Root Cause (blank screen on iPhone)
Three compounding issues:

**PRIMARY — Side panel overflow (blank screen trigger):**
`AssetLibraryPanel` (`w-56` = 224px) + `PropertiesPanel` (`w-60` = 240px) = 464px total panel width. iPhone Safari viewport is ~390px. The canvas `flex-1` container received 0 or negative width. `overflow-hidden` on the parent clipped everything → blank dark screen.

**SECONDARY — `#root` missing height:**
`html` and `body` both had `height: 100%` but `#root` had no explicit height. This broke the flex height chain from the HTML root down to the Konva canvas container (`h-full`), causing a potential 0-height canvas in some iOS Safari layout passes.

**TERTIARY — No touch event handlers:**
Stage only had `onMouseDown`, `onMouseMove`, `onClick`. iOS Safari touch events don't reliably fire mouse equivalents on canvas elements. Pan and zoom were not functional on touch.

### Delivered

**`index.html`:**
- Added `viewport-fit=cover` to the viewport meta tag (iPhone notch / safe area support)

**`src/index.css`:**
- Added `#root { height: 100%; }` — completes `html → body → #root → App` height chain
- Added `canvas { touch-action: none; }` — tells the browser to give all touch gestures to Konva, preventing native scroll/pinch from conflicting

**`src/App.tsx`:**
- Changed root div from `h-screen` (100vh) to `h-full` — more reliable on iOS Safari where `100vh` is the large viewport (URL bar ignored), causing layout mismatch with actual visible area
- Keyboard hints footer row: `flex` → `hidden sm:flex` — hides verbose desktop hints on mobile

**`src/components/DrawingToolbar.tsx`:**
- Added mobile panel toggle props: `onToggleLibrary`, `onToggleProperties`, `libraryOpen`, `propertiesOpen`
- Added mobile toggle buttons (☰ Library, ⊟ Properties), hidden on desktop (`md:hidden`)
- Tool label: `hidden sm:block` — visible on sm+
- Keyboard hint text: `hidden md:block` — visible on md+
- "Clear annotations" button: `hidden sm:block` — hidden on phones
- Export button label: shows "Exportar Plano" on sm+, "Export" on mobile

**`src/components/LayoutEditor.tsx`:**
- Added `mobilePanel: 'library' | 'properties' | null` state
- Panel wrappers use responsive classes: `hidden md:flex md:flex-none` (desktop always visible) vs `absolute inset-y-0 left/right-0 z-20 shadow-2xl flex flex-none md:static md:shadow-none` (mobile overlay)
- Backdrop `div` (`z-10 md:hidden bg-black/40`) behind open overlay — tap outside to dismiss
- `handleAddElement` closes the library overlay after placing an asset on mobile
- Canvas `<main>` gets `min-w-0` — prevents flex overflow from consuming all width

**`src/components/FooterLegend.tsx`:**
- Metadata grid wrapped in `overflow-x-auto` container with `min-w-[480px]` on the inner grid — footer scrolls horizontally on narrow viewports instead of collapsing/squashing

**`src/components/canvas/LayoutCanvas.tsx`:**
- Added `lastTouchDist` ref for pinch-to-zoom tracking
- Added `handleTouchStart`: single-finger → pan start; two-finger → pinch start
- Added `handleTouchMove`: single-finger → pan update; two-finger → pinch-zoom toward pinch center
- Updated global `useEffect`: listens to both `mouseup` and `touchend`; touchend also commits scale via `onUpdateViewport`
- Stage `width`/`height`: `Math.max(1, containerSize.width/height)` — prevents zero-size Konva Stage
- Stage: added `onTouchStart={handleTouchStart}` and `onTouchMove={handleTouchMove}` props

### TypeScript
Zero errors on `npx tsc --noEmit` after all changes.

### Validated (local, 2026-05-23)
| Behavior | Status |
|---|---|
| TypeScript 0 errors | ✅ |
| Desktop layout unchanged | ✅ (panels still visible side-by-side at md+) |
| Export PNG still works (containerSize used correctly) | ✅ |
| SESSION-0012 interactions preserved (delete, transformer, drawing selection) | ✅ |

### Open
- iPhone Safari smoke test (deployed Vercel)
- Chrome mobile smoke test (deployed Vercel)
- iPad viewport test
- Desktop regression check on Vercel
- Merge `feat/vite-migration` → `main` after mobile validation passes

---

## SESSION-0012
**Date:** 2026-05-21
**Branch:** `feat/vite-migration`
**Operator:** JBD & Claude
**Status:** LOCALLY VALIDATED — pending manual browser testing

### Scope
Operational polish sprint to prepare for office staff testing. Five priorities: export cleanup, universal selection/delete for all object types, operational color controls, asset library expansion, and export UX improvements.

### Delivered

**Export Cleanup:**
- Removed minor 1m grid entirely; retained only 5m and 10m grid lines at very low opacity
- Export pixel ratio increased to 2x (crisp at print resolution)
- Dark background (`#020617`) filled on combined canvas before drawing stage content — prevents transparent artifacts
- `renderFooterToCanvas` footer padding improved (6px inner margins)

**Universal Selection / Delete:**
- `useCanvasState`: added `selectedDrawingId`, `selectDrawing`, `deleteDrawing`, `updateDrawing`, `selectedDrawing` (derived), updated `clearDrawings` and `addDrawing` to manage drawing selection
- `LayoutCanvas`: `DrawingShape` is now interactive in pointer mode (`listening={true}`, hitStrokeWidth=12, onClick selects). Selection highlighted with blue shadow glow (shadowColor `#60a5fa`, blur 10). In draw modes: `listening={false}` (clicks pass to Stage). Delete/Backspace now handles both `selectedId` (element) and `selectedDrawingId` (drawing). `handleStageClick` clears both selections.
- `PropertiesPanel`: accepts `selectedDrawing`, `onUpdateDrawing`, `onDeleteDrawing` props. Shows `DrawingProperties` panel when a drawing is selected (type, text edit, color, stroke width, opacity, delete button)

**Operational Color Controls:**
- `LayoutElement.opacity?: number` and `DrawingPrimitive.opacity?: number` added to types
- `ColorPicker` component: 9 operational presets (red/orange/yellow/green/cyan/blue/purple/white/gray) + native `<input type="color">` for custom
- `OpacitySlider` component: range 0.10–1.00, step 0.05, shows % label
- Both controls appear in PropertiesPanel for elements and drawings

**Asset Expansion:**
- Added 13 new operational assets: Dance Floor, LED Wall, Screen, DJ Booth PRO, Bar, Buffet, Lounge, Backstage, Head Table, Kitchen, Restrooms, Entrance, Fence
- Total library: 34 assets across 6 categories (up from 21)

**Export UX:**
- "Export PNG" → "Exportar Plano" (operationally appropriate Spanish label, tracking-widest)

### TypeScript
Zero errors on `npx tsc --noEmit` after all changes.

### Open
- Manual browser validation (office testing session)
- Confirm deployment target (RISK-0014)
- Merge `feat/vite-migration` → `main` after deployment smoke test

---

## SESSION-0011
**Date:** 2026-05-21
**Branch:** `feat/vite-migration`
**Operator:** JBD & Claude
**Status:** LOCALLY VALIDATED

### Scope
Operational layout output: footer legend (CAD-style title block), PNG export, primitive drawing tools (line, arrow, text annotation), and asset structure direction (shape registry + categories).

### Delivered

**`src/types/layout.ts`:**
- Added `DrawingTool = 'pointer' | 'line' | 'arrow' | 'text'`
- Added `DrawingPrimitive` interface (id, tool, points, text?, color, strokeWidth)
- Added `LayoutMeta` interface (company, cliente, lugarEvento, fechaEvento, pax, version, fechaPlano, contacto, telefono, correo)
- Added `DEFAULT_LAYOUT_META`

**`src/hooks/useCanvasState.ts`:**
- Added `activeTool`, `drawings`, `layoutMeta` state
- Added `setTool`, `addDrawing`, `clearDrawings`, `updateMeta` callbacks
- Added `viewportRef` pattern for spawn logic

**`src/components/FooterLegend.tsx`** (new):
- `FOOTER_HEIGHT_PX = 88`
- 5-column metadata grid: CLIENTE, LUGAR EVENTO, FECHA EVENTO, PAX/INVITADOS, VERSION DEL PLANO, FECHA DEL PLANO, CONTACTO, TELEFONO, CORREO
- All fields editable inline (`<input>` with transparent bg)
- Left block: company name + "Layout Engine" label

**`src/components/DrawingToolbar.tsx`** (new):
- 4 tool buttons: pointer (↖), line (—), arrow (→), text (T)
- Keyboard shortcut hints, tool label display
- "Clear annotations" button
- Export button (later renamed to "Exportar Plano" in SESSION-0012)

**`src/components/canvas/LayoutCanvas.tsx`:**
- Rewritten with `forwardRef<LayoutCanvasHandle>` + `useImperativeHandle` exposing `exportPNG`
- Drawing tool routing in `handleStageMouseDown`
- Line/Arrow: ref-based start point + preview state during gesture
- Text: `window.prompt()` on click, commits immediately
- Global `window mouseup` commits drawing if distance > 5px
- `DrawingShape` renders committed primitives (Line, Arrow, Text Konva nodes)
- `DrawingPreview` renders dashed preview during gesture
- `AssetShape.interactive` prop disables events in non-pointer modes
- `exportPNG`: `stage.toDataURL()` + combined 2D canvas + `renderFooterToCanvas()` + download

**`src/components/LayoutEditor.tsx`:**
- Added `canvasRef`, `DrawingToolbar`, `FooterLegend`
- Restructured to `flex-col` with toolbar above panels row and footer below

### TypeScript
Zero errors on `npx tsc --noEmit`.

### Open
- Deployment confirmation (RISK-0014)

---

## SESSION-0010
**Date:** 2026-05-21
**Branch:** `feat/vite-migration`
**Operator:** JBD & Claude
**Status:** LOCALLY VALIDATED — merge to `main` pending deployment confirmation

### Scope
Two-part session delivered in sequence:

**Part A — First Usable Canvas Interaction Layer (SESSION-0010a)**
Wire all basic interactions that make the canvas operationally usable: asset placement from the library, element selection, Properties panel live update, and Delete key removal.

**Part B — Interaction Stability + Real Asset Rendering (SESSION-0010b)**
Fix three issues found during real manual testing: stage pan conflicting with asset drag, round tables rendering as rectangles, and new assets spawning stacked at origin.

### Delivered

#### Part A — Interaction wiring

**`src/hooks/useCanvasState.ts`**
- Added `addElement(template: AssetTemplate)` — generates unique ID, spawns near viewport center (see Part B refinement), sets selected state
- Added `deleteElement(id: string)` — removes element by ID, clears selection if deleted was selected

**`src/components/panels/AssetLibraryPanel.tsx`**
- Added `onAddElement: (template: AssetTemplate) => void` prop
- Wired `onClick` on each asset row to call `onAddElement(asset)`

**`src/components/canvas/LayoutCanvas.tsx`**
- Added `onDeleteElement: (id: string) => void` prop
- Added `useEffect` keyboard handler: Delete/Backspace removes selected element; guards against `INPUT`/`TEXTAREA` focus

**`src/components/LayoutEditor.tsx`**
- Wired `addElement` → `AssetLibraryPanel`
- Wired `deleteElement` → `LayoutCanvas`

#### Part B — Interaction stability + rendering

**ISSUE 1 — Stage pan / element drag conflict**
- Added `stageDraggable` state to `LayoutCanvas`
- Added `onDragStart` prop to `AssetShape`; sets `stageDraggable = false` when any element drag begins
- `onDragEnd` restores `stageDraggable = true` after element drag completes
- Stage now uses `draggable={stageDraggable}` — pan and element drag are fully separated

**ISSUE 2 — Round table circle rendering**
- Added `ElementShape = 'rect' | 'circle'` to `types/layout.ts`
- Added optional `shape?: ElementShape` to both `AssetTemplate` and `LayoutElement`
- Tagged 'Round Table 8' and 'Round Table 10' as `shape: 'circle'` in `AssetLibraryPanel.tsx`
- `addElement` passes `template.shape` through to the new `LayoutElement`
- `AssetShape` now renders `<Circle>` for `shape === 'circle'`, `<Rect>` for all others
- Label y-positions adjusted for circle geometry

**ISSUE 3 — Spawn stacking**
- Replaced fixed-origin spawn with viewport-center calculation
- Added `viewportRef` (tracks viewport without adding to `addElement` dep array)
- Spawn position = visible viewport center + diagonal offset per-element count
- Clamped to (0–100m) canvas range

### TypeScript
Zero errors on `npx tsc --noEmit` after all changes.

### Validated (local, 2026-05-21)
- Asset placement from library ✅
- Element selection → Transformer + Properties panel ✅
- Move (drag) ✅
- Resize (Transformer handles) ✅
- Rotate (Transformer rotate handle) ✅
- Delete (keyboard Delete/Backspace) ✅
- Properties panel live update ✅
- Stage pan does not fire during element drag ✅
- Round tables render as circles ✅
- New assets spawn near visible viewport center ✅
- No TypeScript errors ✅
- No canvas freeze ✅

### Open
- Confirm deployment target for `frontend/dist/` (RISK-0014)
- Merge `feat/vite-migration` → `main` after production smoke test

---

## SESSION-0009
**Date:** 2026-05-20
**Branch:** `feat/vite-migration`
**Operator:** JBD & Claude
**Status:** LOCALLY VALIDATED — merge to `main` pending deployment confirmation

### Scope
- Migrate RN Layout Engine frontend from Next.js 15 (App Router) to Vite 6 + React
- Infrastructure-only migration — zero canvas logic changes
- Create pre-migration rollback checkpoint before touching any file
- Validate full canvas behavior locally: zoom, pan, drag, transformer

### Root Cause for Migration
Next.js SSR forces `next/dynamic` workarounds for every Konva component (Konva requires `window`/`document` at module load time). The Layout Engine is a single-page canvas tool with no routing, no data fetching, and no SEO requirements. Next.js App Router added structural complexity with no operational benefit.

### Rollback Checkpoint
`a89787a` — complete Next.js scaffold + initial Konva source; verified safe rollback point.

### Delivered

#### commit `40ba052` — feat: migrate frontend from Next.js to Vite (infrastructure only)
- Added: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Modified: `package.json` (replaced `next` with `vite` + `@vitejs/plugin-react` + `@tailwindcss/vite`)
- Modified: `LayoutEditor.tsx` (removed `next/dynamic`; direct import)
- Modified: `tsconfig.json` (stripped Next.js plugin; added `allowImportingTsExtensions`)
- Modified: `eslint.config.mjs` (removed `eslint-config-next`)
- Modified: `AGENTS.md` (updated stack documentation)
- Deleted: `next.config.ts`, `postcss.config.mjs`, `src/app/`
- Zero changes to: `canvas/`, `panels/`, `useCanvasState.ts`, `types/`

#### Governance
- `DEC-0019` — Migrate frontend from Next.js to Vite (see `docs/DECISION_LOG.md`)
- `DEC-0020` — Retain Konva as browser-native canvas engine (see `docs/DECISION_LOG.md`)
- `RISK-0014` — Hosting deployment target for Vite SPA not yet confirmed (see `docs/KNOWN_RISKS.md`)

### Validated (local, 2026-05-20)
- `npm install` — clean, no peer conflicts ✅
- `npm run dev` — Vite server starts, zero compilation errors ✅
- Canvas renders without freeze ✅
- Zoom, pan, drag, transformer behavior confirmed ✅
- No SSR errors, no hydration warnings ✅
- `frontend/package-lock.json` updated post-validation ✅

### Rollback
```bash
# Option A — reset feat/vite-migration to pre-migration checkpoint
git reset --hard a89787a
git push origin feat/vite-migration --force

# Option B — abandon feat/vite-migration, continue from main
git checkout main
# main holds the pre-migration Next.js setup untouched
```

### Open
- Confirm deployment target for `frontend/dist/` (RISK-0014)
- Merge `feat/vite-migration` → `main` after production smoke test passes
- `docs/ARCHITECTURE.md` stack section updated this session (Next.js → Vite)

---

# Movido desde `frontend/CLAUDE.md` (2026-10-31)

Bitácora que estaba en `frontend/CLAUDE.md`, sin cambios, en el orden original.

## Known Bugs (not part of active work — do not fix without explicit instruction)

> **Resuelto (nota del 2026-10-31):** `get_event_summary` se eliminó en Eventos el 2026-10-11; este bug ya no aplica.

- **`get_event_summary` RPC — "Could not find the function public.get_event_summary(p_event_id) in the schema cache"**. Reported from the browser console in `eventos-eventos-frontend` (not this repo, but same Supabase project — relevant here because it's the same schema-cache/cross-schema surface area as the layout auto-link feature). The function `get_event_summary(event_id)` was created in `eventos.get_event_summary()` (per `CLAUDE.md`/session log in `eventos-eventos-frontend`, added ad-hoc via Supabase Studio, never committed as a tracked migration — see `eventos-eventos-frontend/src/services/eventSummaryService.ts:6`, `.rpc('get_event_summary', { p_event_id: eventId })` with no `.schema('eventos')` chained before the `.rpc()` call). Supabase's PostgREST resolves unqualified `.rpc()` calls against the `public` schema (or whatever schema is set via `.schema()`) — since the call doesn't chain `.schema('eventos')`, PostgREST looks for `public.get_event_summary` and doesn't find it, hence the schema-cache error. Likely fix (not applied): either call it as `supabase.schema('eventos').rpc('get_event_summary', ...)`, or move/duplicate the function into `public`. Flagged 2026-07-03 during the layout auto-link investigation; not touched in that batch.

---

## Session Log

### Sesión 2026-06-29
**Completado:**
- Implementada pantalla SinAcceso para usuarios autenticados sin membresía
- checkOrgMembership() consulta public.organization_members con .maybeSingle()
- App detecta membresía null → navega a /sin-acceso automáticamente
- Ruta /sin-acceso fuera del guard de auth
- Verificado en producción: usuarios externos ven pantalla "Sin acceso" limpia
- Verificado: usuarios JBD ven sus layouts normalmente

**Próximo paso:**
- Fase 2: Self-service onboarding para nuevas organizaciones

### Sesión 2026-07-01
**Completado:**
- Columna event_id agregada a tabla layouts
- Banner "Creando layout para evento" cuando hay event_id en URL
- layoutService.save() acepta event_id opcional
- Ruta /editor/:layoutId para abrir layout directamente
- vercel.json movido a /frontend/ para SPA rewrites correctos
- Redirect a Identity cuando no hay sesión en /editor/:layoutId
- VITE_IDENTITY_URL agregada como variable de entorno

**Próximo paso:**
- Fixes de Layout Engine (lista pendiente con Javier)
- Layout 3D con Three.js

### Sesión 2026-07-02
**Completado:**
- Fix export PDF: pivote de rotación igualado al de Konva + drawings (líneas/flechas/texto) incluidos en el PDF
- Duplicar layout y "Guardar como copia" — fork independiente, `parent_layout_id`/`version_number` (migración SQL creada, pendiente de ejecutar)
- Modo Selección vs Modo Mano + marquee-select + selección múltiple (`selectedIds: Set<string>`)
- Mover/copiar/eliminar en bloque sobre `selectedIds`, con undo/redo de una sola entrada por operación
- Z-order, tamaño de texto ajustable y flip horizontal/vertical para elementos
- Lectura en vivo + snap de ángulo (15°/45° con Shift) al dibujar líneas; campos Longitud/Ángulo en Properties Panel
- Herramienta Polígono libre (segmentos rectos, modelo `LayoutElement.points`) + herramienta Medir (distancia/área real vía Shoelace/elipse)
- Fix: Medir separado en sub-modos explícitos Distancia/Área (antes, cualquier click sobre un elemento medía área sin excepción, bloqueando medir distancia entre puntos dentro de elementos)
- 9 commits, todos pusheados a `main`, cada uno desplegado y confirmado "Ready" en Vercel

**Próximo paso:**
- ⚠️ Ejecutar `supabase/migrations/20260702000000_layout_duplication.sql` — bloqueante para que Duplicar/Guardar como copia funcionen en producción
- Office testing de todo lo de hoy con el equipo real (fuera de Playwright+mocks)
- Evaluar como batches futuros, si se necesitan: curvas bezier reales para Polígono, cotas formales tipo AutoCAD
- Revisar/cerrar RISK-0015 en `docs/KNOWN_RISKS.md` — quedó obsoleto desde que existe persistencia real vía Supabase

### Sesión 2026-07-03
**Completado:**
- Fix: auto-vinculación del primer layout creado para un evento. El botón "Vincular" manual y el tab Layout con la lista "Layouts creados para este evento" NO viven en este repo — viven en `eventos-eventos-frontend` (`src/pages/EventoDetalle.tsx` `LayoutTab`, `src/services/eventService.ts`). Ese repo hace `supabase.schema('eventos').from('events').update({layout_id})` directo desde el cliente, sin RPC — mismo proyecto Supabase que este repo (`rn-layout-engine-v2`, `zwrekwltmipmdbautnwd.supabase.co`), confirmado por `VITE_SUPABASE_URL` idéntico en ambos `.env`
- `layoutService.save()` (rama insert) ahora, tras crear el layout, consulta `eventos.events.layout_id` para el `event_id` recién guardado; si es `NULL` (primer layout del evento), dispara `UPDATE eventos.events SET layout_id = [nuevo id]` automáticamente vía el mismo mecanismo `.schema('eventos')`; si ya tiene valor (evento con layout oficial + boceto/alternativa nueva), NO auto-vincula — el botón "Vincular" manual en `eventos-eventos-frontend` sigue intacto para ese caso (versionado tipo quotes v1/v2 de Ventas)
- Nuevos métodos `layoutService.getEventLayoutId()` / `layoutService.linkEventLayout()`, ambos cross-schema vía `.schema('eventos')`
- Verificado end-to-end en navegador real (dev server + Playwright con mocks de red HTTP, no del cliente JS): ambos escenarios (auto-link cuando `layout_id` es null, no-auto-link cuando ya tiene valor) confirmados por las llamadas de red reales (`Accept-Profile`/`Content-Profile: eventos`)

**Próximo paso:**
- ~~Validar con datos reales en producción~~ — ver SESSION-0020 abajo (mismo día): el reporte inicial de que no funcionaba resultó ser un bug de otro repo, no de este fix
- Mismos pendientes de sesiones anteriores (migración de duplicación sin ejecutar, office testing general)

### Sesión 2026-07-03 (continuación) — SESSION-0020: diagnóstico del auto-link roto en producción
**Contexto:** el fix de SESSION-0019 (`eeae250`/`d4f4464`) no funcionó en producción — se crearon 2 layouts nuevos para un evento sin layout previo y ninguno se auto-vinculó, incluido el primero (que según el diseño debía auto-vincularse).

**Completado (solo diagnóstico, sin aplicar fix todavía):**
- Descartado por evidencia directa: el deploy de producción SÍ incluye el código del fix (`curl` al bundle JS servido en `rn-layout-engine.vercel.app`, confirmado string `auto-link` y dos llamadas `.schema("eventos")` presentes)
- Descartado (parcialmente, sin JWT de usuario real): acceso al schema `eventos` vía Data API funciona a nivel de esquema/columna — `GET eventos.events?select=id,layout_id` con la anon key devuelve `200 []` (respuesta válida, no error de "schema/columna no encontrada"), lo que sugiere que el schema cache de PostgREST sí reconoce `eventos.events.layout_id`. No descarta RLS bloqueando para un usuario autenticado real, solo descarta que el problema sea "schema no expuesto" o "columna no cacheada"
- Instrumentado `layoutService.ts` con logging temporal `[auto-link]` (prefijo consistente): loguea el disparo del intento (event_id + nuevo layout_id), el valor de `eventos.events.layout_id` devuelto por `getEventLayoutId`, y el resultado del UPDATE — `linkEventLayout` ahora encadena `.select('id, layout_id').maybeSingle()` (antes no seleccionaba nada) específicamente para poder distinguir un UPDATE que sí afectó una fila de uno bloqueado silenciosamente por RLS (0 filas, sin error — comportamiento normal de Postgres/PostgREST, no un bug de Supabase)
- Hallazgo secundario, NO confirmado como causa raíz de este bug específico (los layouts sí llegaron con `event_id` seteado, así que el usuario ya estaba autenticado cuando guardó): `App.tsx` `handleLogin()` llama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` — `window.location.origin` descarta el query string. Si un usuario NO autenticado llega a `/?event_id=X` y hace login recién ahí, vuelve a `/` sin `event_id` tras el OAuth roundtrip. Vale la pena revisarlo aparte, pero no es la causa de este reporte (los `event_id` de ambos layouts sí llegaron a `layouts.event_id`, confirmado porque aparecen en la lista del tab Layout)
- Documentado bug aparte no relacionado: `get_event_summary` (ver sección "Known Bugs" arriba)

**Resuelto (2026-07-03, el mismo día) — el usuario reprodujo en producción con su propia sesión:**
- Los logs `[auto-link]` confirmaron que el UPDATE a `eventos.events` **siempre se ejecutó sin error y con la fila devuelta correctamente** (`layout_id` bien seteado desde el primer intento) — descarta la hipótesis de RLS bloqueando en silencio. El código de este repo (`layoutService.save()`/`getEventLayoutId`/`linkEventLayout`) nunca tuvo el bug
- **La causa real vivía en `eventos-eventos-frontend`, no en este repo**: `EventoDetalle.tsx` carga el evento una sola vez al montar y nunca lo vuelve a pedir — la pantalla del tab Layout seguía mostrando `layout_id = null` (botón "Vincular" manual) aunque la escritura ya hubiera ocurrido bien, hasta un refresh manual. Corregido ahí con un refetch en `window focus` + `visibilitychange`, commit `5c49733` en `eventos-eventos-frontend` — sin ningún cambio adicional en `rn-layout-engine`
- Validado manualmente por el usuario en producción con capturas de pantalla: auto-link + historial de layouts funcionan correctamente end-to-end
- **Logging retirado parcialmente**: se quitaron los `console.log` verbosos de cada guardado (disparo del intento, valor de `layout_id` consultado, confirmación de éxito) por ser ruido innecesario en producción a largo plazo. Se dejó como mejora permanente el `.select('id, layout_id').maybeSingle()` en `linkEventLayout` (detecta si algún día un UPDATE es bloqueado por RLS sin lanzar error — solo entonces loggea un `console.warn`), y el `console.error` en el catch general (ya existía desde SESSION-0019, comportamiento defensivo estándar, no diagnóstico)

### Sesión 2026-07-08 — SESSION-0021

**Bug 1 — "Cargando..." indefinido al abrir un layout desde Eventos por primera vez (requería refresh manual):**
- Causa real en dos repos, confirmada por código, no supuesta:
  - `eventos-identity-frontend/src/pages/Login.tsx` construía el `redirectTo` del OAuth concatenando `"/callback"` al final de la URL completa de redirect (incluyendo su query string). Para redirects sin query (FieldOps, Inventarios) no se notaba; para `rn-layout-engine` (`/editor/:id?event_id=X`) corrompía `event_id` a `"X/callback"` y mandaba el callback de OAuth a la ruta equivocada en vez de aterrizar limpio. Fix: se reconstruye con la URL API insertando `/callback` en el pathname y preservando el query string — verificado que para FieldOps/Inventarios el resultado es byte-idéntico al anterior (commit `0ef392f`)
  - `App.tsx`: el `getSession()` inicial no tenía timeout. `supabase-js` procesa el implicit-grant callback vía un fetch interno (`_getUser`) sin `AbortController` ni timeout — si ese fetch se cuelga, `checking` nunca pasa a `false` y la UI queda en "Cargando..." para siempre, sin error visible (mismo patrón que el bug de geolocalización de FieldOps). Como el hash de tokens solo se limpia de la URL *después* de que ese fetch resuelve, un refresh manual reintenta con los mismos tokens (aún válidos) y normalmente funciona — de ahí el síntoma "un refresh lo arregla". Fix: timeout de 10s con estado de error visible + botón "Reintentar"; `getLayoutIdFromPath()` ahora también reconoce `/editor/:id/callback` (commit `7391bf8`)
- Ambos fixes deployados y verificados contra el sitio en vivo (no solo el output del CLI): `last-modified` fresco, `x-vercel-cache: MISS`, y el bundle servido contiene los strings nuevos (`"No se pudo verificar tu sesión"`, `classList.remove("overflow-hidden")` del bug 2 más abajo)

**Hallazgo de infraestructura (no un bug de código, un problema de configuración de Vercel):**
- El deploy de `rn-layout-engine` en Vercel **nunca fue automático por push a `main`**, a pesar de que `docs/DEPLOYMENT.md` lo documentaba así. Confirmado con `gh api repos/.../commits/<sha>/check-runs` y `.../status` → `total_count: 0` para *todos* los commits del repo, incluyendo commits de semanas atrás ya dados por "verificados en producción". Contraste: `eventos-identity-frontend` sí tiene el webhook funcionando (status `"success"` real en GitHub). Todo deploy de producción de este repo siempre fue manual vía `vercel --prod` (CLI, usuario `jbd84`)
- `docs/DEPLOYMENT.md` corregido con el flujo real: `vercel link --yes --project prj_3FI1KiHhe03aL3YuzpdSjDCGteVY` desde la raíz del repo (crea `.vercel/repo.json` con `"directory": "frontend"`, formato repo-aware — no crear `frontend/.vercel/project.json` a mano, ese era el link viejo que apuntaba al proyecto `frontend` deprecado) + `vercel --prod` desde la raíz. Se agregó paso de verificación contra el sitio en vivo (`curl -sI .../ | grep last-modified`) en vez de confiar solo en el output del CLI (commit `2ab9c5f`)
- **Pendiente:** no se investigó *por qué* el webhook de `rn-layout-engine` específicamente no dispara (vs. Identity que sí funciona) — si se quiere volver a auto-deploy por push, hay que revisar/reconectar la integración Git en el dashboard de Vercel

**Bug 2 — Grid de "Layouts" no hace scroll con 18+ layouts (ni mouse ni teclado):**
- Causa: `frontend/index.html` fija `<body class="h-full overflow-hidden">` globalmente — correcto para el Editor (Konva necesita dueño exclusivo del viewport, sin scroll nativo de página/pinch). Como es un solo `index.html` compartido por toda la SPA, `LayoutDashboard` heredaba el mismo `overflow: hidden` aunque su grid (`min-h-screen`) sí crece más que el viewport con muchos layouts — sin ningún ancestro scrollable en la cadena, el contenido quedaba recortado sin scrollbar
- Fix: `LayoutDashboard.tsx` remueve la clase `overflow-hidden` de `document.body` mientras está montado y la restaura al desmontar (vuelta al Editor) — cero cambios a `index.html`/`index.css` compartidos
- Reproducido y verificado con Playwright contra el dev server real (componente real, CSS real, sin mocks de layout, harness temporal descartado tras la prueba): con 18 layouts el contenido excede el viewport (1430px vs 800px) y scrollea con rueda y con PageDown; con 3 layouts cabe exacto (800px vs 800px) y no se dispara ningún scroll — sin scrollbar innecesaria en listas cortas (commit `6ebfeb7`)

**Próximo paso:**
- Confirmar con Javier el resultado de sus pruebas reales de login (Layout Engine + FieldOps/Inventarios) antes de dar el Bug 1 por cerrado del todo
- Revisar/reconectar el webhook Git↔Vercel de `rn-layout-engine` si se quiere recuperar auto-deploy por push
- Mismos pendientes de sesiones anteriores (migración de duplicación sin ejecutar, office testing general)

### Sesión 2026-08-10 — SESSION-0022

**Completado:**
- Corregido bug de datos: `public.layouts.org_id` estaba mal poblado en el 100% de las filas existentes (43/43) — igual a `created_by` en vez del id real de la organización, arrastrado desde antes del fix de `App.tsx` del 27 jul (`d82cc6c`). Al menos una fila del 4 ago (una semana después de ese fix, ya confirmado desplegado) seguía con el mismo bug sin que el código actual tenga un camino que lo explique — probable bundle cacheado viejo o acceso vía el proyecto Vercel deprecado (`frontend-eta-five-50.vercel.app`), sin confirmar aún
- Migración `20260810183024_layouts_fix_org_id_and_scope_by_org.sql`: backfill de los 43 `org_id` desde la membership activa real de cada creador; RLS reemplazada de ownership por creador (`created_by = auth.uid()`) a membership por organización (decisión de producto: los planos son compartidos por org, no privados por creador); trigger `layouts_set_org_id()` que resuelve `org_id` del lado del servidor en cada insert/update, ignorando lo que mande el cliente
- Revisión de seguridad de esa migración encontró una vulnerabilidad real: al reemplazar la policy vieja se perdió sin querer el `WITH CHECK (created_by = auth.uid())` que tenía — cualquier miembro de una org podía spoofear `created_by` a cualquier otro usuario real vía INSERT o UPDATE directo. Confirmado explotable en producción antes del fix (impersonación real de usuario vía `set local request.jwt.claim.sub`)
- Migración `20260810185339_layouts_fix_created_by_spoofing.sql`: mismo criterio que `org_id` — `created_by` se pisa siempre con `auth.uid()` en INSERT y queda inmutable (`OLD.created_by`) en UPDATE, sin importar qué mande el cliente
- Ambas migraciones aplicadas directo contra producción vía `supabase db query --linked -f` (no `db push`, mismo criterio que `20260727193938` — ledger `schema_migrations` compartido entre repos) y verificadas empíricamente con impersonación real de tres usuarios de JBD Producciones: backfill sin mismatches (0 filas), RLS probada con jbambaren/clauz/tzuloaga viendo el mismo set de 43 layouts, trigger de `org_id` y gate de `approval_status` (org suspendida bloqueada) confirmados, y el ataque de spoofing de `created_by` re-testeado y bloqueado tras el fix, sin regresiones
- Ambos commits pusheados a `main`; deploy automático de Vercel confirmado `"state":"success"` vía `gh api .../status` y sitio en vivo con `last-modified` fresco (`x-vercel-cache: MISS`) — pese a ser solo migraciones SQL sin tocar `frontend/`

**Próximo paso:**
- Confirmar con claudialauzeli (org "Claudia Producciones") si accedió por `rn-layout-engine.vercel.app` (URL canónica) o por la deprecada `frontend-eta-five-50.vercel.app`, para descartar el proyecto viejo como causa de la fila corrupta del 4 ago
- Mismos pendientes de sesiones anteriores (migración de duplicación sin ejecutar, office testing general)

### Sesión 2026-09-03 — SESSION-0023

Sesión larga: fixes de producto sobre "Mis Assets" + autosave, tres features de selección múltiple, y el rollout completo de responsive + i18n (ES/EN/PT). Todo commiteado y pusheado a `main` uno por uno; deploy automático de Vercel confirmado en cada push.

**Fixes de producto / features (con migraciones):**
- **Autosave (`caf70ad`)** — tabla nueva `public.layout_drafts` (migración `20260903125133`, aplicada vía `db query --linked -f` + `migration repair --status applied`, nunca `db push`). PK `layout_id` → FK a `layouts` ON DELETE CASCADE, 1 fila por layout, **compartida por organización** (mismo modelo que `quote_document_drafts`/`event_document_drafts` de Ventas/Eventos). Trigger `layout_drafts_set_fields()` resuelve `org_id` (heredado de la fila `layouts`) y `updated_by` server-side. RLS por membership de org activa (misma que `public.layouts`). `draftService` + `useLayoutAutosave` (debounce 6s, flush forzado a 30s y en `pagehide`/`visibilitychange`/desmonte — camino beacon con `fetch keepalive`). Escribe SOLO en `layout_drafts`, nunca en `layouts` (esa fila la sigue pisando solo "Guardar" manual). `RecoveryBanner` al abrir si hay draft más nuevo que `layouts.updated_at`. **Gap conocido por decisión de producto:** un layout nunca guardado a mano no tiene fila `layouts` → autosave arranca recién tras el primer "Guardar". Verificado en prod con impersonación de 2 orgs: usuario de otra org no lee/actualiza/borra el draft ajeno (0 filas), INSERT cross-org bloqueado por WITH CHECK, trigger pisa `org_id`/`updated_by` spoofeados.
- **Nombre de asset + geometría de polígono (`d48718e`)** — el "nombre corrupto" reportado (`456…×1.21…`) era el **badge de dimensiones sin redondear** leído como nombre; el `name` real era limpio. Migración `20260903125134`: columna `points jsonb` nullable en `custom_assets` (se descartaba `element.points` al guardar un polígono → volvía como rectángulo del bbox). Modal pidiendo nombre al "Guardar como asset" (con `.trim()`); `default_width/height` redondeados a 2 decimales. RLS de `custom_assets` sin cambios (sigue ownership por `created_by = auth.uid()`, sin trigger — arrastra la misma vuln de spoofing de `created_by` que `layouts` tenía pre-`20260810185339`; **fuera de alcance, anotado**).
- **Asset compuesto `kind='group'` (`a73f858`)** — migración `20260903132711`: columnas `kind text NOT NULL default 'shape' CHECK (kind IN ('shape','group'))` + `children jsonb`. Guardar una selección múltiple como un asset reutilizable; botón en `MultiSelectProperties`. `buildGroupAsset` (bbox min/max igual que `addPolygon`) + `useCanvasState.addGroup` (nueva — no había bulk-add; sigue el patrón de `addPolygon`/`duplicateElements`, un `pushHistory` + un `setElements`, una entrada de undo). Al colocar: expande a N elementos independientes en el centro del viewport, todos seleccionados (aprovecha el group-drag existente). `GroupChild` extiende el set mínimo con `category` (obligatorio para reconstruir un `LayoutElement`) + `name`/`opacity`/`flipX`/`flipY`/`notes`. Verificado en prod con roundtrip `kind='group'` + impersonación + reject del CHECK.
- **Rotar grupo — input numérico (`d9bd0ed`)** — `useCanvasState.rotateElements(ids, deltaDeg)`: rota como bloque rígido alrededor del centro del bbox combinado (`min/max`, sin considerar rotación individual). Cada elemento orbita su `(x,y)` con `[cos -sin; sin cos]` (coords y-down → delta positivo = horario, igual que Konva) **y** suma el delta a su `rotation` (mod 360). Elementos `locked` excluidos del bbox y de la rotación (mismo criterio que el group-drag, no el de los botones de z-order). Una entrada de undo.
- **Rotar grupo — handle interactivo (`b536f6c`)** — Ruta B acotada, complementa el input numérico (quedan los dos). Verificado antes con Konva 10.3.0 real: `Transformer.nodes()` multi-nodo + `resizeEnabled:false` + `enabledAnchors:[]` → cada nodo queda con `x/y/rotation` final orbitando el pivote común, `scaleX/scaleY` en ~1 (±1e-16), y el `Transformer` emite su propio `transformend` una vez (además de uno por nodo). Wiring: con `selectedIds.size > 1` el Transformer se ata a los nodos no-locked, rotación pura. `handleGroupTransformEnd` lee `tr.nodes()` → un `onPushHistory()` + un `onUpdateElements()`. El `onTransformEnd` por `AssetShape` se saltea mientras hay >1 nodo atado (si no: N+1 entradas de undo). **Divergencia aceptada y documentada en el código:** Konva pivota sobre el bbox **rotación-aware**, `rotateElements` sobre el `min/max` plano — idénticos si nada está pre-rotado.
- **Buscador de layouts (`e88b75b`)** — `layoutService.list()` trae todo de una consulta (sin paginación) → filtro client-side por nombre en `LayoutDashboard`, contador "{N} de {M}", estado vacío para "sin coincidencias", sin debounce.

**Rollout responsive + i18n (6 tandas + PT):**
- **Tanda 1 (`3592789`)** — fix de clipping real en prod: en `<sm` la barra de nombre/acciones del editor desbordaba (input `w-64` fijo + 3 botones) y "Guardar" quedaba fuera de pantalla. Puro Tailwind: input pasa a `flex-1 min-w-0` en `<sm`; "Guardar como copia"/"Duplicar" → `hidden sm:block` (Duplicar sigue en las tarjetas del dashboard); headers de `AppShell` y `Dashboard` con `"|"`/badge "MVP"/"Mis Layouts" → `hidden sm:inline`.
- **Tanda 2 (`6459c56`)** — i18n infra. El `LangContext` es **hand-rolled, NO react-i18next** (decisión confirmada: ~20 pantallas, no justifica el churn; no hay paquete compartido entre repos). Fallback invertido `en`→`es`. Cascada `organization_members.locale ?? organizations.locale ?? navigator.language ?? 'es'` (`normalizeLocale` acepta `es-PE`/`en-US`/`pt-BR`). `useOrgStatus` ampliado para traer `member.locale`/`org.locale`. **El toggle escribe `organization_members.locale` del usuario** (UPDATE ... WHERE user_id AND org_id) para que el idioma viaje entre dispositivos — mismo patrón que Ventas/Eventos/Identity; `localStorage['rn-lang']` queda solo como bootstrap pre-cascada, NO override permanente. RLS verificada: `org_members_self` (cmd ALL, `user_id = auth.uid()`) lo permite. `<html lang>` sincronizado. Borrados: clave muerta `headerSub`, componentes muertos `LegendPanel.tsx` y `CustomAssetsPanel.tsx`.
- **Tanda 3 (`8e0e24b`)** — dict: barra de guardado + modal "Guardar como asset" + `RecoveryBanner` + `MultiSelectProperties`.
- **Tanda 4 (`c01581b`)** — dict: `LayoutDashboard` completo (incl. strings del buscador; `formatDate` lang-aware).
- **Tanda 5 (`f7af975`)** — dict: `LoginScreen` + pantallas de auth/error de `App.tsx` + `OrgStatusGuard` + `org/*`. **`LangProvider` hoisteado a la raíz de `App`** (por encima de `OrgStatusGuard`) — antes de que resuelva sesión/org sus props son undefined/null y cae al bootstrap; una vez activa la org recibe la cascada real sin remontarse. Confirmado: ninguna llamada a `supabase` por montar el provider (el único uso está en `setLang`, guardado por `userId && orgId`).
- **PT (`a239b1d`)** — `Lang` → `'en'|'es'|'pt'`, dict `pt` (129 claves pt-BR, `tsc` fuerza la paridad vía `strings.pt → Strings` en el Provider), `ASSET_NAME_PT` (39 nombres). Nuevo `<LangToggle>` (selector de 3 vías `ES | EN | PT`, activo resaltado) montado en **ambos** headers (reemplaza el toggle binario en `AppShell`, agregado en `LayoutDashboard` donde no había). `formatWhen`/`formatDate` con mapa `{ es:'es-PE', en:'en-US', pt:'pt-BR' }`. `poweredBy` PT: "Desenvolvido pela Reality Near".
- **Tanda 6 (`18416e9`)** — el corte de los paneles fijos Librería/Propiedades pasa de `md` (768) a `lg` (1024). A 768 los paneles estáticos dejaban ~304px de canvas (inusable); a 1024 quedan 560px (piso real de edición). Abajo de `lg` siguen siendo drawers colapsables (patrón de SESSION-0016). Puro Tailwind (`md:` → `lg:` en 3 puntos de drawers + los toggles ☰/⊟ y el hint verboso del toolbar), sin JS ni breakpoint custom.

**Pendiente / fuera de alcance:**
- **Sweep de i18n de exports (Excel/PDF)** — tarea aparte, todos los módulos, criterio compartido: los exports quedan en español por ahora. Incluye los labels del title-block de `FooterLegend` (que se imprimen en el PDF/PNG) — a propósito NO se tradujeron en este rollout para no generar un documento a mitad de camino.
- `"EventOS Layout"` sigue hardcodeado en el header del `Dashboard` (misma string de marca que `t.appName`) — no vale una tanda por una string.
- Smoke test real de iPhone/iPad del chrome responsive y del `<LangToggle>` a ~320px (entra justo).
- Mismos pendientes de sesiones anteriores (migración de duplicación `20260702000000` sin ejecutar, office testing general).

### Sesión 2026-10-31 — Auditoría de Layout, bloques 1 a 9

Todo el detalle (decisiones, pruebas con ROLLBACK, capturas y lo "decidido en ausencia, revisar") está en `docs/AUDITORIA-LAYOUT.md`. Resumen para la próxima sesión:

**Hecho (todo en `main`, desplegado):**
- Bloque 1: permisos por rol (`layout_can`, RLS por acción). Bloque 2: arreglos rápidos. Bloque 3: `LayoutCanvas.tsx` partido en `components/canvas/`.
- Bloque 4: mesas con sillas (`groupId`), PAX automático, alinear/distribuir/repetir; ajustes de la org en `organizations.settings.layout`.
- Bloque 5: plano del local de fondo (bucket `layout-backgrounds`), muros (W) y cotas (C).
- Bloque 6: capas fijas (`meta.layers`, "Vista cliente" configurable) y biblioteca de la org (`custom_assets` por org, facultad `layout.compartir`, plantillas).
- Bloque 7: curvas (`segments` por lado: recto / arco con bulge / Bézier; herramientas Arco R y Curva B; medias lunas).
- Bloque 8: PDF vectorial A4/A3 a escala estándar con cajetín siempre (`components/canvas/pdfExport.ts`, `lib/pdfLayout.ts`); exportar selección en PDF y PNG; fondo como JPEG de 150 ppp (de 5,5 MB a ~20 KB).
- Bloque 9 (primer paso): vista 3D en `/3d/<plano>` (otra pestaña, `components/viewer3d/`, Three.js solo ahí, 153 KB gzip aparte).

**Reglas que siguen valiendo:**
- `org_settings_schema()` es compartida entre módulos: toda migración que la toque se genera desde `pg_get_functiondef` vivo y lleva candado md5 (ver migraciones `20261031240000`, `…280000`, `…300000`).
- Migraciones con `supabase db query --linked -f`, probadas antes con ROLLBACK por rol; nunca `db push`.
- En JBD solo mirar.

**Pendiente:**
- La sesión de QA en el navegador se cerró sola durante el bloque 8 (no por esta sesión); el bloque 8 y el 9 se probaron con páginas locales que montan los módulos reales (PDF, canvas, visor 3D) y con el plano más grande de JBD en solo lectura. Falta repetir en la app con sesión: el diálogo de exportar del editor, el botón "Ver en 3D" y la tarjeta de Administración (hoja del PDF).
- Bloque 9, pasos siguientes: modelos CC0 para piezas especiales, choques al recorrer, dibujos/cotas en 3D, render con IA (después, sin proveedor pago).

---

## Sesión 2026-11-01 — Layout: recorte del fondo, alturas 3D, mantel, lista de materiales, edición de curvas

Detalle completo (decisiones, pruebas con ROLLBACK, capturas): `docs/AUDITORIA-LAYOUT.md` §6 (parte A), §8 (lista de materiales), §9 (curvas con el mouse) y §10 (propuesta capa/tipo).

**Hecho (en `main`, desplegado):**
- **Recortar el plano del local** (`meta.background.crop`, 0–1 de la imagen original; editor, PNG, PDF y 3D).
- **Alturas 3D por tipo de pieza** como ajuste de la org (`h3d_*`, migraciones `20261101090000` y `20261101150000` con `h3d_lounge`, desde la versión viva de `org_settings_schema()` con candado md5) y por pieza (`height3d`); zonas grandes como marcas en el piso. Luz clara en el 3D.
- **Mantel y sillas:** el color de la mesa es el del mantel (+ tipo/tela); sillas con tipo y color; un conjunto se cambia entero. Arreglo: el 3D pintaba las mesas de gris fijo.
- **Lista de materiales (L1 simple):** `components/materials/`, `lib/materials.ts`. Por tipo + variante, m² y metros, origen propio/tercero con nota o proveedor del catálogo (`inventarios.providers`, solo lectura), comparar versiones, subtotales, avisos, export PDF/Excel (todo, propio, terceros o por proveedor). Sugerencias por org con `public.layout_vocab(org)` (migración `20261101120000`, solo lectura). Tipo de pieza explícito (`pieceType`) y nombre de color (`colorName`). L2–L5 en espera.
- **Editar curvas, polígonos y muros con el mouse** (`components/canvas/VertexEditor.tsx`): vértices, manijas de curvas libres y punto medio de arcos; deshacer en un paso.

**Pruebas:** tests (140 en Layout, 119 en Administración), build y lint en verde. La sesión del navegador fue la cuenta de Javier en JBD: en la app solo se miró o se usaron planos nuevos sin guardar; lo que escribe datos se probó con páginas locales que montan los módulos reales.

**Después, con las decisiones de Javier:**
- Capa y tipo, **opción C**: piezas nuevas con el color de su capa, leyenda por capas, "Categoría" fuera de Propiedades; botón "Aplicar colores por capa" en Capas (respeta colores a mano y lo bloqueado, deshacer en un paso, nunca automático). Ningún plano existente cambió.
- Curvas: doble clic en un lado agrega un vértice; Suprimir quita el elegido. Arreglo: los controles quedaban en el lugar viejo después de quitar un vértice.
- `frontend/AGENTS.md` alineado con `REGLAS.md` (manda REGLAS; actualizar bitácora y estado es esperado).
- Tests: 147 en Layout. Probado en la app con un plano nuevo sin guardar.

**Pendiente:**
- Repetir en QA con sesión: recorte del fondo de punta a punta y la tarjeta de Administración.

