# SYSTEM STATE
## RN Layout Engine

---

# LAST UPDATED
2026-05-23 — SESSION-0013 (Mobile Stability & Responsive Pass)

---

# REPOSITORY

| Property | Value |
|---|---|
| Repo | `rn-layout-engine` |
| Active development branch | `feat/vite-migration` |
| Governance branch | `main` |
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
│   ├── App.tsx             — Application shell
│   ├── index.css           — Global styles
│   ├── components/
│   │   ├── LayoutEditor.tsx        — Column layout: DrawingToolbar → panels row → FooterLegend
│   │   ├── DrawingToolbar.tsx      — Tool selector + "Exportar Plano" button
│   │   ├── FooterLegend.tsx        — CAD-style title block (9 editable metadata fields)
│   │   ├── canvas/
│   │   │   └── LayoutCanvas.tsx    — Konva Stage; exposes exportPNG via forwardRef
│   │   └── panels/
│   │       ├── AssetLibraryPanel.tsx   — 34 assets across 6 categories
│   │       ├── PropertiesPanel.tsx     — Element + drawing properties + color controls
│   │       └── LegendPanel.tsx         — Category color legend
│   ├── hooks/
│   │   └── useCanvasState.ts       — Canvas + drawing + metadata state
│   └── types/
│       └── layout.ts               — LayoutElement, DrawingPrimitive, LayoutMeta, etc.
```

---

# BRANCH STATE

| Branch | State | Notes |
|---|---|---|
| `feat/vite-migration` | Locally validated — NOT yet merged | All SESSION-0009 through SESSION-0012 work lives here |
| `main` | Pre-migration Next.js scaffold | Last stable baseline; untouched since SESSION-0009 |

**Merge hold:** Do not merge `feat/vite-migration` → `main` until deployment target is confirmed and production smoke test passes. See RISK-0014.

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
| 34 operational assets in library | ✅ |
| TypeScript 0 errors | ✅ |
| `#root` height chain — `h-full` resolves to full viewport | ✅ |
| `canvas { touch-action: none }` — prevents native scroll/pinch on canvas | ✅ |
| Touch pan (single finger) on Konva Stage | ✅ |
| Pinch-to-zoom (two finger) on Konva Stage | ✅ |
| Mobile panel toggles (☰ Library, ⊟ Properties) | ✅ (TypeScript clean, device test pending) |
| Panels hidden on mobile by default, canvas fills full width | ✅ |
| Panel overlay with backdrop tap-to-dismiss | ✅ |
| FooterLegend scrollable on narrow viewports | ✅ |

---

# DEPLOYMENT (PENDING)

Vite produces a static SPA: `frontend/dist/`. No deployment target is configured yet.

**Recommended:** Vercel
- Connect `rn-layout-engine` repository
- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `dist/`
- Auto-deploy on push to `main`

See RISK-0014.

---

# ROLLBACK STRATEGY

```bash
# Rollback to pre-migration checkpoint (before SESSION-0009)
git reset --hard a89787a
git push origin feat/vite-migration --force

# OR: main branch still holds the pre-migration Next.js scaffold untouched
git checkout main
```

---

# NEXT PRIORITIES

1. **Manual office testing** — validate exported plans, interaction stability, color controls (SESSION-0012 deliverable)
2. **Confirm deployment target** — Vercel / Render Static / CDN for `frontend/dist/` (closes RISK-0014)
3. **Merge `feat/vite-migration` → `main`** — after production smoke test passes on chosen host
4. **SESSION-0013 options:** Grid snapping, background image upload, layout save/load (browser localStorage), or direct Vercel deployment
