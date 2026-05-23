# SYSTEM STATE
## RN Layout Engine

---

# LAST UPDATED
2026-05-23 — Deployment audit and stabilization pass

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

| Branch | Tip commit | State | Notes |
|---|---|---|---|
| `feat/vite-migration` | `dcc8782` | **Production** — deployed, iPhone confirmed | All SESSION-0009 through SESSION-0014 work. Local = remote = deployed. |
| `main` | `0e8d4c` | Governance placeholder | Only 2 initial commits — NO SESSION work. Empty. |

**Merge status:** `feat/vite-migration` is ready to merge to `main`. All blockers resolved: deployment confirmed live, iPhone Safari confirmed working, no uncommitted local changes. Merge is the next governance step — see NEXT PRIORITIES.

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
| Mobile panel toggles (☰ Library, ⊟ Properties) | ✅ confirmed on iPhone Safari |
| Panels hidden on mobile by default, canvas fills full width | ✅ confirmed on iPhone Safari |
| Panel overlay with backdrop tap-to-dismiss | ✅ |
| FooterLegend scrollable on narrow viewports | ✅ |
| Canvas renders on iPhone Safari (DPR=3, iOS Safari) | ✅ confirmed on device |
| Konva pixelRatio capped at 2 (canvas memory ≤ ~12.5 MB on DPR=3) | ✅ |
| Stage deferred until ResizeObserver fires (no premature 800×600 canvas) | ✅ |

---

# DEPLOYMENT

**Status:** LIVE — auto-deployed 2026-05-23, iPhone Safari confirmed

| Property | Value |
|---|---|
| Provider | Vercel |
| **Canonical production URL** | **https://rn-layout-engine.vercel.app** |
| Canonical Vercel project | `javier-bambaren-d-s-projects/rn-layout-engine` |
| Current production deployment | `dpl_ECiEZBLC4MLtqkCfqER4ZrNWwZxf` (auto-deployed from `feat/vite-migration`) |
| Production branch | `feat/vite-migration` (update to `main` after merge) |
| Auto-deploy | **Active** — push to `feat/vite-migration` triggers production deploy |
| Deployment Protection | Enabled — per-hash URLs require auth; alias URL does not |
| Secondary URL (deprecated) | https://frontend-eta-five-50.vercel.app — correct code, manual-deploy only |

See DEPLOYMENT.md for full project details, mobile fix documentation, and rules.
See RISK-0020 for two-project governance risk.

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

1. **Merge `feat/vite-migration` → `main`** — iPhone confirmed, Vercel confirmed, no remaining blockers
2. **Update Vercel `rn-layout-engine` production branch** from `feat/vite-migration` to `main` (Vercel dashboard) — after merge
3. **Delete or archive `frontend` Vercel project** — it is a debugging artifact, no longer needed
4. **Office testing** — validate exported plans, interaction stability, color controls with real team
5. **Next feature candidates:** Grid snapping, layout save/load (localStorage), background image upload, touch drawing support (RISK-0017)
