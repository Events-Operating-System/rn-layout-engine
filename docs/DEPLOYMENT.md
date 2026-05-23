# DEPLOYMENT
## RN Layout Engine

---

# LAST UPDATED
2026-05-23 — Pipeline repair: removed invalid rootDirectory from vercel.json, auto-deploy confirmed healthy on main

---

# CANONICAL PRODUCTION URL

**https://rn-layout-engine.vercel.app**

This is the single production URL. Use it for sharing, QA, and all external references.
Do NOT create new aliases. Do NOT use per-hash deployment URLs (`*-javier-bambaren-d-s-projects.vercel.app`) as stable links — they are ephemeral and may require authentication.

---

# VERCEL PROJECTS — TWO EXIST, ONE IS CANONICAL

Two Vercel projects were created during development. Both currently serve the correct iPhone fix. Only `rn-layout-engine` should be used going forward.

## `rn-layout-engine` — CANONICAL ✅

| Property | Value |
|---|---|
| Vercel project ID | `prj_3FI1KiHhe03aL3YuzpdSjDCGteVY` |
| Project name | `rn-layout-engine` |
| Root directory | `frontend` |
| Framework | Vite |
| GitHub connection | **Connected** — `Events-Operating-System/rn-layout-engine` |
| Production branch | `main` |
| Deployment protection | Enabled — raw deployment URLs require auth; aliases bypass |
| Production URL | https://rn-layout-engine.vercel.app |
| Current production deployment | `dpl_YysFxVbt3wdEYVGGqW3FpV3QKXAY` (`5h6qjdlbm-...`) |

Auto-deploy behavior:
- Push to `main` (production branch) → production deploy → `rn-layout-engine.vercel.app` updated automatically
- Push to other branches → preview deploy → temporary URL

## `frontend` — DEPRECATED (debugging artifact, do not use)

| Property | Value |
|---|---|
| Vercel project ID | `prj_C5ILNi9aCuQZgqTYqxDtWoOMQSZi` |
| Project name | `frontend` |
| GitHub connection | **None** — manual deploys only |
| Deployment protection | Disabled |
| Production URL | https://frontend-eta-five-50.vercel.app |
| Current production deployment | `dpl_FfRVvi8qVg8NYk1wunx4s75zu713` (`frontend-6o0rrn6xc-...`) |

This project was created during SESSION-0013/SESSION-0014 debugging. It has the correct fix deployed but requires manual `vercel --prod` to update. Do not deploy to it going forward. It may be deleted once `rn-layout-engine.vercel.app` is confirmed stable.

---

# REPOSITORY STRUCTURE

```
rn-layout-engine/              ← GitHub repo root (Events-Operating-System/rn-layout-engine)
├── vercel.json                ← Vercel build config hint (rootDirectory: frontend)
├── frontend/                  ← Vite SPA — what Vercel builds
│   ├── package.json
│   ├── vite.config.ts         — build.target: ['es2020', 'safari15']
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css          — #root { height: 100% }, canvas { touch-action: none }
│   │   └── components/canvas/LayoutCanvas.tsx  — containerSize=null, pixelRatio cap
│   └── .vercel/project.json   — links CLI to the `frontend` project (deprecated)
└── docs/
```

The `rn-layout-engine` Vercel project has `rootDirectory: frontend` set in its project settings. Vercel reads from `frontend/` for all builds.

---

# BRANCH → DEPLOYMENT MAPPING

| Branch | Environment | URL | Notes |
|---|---|---|---|
| `feat/vite-migration` | Production | https://rn-layout-engine.vercel.app | Current production branch |
| `main` | — | — | Empty — only 2 initial commits, no SESSION work |
| Any other branch | Preview | auto-generated URL | Temporary, may require auth |

**Important:** `main` must remain the intended long-term production branch. After `feat/vite-migration` is merged to `main`, update the `rn-layout-engine` project production branch setting to `main` in the Vercel dashboard.

---

# MOBILE SAFARI FIX — DO NOT REVERT

These changes in `frontend/src/components/canvas/LayoutCanvas.tsx` fixed the iPhone Safari blank screen. They must never be reverted:

```ts
// WRONG — causes 33 MB canvas at DPR=3, blanks on iOS Safari
const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

// CORRECT — defers Stage until ResizeObserver provides real dimensions
const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
```

