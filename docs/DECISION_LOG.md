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
