# SYSTEM STATE
## RN Layout Engine

---

# LAST UPDATED
2026-05-24 — SESSION-0016: Operational UX Pass v2 committed, pending push (includes SESSION-0015)

---

# REPOSITORY

| Property | Value |
|---|---|
| Repo | `rn-layout-engine` |
| GitHub default branch | `main` |
| Active development branch | `main` |
| Legacy branch | `feat/vite-migration` — merged, kept for reference only |
| Related repo | `RealityNearProject` (EventOS backend — separate, independent) |

---

# FRONTEND STACK

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite | 6 |
| Framework | React | 19 |
| Language | TypeScript | 5 |
| Canvas engine | Konva / react-konva | 10 |
| Styling | Tailwind CSS | 4 (via `@tailwindcss/vite`) |
| Linting | ESLint | 9 |

**Note:** Next.js was removed in SESSION-0009 (DEC-0019). Do not re-introduce Next.js or any SSR framework into this frontend.

---

# FRONTEND STRUCTURE

```
frontend/
├── index.html              — Vite SPA entry point
├── vite.config.ts          — Build config (react plugin, tailwindcss plugin, @/ alias)
├── tsconfig.json
├── src/
│   ├── main.tsx            — React root mount
│   ├── App.tsx             — Application shell + LangProvider + EN/ES toggle
│   ├── index.css           — Global styles
│   ├── context/
│   │   └── LangContext.tsx     — EN/ES language context, string catalog, useLang() hook
│   ├── components/
│   │   ├── LayoutEditor.tsx        — Column layout: DrawingToolbar → panels row → FooterLegend
│   │   ├── DrawingToolbar.tsx      — Tool selector + undo/redo + export button (translated)
│   │   ├── FooterLegend.tsx        — CAD-style title block; branding: EventOS Layout / powered by / {company}
│   │   ├── canvas/
│   │   │   └── LayoutCanvas.tsx    — Konva Stage; exposes exportPNG via forwardRef
│   │   └── panels/
│   │       ├── AssetLibraryPanel.tsx   — 40 assets across 7 categories (incl. Shapes); EN/ES asset names
│   │       ├── PropertiesPanel.tsx     — Element + drawing properties + delete/duplicate
│   │       └── LegendPanel.tsx         — Category color legend
│   ├── hooks/
│   │   └── useCanvasState.ts       — Canvas + drawing + metadata state + undo/redo (50-step history)
│   └── types/
│       └── layout.ts               — LayoutElement, DrawingPrimitive, LayoutMeta, etc.
```

---

# BRANCH STATE

| Branch | Tip commit | State | Notes |
|---|---|---|---|
| `main` | `42c0a25` | **Committed locally, pending push** — SESSION-0015 + SESSION-0016 | UX Pass v1 + v2: 15 features + undo/redo + i18n + guides. Push triggers auto-deploy. |
| `feat/vite-migration` | `cb48499` | Legacy — merged, preserved for reference | Behind main. Safe to delete after office testing. |

**Merge status:** Complete. `feat/vite-migration` merged into `main` 2026-05-23. `main` is now canonical production branch. Auto-deploy confirmed healthy — push to `main` → `rn-layout-engine.vercel.app` updates automatically.

---

# VALIDATED BEHAVIORS (local, 2026-05-23)

