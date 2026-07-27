# DEPLOYMENT
## RN Layout Engine

---

# LAST UPDATED
2026-07-27 — Corrected again: deploy IS automatic on push to `main` — the GitHub↔Vercel webhook that was broken on 2026-07-08 is firing again. Confirmed on commit `d82cc6c`: `gh api repos/.../commits/d82cc6c/status` returns Vercel `"state":"success"` ("Deployment has completed"), and the live site's `last-modified` matches the deploy window minutes after `git push`, with `x-vercel-cache: MISS` right after. See "DEPLOYMENT WORKFLOW" below — manual `vercel --prod` is no longer the only path, keep it only as a fallback.
2026-07-08 — Corrected: deploy is MANUAL (`vercel --prod`), not auto-deploy on push. See "DEPLOYMENT WORKFLOW" below. **Superseded 2026-07-27 — see above.**
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
| GitHub connection | Connected and firing — auto-deploys on push to `main` (re-confirmed 2026-07-27, see below) |
| Production branch | `main` — pushing here deploys automatically |
| Deployment protection | Enabled — raw deployment URLs require auth; aliases bypass |
| Production URL | https://rn-layout-engine.vercel.app |
| Current production deployment | auto-deployed from `d82cc6c` (git push, 2026-07-27) |

**Deploy is AUTOMATIC on push to `main` — re-corrected 2026-07-27.** Between 2026-07-08 and 2026-07-27 the GitHub↔Vercel webhook for this project was broken (see the now-superseded note below), so every "production" update in that window had to be pushed manually via `vercel --prod`. That's fixed now — evidence from commit `d82cc6c`: `gh api repos/Events-Operating-System/rn-layout-engine/commits/d82cc6c/status` returns a real Vercel `"state":"success"` ("Deployment has completed"), and `curl -sI https://rn-layout-engine.vercel.app/` showed a fresh `last-modified` (minutes after the push) with `x-vercel-cache: MISS`. **Do not assume this can't regress again** — it broke silently once already. Whenever "did the deploy land" matters, re-run the same two checks (`gh api .../status` + `curl -sI` against the live site) rather than trusting either the CLI or "it's supposed to auto-deploy" alone. If you ever see `total_count: 0` on `.../check-runs` for a fresh push again, fall back to manual `vercel --prod` (see "DEPLOYMENT WORKFLOW" below) and update this doc back to MANUAL.

<details>
<summary>Superseded 2026-07-08 note (kept for history — do not follow, see above)</summary>

Deploy was MANUAL, not automatic, from 2026-07-08 until the fix confirmed 2026-07-27. Evidence at the time: `gh api repos/Events-Operating-System/rn-layout-engine/commits/<sha>/check-runs` and `.../status` returned `total_count: 0` for every commit checked, including ones from weeks earlier that were already confirmed live in production — meaning those "production" updates were pushed manually via `vercel --prod` CLI, never by a GitHub webhook.

</details>

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
| `main` | Production | https://rn-layout-engine.vercel.app | Current production branch — auto-deploys on push (see DEPLOYMENT WORKFLOW above) |
| Any other branch | Preview | auto-generated URL | Temporary, may require auth |

`feat/vite-migration` (the branch this table used to point at as "current production branch") was merged to `main` long ago — this row was stale, corrected 2026-07-27.

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

## Automatic deploy (current, primary method — confirmed 2026-07-27)

```bash
git add <files>
git commit -m "message"
git push origin main   # this alone triggers a production deploy
```

Vercel picks up the push via its GitHub integration and deploys automatically — no `vercel --prod` needed. Confirm it actually landed (don't just assume — this webhook was silently broken once already, 2026-07-08 to 2026-07-27):

```bash
gh api repos/Events-Operating-System/rn-layout-engine/commits/<sha>/status
# expect a Vercel entry with "state":"success" / "Deployment has completed"

curl -sI https://rn-layout-engine.vercel.app/ | grep -i last-modified
# should match the deploy time, a few minutes after the push
```

If `gh api .../status` comes back without a Vercel entry (or `check-runs` returns `total_count: 0`) for a fresh push, the webhook has broken again — fall back to the manual deploy below and update this doc back to MANUAL.

## Manual deploy (fallback only — use if auto-deploy stops firing)

```bash
# from the repo root (not frontend/ — see linking note below):
cd /path/to/rn-layout-engine
vercel --prod
# → builds, deploys, and re-aliases https://rn-layout-engine.vercel.app automatically
```

**Linking:** don't hand-create `frontend/.vercel/project.json` — that old per-directory link format pointed at the deprecated `frontend` project and was the source of a previous "do not run vercel --prod from frontend/" warning in this doc. Instead, link the repo root once with the repo-aware format, which correctly targets the `frontend` subdirectory for the build while keeping the link file at the repo root (gitignored, not committed):

```bash
cd /path/to/rn-layout-engine
vercel link --yes --project prj_3FI1KiHhe03aL3YuzpdSjDCGteVY
# creates .vercel/repo.json at repo root with "directory": "frontend" — correct project, correct build context
vercel --prod   # run from repo root after linking
```

Verify a deploy actually landed (don't trust the CLI output alone — confirm against the live site):

```bash
curl -sI https://rn-layout-engine.vercel.app/ | grep -i last-modified   # should match deploy time, x-vercel-cache should read MISS right after
```

## Emergency: Vercel dashboard

If the CLI is unavailable, use the Vercel dashboard "Redeploy" on a known-good deployment, or promote an existing one to production directly (`vercel.com/javier-bambaren-d-s-projects/rn-layout-engine` → deployment → "..." → "Promote to Production").

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
