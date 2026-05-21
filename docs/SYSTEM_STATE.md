# SYSTEM STATE
## RN Layout Engine

---

# LAST UPDATED
2026-05-20 — SESSION-0009 (Next.js → Vite Migration)

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
│   │   ├── LayoutEditor.tsx        — Three-panel layout shell
│   │   ├── canvas/                 — Konva canvas components
│   │   └── panels/                 — UI control panels
│   ├── hooks/
│   │   └── useCanvasState.ts       — Canvas state management
│   └── types/                      — TypeScript type definitions
```

---

# BRANCH STATE

| Branch | State | Notes |
|---|---|---|
| `feat/vite-migration` | Locally validated — NOT yet merged | All SESSION-0009 work lives here |
| `main` | Pre-migration Next.js scaffold | Last stable baseline; untouched in SESSION-0009 |

**Merge hold:** Do not merge `feat/vite-migration` → `main` until deployment target is confirmed and production smoke test passes. See RISK-0014.

---

# VALIDATED BEHAVIORS (local, 2026-05-20)

| Behavior | Status |
|---|---|
| `npm install` clean | ✅ |
| `npm run dev` starts Vite | ✅ |
| Canvas renders without freeze | ✅ |
| Zoom (wheel event) | ✅ |
| Pan (drag on Stage) | ✅ |
| Object drag | ✅ |
| Transformer handles | ✅ |
| No SSR errors | ✅ |

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

1. **Confirm deployment target** — Vercel / Render Static / CDN for `frontend/dist/` (closes RISK-0014)
2. **Merge `feat/vite-migration` → `main`** — after production smoke test passes on chosen host
3. **SESSION-0010** — First canvas feature: element creation (add shape/text) + property panel wiring
