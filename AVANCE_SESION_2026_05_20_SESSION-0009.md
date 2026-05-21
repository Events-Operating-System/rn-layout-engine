# AVANCE SESIÓN — 2026-05-20
## SESSION-0009 — RN Layout Engine: Next.js → Vite Migration

**Operator:** JBD & Claude
**Repository:** `rn-layout-engine`
**Branch:** `feat/vite-migration`
**Status:** LOCALLY VALIDATED — merge to `main` pending deployment confirmation (RISK-0014)

---

## 1. Context & Migration Rationale

The RN Layout Engine frontend was initially scaffolded on Next.js 15 (App Router). Two structural blockers made Next.js wrong for this use case:

**Blocker 1 — SSR incompatibility with Konva.**
Konva requires `window` and `document` at module load time. Next.js server-renders components by default. Every canvas component required a `next/dynamic` wrapper with `ssr: false` to avoid crashes. This is a workaround that grows brittle as the component tree expands.

**Blocker 2 — Wrong tool for the problem.**
The Layout Engine is a single-page canvas application with no routing, no server components, no data fetching, and no SEO requirements. Next.js App Router adds a multi-layer build pipeline designed for document-centric apps. Every Next.js-specific concept (`layout.tsx`, `page.tsx`, `'use client'`, `next/dynamic`) was pure overhead.

**Decision:** Migrate to Vite. See DEC-0019.

---

## 2. Pre-Migration Rollback Checkpoint

Before any migration code was written:

```
commit a89787a — checkpoint: pre-migration snapshot — Next.js scaffold + initial Konva source
```

This commit is the complete rollback point. It contains the full Next.js setup and all Konva source files untouched. Recovery:

```bash
git reset --hard a89787a
git push origin feat/vite-migration --force
# OR: main branch still holds the pre-migration Next.js scaffold
```

---

## 3. Migration Delivered — commit `40ba052`

**Zero canvas logic changes.** All Konva components, hooks, and types are byte-for-byte identical to the checkpoint commit.

### Files Added
| File | Purpose |
|---|---|
| `frontend/vite.config.ts` | Vite config: `@vitejs/plugin-react`, `@tailwindcss/vite`; `@/` → `./src` path alias |
| `frontend/index.html` | Vite SPA entry — mounts `<div id="root">` |
| `frontend/src/main.tsx` | React root: `createRoot(document.getElementById('root')).render(<App />)` |
| `frontend/src/App.tsx` | Page shell extracted from `app/page.tsx` — no Next.js imports |
| `frontend/src/index.css` | Global styles; Geist font variables removed, all other styles preserved |

### Files Modified
| File | Change |
|---|---|
| `frontend/package.json` | Removed: `next`. Added: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` |
| `frontend/src/components/LayoutEditor.tsx` | Removed `next/dynamic` — replaced with direct `import` |
| `frontend/tsconfig.json` | Stripped Next.js plugin + `.next/` includes; added `allowImportingTsExtensions` |
| `frontend/eslint.config.mjs` | Removed `eslint-config-next` |
| `frontend/.gitignore` | Added `dist/` for Vite build output |
| `frontend/AGENTS.md` | Updated: Vite stack + operational governance principles |

### Files Deleted
| File | Reason |
|---|---|
| `frontend/next.config.ts` | Next.js configuration — no longer applicable |
| `frontend/postcss.config.mjs` | Replaced by `@tailwindcss/vite` plugin (no PostCSS layer needed) |
| `frontend/src/app/` | Next.js App Router directory: `layout.tsx`, `page.tsx`, `favicon.ico` |

### Files Untouched (canvas logic preserved exactly)
- `frontend/src/components/canvas/` — all Konva canvas components
- `frontend/src/components/panels/` — all UI panel components
- `frontend/src/hooks/useCanvasState.ts` — canvas state management
- `frontend/src/types/` — all TypeScript type definitions

---

## 4. Local Validation — PASSED (2026-05-20)

### Startup
| Command | Result |
|---|---|
| `npm install` | Clean — no peer conflicts |
| `npm run dev` | Vite dev server starts, zero compilation errors |

### Canvas Behavior
| Behavior | Result |
|---|---|
| Canvas renders without freeze | ✅ |
| Zoom (wheel event on Stage) | ✅ |
| Pan (drag on Stage background) | ✅ |
| Object drag | ✅ |
| Transformer handles (resize / rotate) | ✅ |
| No SSR errors | ✅ |
| No hydration mismatch warnings | ✅ |

### Post-Validation
- `frontend/package-lock.json` updated and committed to `feat/vite-migration`

---

## 5. Decisions Made This Session

| ID | Decision | Status |
|---|---|---|
| DEC-0019 | Migrate frontend from Next.js to Vite | ACTIVE |
| DEC-0020 | Retain Konva as the browser-native canvas engine | ACTIVE |

See `docs/DECISION_LOG.md` for full rationale.

---

## 6. Branch State

| Branch | State | Notes |
|---|---|---|
| `feat/vite-migration` | Locally validated | Source of truth for all SESSION-0009 work |
| `main` | Pre-migration Next.js scaffold | Last known good — untouched during this session |

---

## 7. Infrastructure Impact

| Concern | Assessment |
|---|---|
| EventOS backend (`RealityNearProject`) | **Zero impact** — separate repo, separate deployment |
| Render (EventOS backend) | **Unaffected** — deploys `feat-google-drive` of the backend only |
| Layout Engine hosting | **Pending** — Vite output is `dist/` (static SPA); deployment target not yet confirmed (RISK-0014) |
| Recommended host | Vercel: connect `rn-layout-engine`, root dir = `frontend/`, auto-deploy on `main` push |

---

## 8. Open Items & Next Milestone

### Immediate
- Confirm deployment target for `frontend/dist/` (closes RISK-0014)
- Merge `feat/vite-migration` → `main` after production smoke test

### Next Recommended Milestone
**SESSION-0010 — Layout Engine: First Canvas Feature**
Prerequisites: `feat/vite-migration` merged to `main`, deployment target confirmed and live.
Scope: element creation (add shape/text to canvas) + property panel wiring to selected Konva node.