| Behavior | Status |
|---|---|
| `npm install` clean | ✅ |
| `npm run dev` starts Vite | ✅ |
| Canvas renders without freeze | ✅ |
| Zoom (wheel event) | ✅ |
| Pan (drag on Stage) — isolated from element drag | ✅ |
| Object drag — no accidental stage pan during asset drag | ✅ |
| Transformer handles (resize / rotate) | ✅ |
| No SSR errors | ✅ |
| Asset placement (click in library → element added to canvas) | ✅ |
| Element selection → Transformer + Properties panel wired | ✅ |
| Properties panel live update (x/y/w/h/rotation/name) | ✅ |
| Delete / Backspace removes selected element | ✅ |
| Delete / Backspace removes selected drawing | ✅ |
| Round tables render as circles | ✅ |
| New assets spawn near visible viewport center | ✅ |
| Footer legend (9 metadata fields, editable inline) | ✅ |
| Line / Arrow drawing tools | ✅ |
| Text annotation | ✅ |
| Drawing selection (click to select in pointer mode) | ✅ |
| Drawing color change via Properties panel | ✅ |
| Drawing opacity via Properties panel | ✅ |
| Element color change via preset swatches | ✅ |
| Element opacity via slider | ✅ |
| Export PNG ("Exportar Plano") — 2x resolution, footer included | ✅ |
| Export PDF — elementos alineados 1:1 con el canvas, incl. elementos rotados (fix: pivote de rotación en export igualado al de Konva, antes rotaba sobre el centro en vez de la esquina superior-izquierda) | ✅ |
| Export PDF — drawings (líneas, flechas, anotaciones de texto) incluidos en el PDF, alineados con el canvas y con bounding box del crop automático (antes exportPDF solo iteraba `elements`; drawings desaparecían del PDF aunque sí se veían en pantalla) | ✅ (verificado por análisis de código/geometría; pendiente de confirmación visual en app real con sesión autenticada) |
| 34 operational assets in library | ✅ |
| Modo Selección (default) vs Modo Mano — dos modos explícitos y mutuamente excluyentes en la toolbar (patrón Figma/Miro): en Selección, click-arrastre en área vacía dibuja un rectángulo de marquee-select y selecciona todo lo que intersecta al soltar; en Mano, click-arrastre desde cualquier punto (vacío o sobre un elemento) siempre hace pan, sin seleccionar ni mover elementos | ✅ verificado end-to-end en navegador real (Playwright + mocks de Supabase) |
| Shift+click agrega/quita un elemento de la selección actual (multi-select acumulativo) | ✅ verificado end-to-end |
| Barra espaciadora mantenida activa Modo Mano temporalmente desde cualquier herramienta (incluida Selección); al soltar, vuelve al modo/herramienta anterior sin alterar el estado persistido | ✅ verificado end-to-end (incl. indicador de modo en la toolbar) |
| Click en área vacía sin arrastrar deselecciona todo (Modo Selección); en Modo Mano nunca selecciona ni deselecciona | ✅ verificado end-to-end |
| Selección múltiple: estado canónico `selectedIds: Set<string>` en `useCanvasState`; `selectedId`/`selectedElement` quedan derivados (no-null solo si `selectedIds.size===1`) para no romper Properties panel, Transformer, Ctrl+D ni Delete | ✅ |
| Mover en bloque — con `selectedIds.size > 1`, arrastrar cualquier elemento de la selección mueve todo el grupo preservando posiciones relativas (drag imperativo de los nodos Konva hermanos vía `stage.findOne` durante el gesto, commit único a estado al soltar); con 1 solo elemento, comportamiento sin cambios | ✅ verificado end-to-end |
| Copiar en bloque (Ctrl+D) — con `selectedIds.size > 1`, duplica todo el grupo manteniendo la disposición relativa (+2m offset, igual que el caso simple) y dej las copias nuevas como selección activa, listas para mover de inmediato; con 1 solo elemento, comportamiento sin cambios | ✅ verificado end-to-end |
| Eliminar en bloque (Delete/Backspace) — con `selectedIds.size > 1`, borra todo el grupo en una sola operación; con 1 solo elemento, comportamiento sin cambios | ✅ verificado end-to-end |
| Undo/redo de operaciones en bloque — mover, copiar y eliminar en bloque quedan como UNA sola entrada de historial (un solo Ctrl+Z restaura todo el grupo afectado) | ✅ verificado end-to-end (`useCanvasState.updateElements/deleteElements/duplicateElements`, un solo `pushHistory()` por operación) |
| Z-order (Traer al frente / Enviar al fondo) — botones en Properties Panel (selección simple y múltiple); el orden de renderizado es simplemente el orden del array `elements` (usado tal cual por el Layer de Konva y por el loop de exportPDF), así que reordenar el array reordena canvas + PDF a la vez y persiste automáticamente al guardar (mismo JSON). Con selección múltiple, el grupo se mueve al frente/fondo preservando su orden relativo interno (`bringToFront`/`sendToBack` en `useCanvasState`) | ✅ verificado end-to-end (persistencia confirmada guardando y recargando vía `/editor/:id`) |
| Tamaño de fuente ajustable en anotaciones de texto — campo numérico en Properties Panel (`DrawingPrimitive.fontSize`, default 14px); se refleja de inmediato en el canvas (prop `fontSize` de `Konva.Text`) y en el PDF exportado (mismo pipeline de `exportPDF`, ya no hardcodea 14px) | ✅ verificado end-to-end (bbox del texto exportado escala proporcionalmente al fontSize) |
| Voltear horizontal / vertical (flip) para elementos de la librería de assets — botones en Properties Panel; `LayoutElement.flipX`/`flipY` controlan un Group interno anidado (offsetX/Y = ancho/alto + scaleX/Y = -1) separado del Group externo que maneja drag/rotate/resize, evitando que el flip se mezcle con el scale que usa el Transformer al redimensionar. Funciona sobre elementos rotados sin desalinear el pivote (bounding box idéntico antes/después del flip); reflejado en export PDF con la misma matemática vía `ctx.translate`+`ctx.scale` | ✅ verificado end-to-end (bbox en canvas y silueta en PDF idénticos antes/después de flip H+V sobre un elemento rotado 45°) |
| TypeScript 0 errors | ✅ |
| `#root` height chain — `h-full` resolves to full viewport | ✅ |
| `canvas { touch-action: none }` — prevents native scroll/pinch on canvas | ✅ |
| Touch pan (single finger) on Konva Stage | ✅ |
| Pinch-to-zoom (two finger) on Konva Stage | ✅ |
| Mobile panel toggles (☰ Library, ⊟ Properties) | ✅ confirmed on iPhone Safari |
| Panels hidden on mobile by default, canvas fills full width | ✅ confirmed on iPhone Safari |
| Panel overlay with backdrop tap-to-dismiss | ✅ |
| FooterLegend scrollable on narrow viewports | ✅ |
| Canvas renders on iPhone Safari (DPR=3, iOS Safari) | ✅ confirmed on device |
| Konva pixelRatio capped at 2 (canvas memory ≤ ~12.5 MB on DPR=3) | ✅ |
| Stage deferred until ResizeObserver fires (no premature 800×600 canvas) | ✅ |
| Duplicar layout (dashboard y editor) — crea registro nuevo e independiente, copia elements/drawings/meta/viewport, `parent_layout_id` → original, `version_number`=1, `name`="{original} (copia)", NO hereda `event_id`, redirige al editor del duplicado | ✅ (verificado por análisis de código; pendiente de confirmación visual en app real con sesión autenticada — requiere migración SQL aplicada primero, ver `supabase/migrations/`) |
| Guardar como copia (editor) — fork desde el ESTADO ACTUAL del canvas (incluye cambios no guardados), no desde el último guardado en DB; el original nunca se modifica | ✅ (mismo pendiente de confirmación visual que arriba) |
| "Carpeta de cliente" — NO existe como concepto en este repo (dashboard es lista plana por `org_id`; `cliente` es solo texto libre en `LayoutMeta`, sin FK ni agrupador). Ver DECISION_LOG / sesión 2026-07-02 | N/A — reportado, no construido |

