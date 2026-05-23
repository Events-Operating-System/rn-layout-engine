# DEPLOYMENT
## RN Layout Engine

---

# LAST UPDATED
2026-05-23 — SESSION-0014

---

# PRODUCTION URL

**Stable alias:** https://frontend-eta-five-50.vercel.app

This alias is permanent. It always points to the current production deployment.
Do NOT create new temporary aliases — use this URL for sharing, testing, and QA.

---

# HOSTING

| Property | Value |
|---|---|
| Provider | Vercel |
| Project | `javier-bambaren-d-s-projects/frontend` |
| Project ID | `prj_C5ILNi9aCuQZgqTYqxDtWoOMQSZi` |
| Org | `team_0wJdaPNFeXrAmEpb1eVD1gvc` |
| Vercel user | `jbd84` |
| Deployment Protection | **Disabled** — required for iPhone/mobile access |

---

# REPOSITORY STRUCTURE

```
rn-layout-engine/          ← GitHub repo root
├── vercel.json            ← Vercel build config (rootDirectory: frontend)
├── frontend/              ← Vite SPA — this is what Vercel builds
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
└── docs/
```

The Vercel project root is `frontend/`. All build commands run inside `frontend/`.

---

# GITHUB → VERCEL AUTO-DEPLOY (SETUP REQUIRED ONCE)

Auto-deploy from `main` is not yet active. To enable it:

### One-time setup in Vercel Dashboard

1. Go to: https://vercel.com/javier-bambaren-d-s-projects/frontend/settings/git
2. Under **"Connected Git Repository"**, click **"Connect"**
3. Choose **GitHub** → authorize if prompted
4. Select org: `Events-Operating-System`
5. Select repo: `rn-layout-engine`
6. Set **Production Branch**: `main`
7. Set **Root Directory**: `frontend` (critical — the Vite app is not at repo root)
8. Click **Save**

After connecting:
- Every push to `main` → automatic production deploy → `frontend-eta-five-50.vercel.app` updated
- Every push to other branches → automatic preview deploy → temporary preview URL

### What `vercel.json` does

`vercel.json` at the repo root tells Vercel what to do when a GitHub-triggered build runs:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rootDirectory": "frontend"
}
```

This is already committed. No further changes needed after the dashboard connection.

---

# MANUAL DEPLOY (CURRENT METHOD)

Until GitHub is connected, deploy manually from the terminal:

```bash
cd frontend/

# Standard deploy (uses build cache)
vercel --prod --yes

# Force deploy (skips build cache — use after dependency changes)
vercel --prod --yes --force
```

The `frontend-eta-five-50.vercel.app` alias is automatically reassigned to the new production deployment by Vercel.

---

# BRANCH → ENVIRONMENT MAPPING

| Branch | Trigger | Environment | URL |
|---|---|---|---|
| `main` | push | Production | https://frontend-eta-five-50.vercel.app |
| any other branch | push | Preview | auto-generated temporary URL |

---

# DEPLOYMENT PROTECTION

**Status: DISABLED**

Vercel Deployment Protection was enabled on 2026-05-23 and caused all new deployment URLs to return HTTP 401 on iPhone Safari. Disabled in Project Settings → Deployment Protection.

Do NOT re-enable without first testing on iPhone Safari. When enabled, only custom domain aliases (not per-hash deployment URLs) bypass protection.

---

# ALIASES

| Alias | Points To | Purpose |
|---|---|---|
| `frontend-eta-five-50.vercel.app` | latest production deployment | **Stable production URL — use this** |
| `frontend-javier-bambaren-d-s-projects.vercel.app` | latest production deployment | Vercel auto-generated project alias |
| `frontend-jbd84-javier-bambaren-d-s-projects.vercel.app` | latest production deployment | Vercel auto-generated user alias |

**Rule:** Do NOT create new aliases manually. Only `frontend-eta-five-50.vercel.app` should be shared externally.

---

# ROLLBACK

```bash
# Option A — redeploy a previous commit
git checkout <commit-hash>
cd frontend/
vercel --prod --yes

# Option B — reset branch and redeploy
git reset --hard <commit-hash>
git push origin main --force   # only if already on main
cd frontend/
vercel --prod --yes
```

Pre-migration Next.js checkpoint (before SESSION-0009): `a89787a`

---

# ENVIRONMENT VARIABLES

None required. This is a client-only SPA with no backend calls and no secrets.

---

# BUILD OUTPUT

```
dist/index.html           ~0.58 kB
dist/assets/index-*.css   ~22 kB (gzipped ~5 kB)
dist/assets/index-*.js    ~543 kB (gzipped ~167 kB)
```

The large JS bundle is Konva + React bundled together. No code splitting is currently configured. Acceptable for internal operational tooling.