```tsx
// WRONG — no DPR cap; DPR=3 on iPhone 12+ creates ~33 MB total canvas
<Stage width={...} height={...}>

// CORRECT — caps canvas memory at ~12.5 MB total (safe under iOS 16 MB limit)
<Stage width={...} height={...} pixelRatio={Math.min(window.devicePixelRatio, 2)}>
```

```tsx
// WRONG — renders Stage even when containerSize is unknown
<Stage width={containerSize.width} height={containerSize.height}>

// CORRECT — Stage only rendered after ResizeObserver fires
{containerSize !== null && (
  <Stage width={containerSize.width} height={containerSize.height} ...>
)}
```

Root cause: iOS Safari enforces a ~16 MB per-page canvas memory budget. Exceeding it silently blanks canvas elements — no JS error, no console warning.

---

# DEPLOYMENT WORKFLOW

## Auto-deploy (current method — no action needed)

Every push to `main` triggers a production deploy automatically on the `rn-layout-engine` Vercel project.

```bash
git add <files>
git commit -m "message"
git push origin main
# Vercel builds and deploys automatically — rn-layout-engine.vercel.app updates
```

## Emergency manual deploy

If auto-deploy is unavailable and the `rn-layout-engine` project must be updated manually:

```bash
cd frontend/

# Requires being linked to rn-layout-engine project (currently links to `frontend` project)
# Better: use Vercel dashboard "Redeploy" on a known-good deployment
```

Do NOT run `vercel --prod` from `frontend/` — the `.vercel/project.json` inside `frontend/` links to the deprecated `frontend` project, not `rn-layout-engine`.

---

# ROLLBACK

```bash
# Roll back rn-layout-engine.vercel.app via Vercel dashboard:
# Go to: vercel.com/javier-bambaren-d-s-projects/rn-layout-engine
# Find a previous "Ready" deployment → click "..." → "Promote to Production"

# Roll back via git (re-triggers auto-deploy):
git revert <commit-hash>
git push origin main
```

**Key safe points:**

| Commit | Description | Safe to roll back to? |
|---|---|---|
| `cc26b22` | Remove invalid rootDirectory from vercel.json — pipeline repair (current) | ✅ |
| `3b08897` | Merge feat/vite-migration → main | ✅ |
| `dcc8782` | Add vercel.json + DEPLOYMENT.md | ✅ |
| `b88d210` | Remove debug overlays — **clean production code** | ✅ |
| `718fcfe` | SESSION-0014 DPR fix + debug overlay (has green/blue bars) | ⚠️ works but has debug bars |
| `f782c7d` | SESSION-0013 mobile pass (panels, touch, height chain) | ⚠️ missing DPR fix — blank on iPhone |
| `036b44f` | SESSION-0012 canvas MVP | ❌ blank screen on iPhone |
| `a89787a` | Pre-migration Next.js checkpoint | ❌ not deployable as static SPA |

---

# ENVIRONMENT VARIABLES

None. This is a client-only SPA with no backend calls and no secrets.

---

# BUILD OUTPUT

```
dist/index.html           ~0.58 kB
dist/assets/index-*.css   ~22 kB (gzipped ~5 kB)
dist/assets/index-*.js    ~543 kB (gzipped ~167 kB)
```

Bundle hash changes on every content change (Vite content-addressable output). The hash produced by Vercel's remote build will differ from local build — this is expected and normal. Same source code, same behavior.

---

# RULES — DO NOT VIOLATE

1. **Do NOT use `frontend-eta-five-50.vercel.app` as the canonical URL** — it is a deprecated project alias. Use `rn-layout-engine.vercel.app`.
2. **Do NOT create manual aliases** with `vercel alias set` — they create cache pollution and confusion.
3. **Do NOT revert `containerSize=null` or `pixelRatio` cap** — these fix the iPhone blank screen. See mobile fix section above.
4. **Do NOT run `vercel --prod` from `frontend/`** — that deploys to the deprecated `frontend` project.
5. **Do NOT re-enable Deployment Protection** on `rn-layout-engine` without testing on iPhone Safari first — the raw per-hash deployment URLs will return 401 on the device.
6. **Do NOT push the Safari fix** to `frontend-eta-five-50.vercel.app` or the `frontend` Vercel project — it is deprecated.