---

# DEPLOYMENT

**Status:** LIVE — auto-deployed 2026-05-23, iPhone Safari confirmed, pipeline healthy

| Property | Value |
|---|---|
| Provider | Vercel |
| **Canonical production URL** | **https://rn-layout-engine.vercel.app** |
| Canonical Vercel project | `javier-bambaren-d-s-projects/rn-layout-engine` |
| Current production deployment | `dpl_YysFxVbt3wdEYVGGqW3FpV3QKXAY` (auto-deployed from `main`) |
| Production branch | `main` |
| Auto-deploy | **Active** — push to `main` triggers production deploy |
| Deployment Protection | Enabled — per-hash URLs require auth; alias URL does not |
| Legacy Vercel project (do not use) | https://frontend-eta-five-50.vercel.app — temporary debug artifact, manual-deploy only, pending deletion |

See DEPLOYMENT.md for full project details, mobile fix documentation, and rules.
See RISK-0020 for two-project governance risk.

---

# ROLLBACK STRATEGY

```bash
# Roll back via Vercel dashboard (preferred — no force push):
# Go to: vercel.com/javier-bambaren-d-s-projects/rn-layout-engine
# Find a previous "Ready" deployment → click "..." → "Promote to Production"

# Roll back via git revert (re-triggers auto-deploy cleanly):
git revert <commit-hash>
git push origin main
```

**WARNING:** Do NOT `git reset --hard` on `main` and force-push — this is the production branch and will discard commits. Use `git revert` instead.

See DEPLOYMENT.md rollback table for commit-level safety ratings.

---

# NEXT PRIORITIES

0. **⚠️ Ejecutar migración SQL pendiente** — `supabase/migrations/20260702000000_layout_duplication.sql` (agrega `parent_layout_id` + `version_number` a `layouts`). Sin esta migración, "Duplicar" y "Guardar como copia" fallarán en producción. No se ejecutó automáticamente — no hay acceso de service-role/CLI desde este entorno de agente.
1. **Push to main** — `git push origin main` → auto-deploy fires → verify on desktop + iPhone Safari (includes SESSION-0015 + SESSION-0016)
2. **Office testing** — validate UX Pass v1 + v2 features with real team, exported plans, interaction stability
3. **Layout persistence** (RISK-0015) — localStorage save/load is next engineering priority after office testing
4. **Delete or archive `frontend` Vercel project** — debugging artifact. See RISK-0020.
5. **Remaining feature candidates:** Touch drawing support (RISK-0017), background image upload, "fit all" zoom
