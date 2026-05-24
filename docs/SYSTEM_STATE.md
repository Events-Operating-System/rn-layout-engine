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

1. **Push to main** — `git push origin main` → auto-deploy fires → verify on desktop + iPhone Safari (includes SESSION-0015 + SESSION-0016)
2. **Office testing** — validate UX Pass v1 + v2 features with real team, exported plans, interaction stability
3. **Layout persistence** (RISK-0015) — localStorage save/load is next engineering priority after office testing
4. **Delete or archive `frontend` Vercel project** — debugging artifact. See RISK-0020.
5. **Remaining feature candidates:** Touch drawing support (RISK-0017), background image upload, "fit all" zoom
