# FINAL STATE — 2026-05-23
## RN Layout Engine — End-of-day governance snapshot

---

# ROOT CAUSE CHAIN

Two compounding issues prevented the app from working on iPhone Safari:

**CAUSE 1 — Canvas memory exhaustion (RISK-0019, RESOLVED)**
`containerSize` initialized to `{ width: 800, height: 600 }`. On iPhone (DPR=3), Konva created canvas backing stores at 2400×1800 px. Two layers (scene + hit) = ~33 MB. iOS Safari enforces a ~16 MB per-page canvas budget and silently blanks any canvas that exceeds it — no JS error, no console warning.

**CAUSE 2 — Vercel pipeline failure (resolved 2026-05-23)**
`vercel.json` at repo root contained `"rootDirectory": "frontend"` — not a valid `vercel.json` field (it is a Vercel project dashboard setting). Before the Vercel reconnect/disconnect during this session, the project's `Root Directory` setting was intact so Vercel found no `vercel.json` inside `frontend/` and ignored it. After the reconnect disrupted that setting, Vercel began reading `vercel.json` from the repo root, rejected the unknown field, and failed the build before the build machine started, producing `[0ms]` failures.

---

# FIXES APPLIED

| Fix | Commit | Status |
|---|---|---|
| `containerSize` initialized to `null` — Stage deferred until ResizeObserver fires | `718fcfe` | ✅ Live |
| `pixelRatio={Math.min(window.devicePixelRatio, 2)}` — caps canvas at ~12.5 MB on DPR=3 | `718fcfe` | ✅ Live |
| `build.target: ['es2020', 'safari15']` in `vite.config.ts` | `f782c7d` | ✅ Live |
| `canvas { touch-action: none }` in `index.css` — prevents native scroll during canvas interaction | `f782c7d` | ✅ Live |
| `#root { height: 100% }` — full-viewport height chain | `f782c7d` | ✅ Live |
| Debug overlays removed (clean production code) | `b88d210` | ✅ Live |
| Removed `rootDirectory` from `vercel.json` — repaired auto-deploy pipeline | `cc26b22` | ✅ Live |
| `feat/vite-migration` merged to `main` | `3b08897` | ✅ Complete |

---

# FINAL ARCHITECTURE DECISIONS

| Decision | Rationale |
|---|---|
| **Vite 6 SPA — no SSR** | DEC-0019 (SESSION-0009): Next.js removed. This is a browser-only canvas tool — no server rendering benefit. |
| **`main` is canonical production branch** | Post-merge governance. All new work committed to `main`. Auto-deploy active. |
| **`rn-layout-engine` is the only Vercel project** | `frontend` project (`frontend-eta-five-50.vercel.app`) is a debugging artifact — manual-deploy only, pending deletion. |
| **`vercel.json` must not contain `rootDirectory`** | Not a valid field. `Root Directory: frontend` is set in the Vercel project dashboard. |
| **Deployment Protection enabled on `rn-layout-engine`** | Per-hash deployment URLs require auth. Alias URL (`rn-layout-engine.vercel.app`) bypasses protection and is the canonical URL. |
| **`pixelRatio` capped at 2 permanently** | iOS Safari 16 MB canvas limit is not negotiable. Cap must never be removed. |
| **`containerSize = null` on mount permanently** | Prevents any canvas allocation before true container size is known via ResizeObserver. Must never revert to `{ 800, 600 }`. |
| **`window.prompt()` for text annotations** | Known limitation on iOS Safari (RISK-0018). Acceptable for MVP; replace with inline input when needed. |

---

# PRODUCTION STATE

| Property | Value |
|---|---|
| Canonical URL | https://rn-layout-engine.vercel.app |
| Production branch | `main` |
| Production tip | `522a142` |
| Vercel project | `javier-bambaren-d-s-projects/rn-layout-engine` |
| Auto-deploy | Active — push to `main` → deploy |
| iPhone Safari | ✅ Confirmed working (DPR=3, iOS Safari) |
| Desktop | ✅ Confirmed working |

---

# REMAINING OPTIONAL CLEANUP ITEMS

These are not blockers. The app is fully operational.

| Item | Priority | Notes |
|---|---|---|
| Delete `frontend` Vercel project (`prj_C5ILNi9aCuQZgqTYqxDtWoOMQSZi`) | Medium | Wait ≥1 week of stable `rn-layout-engine` operation. Go to Vercel dashboard → Settings → Delete project. See RISK-0020. |
| Delete or archive `feat/vite-migration` branch | Low | Merged to `main`. Safe to delete after office testing confirms stability. |
| Layout persistence (localStorage save/load) | Medium | RISK-0015 — all canvas state lost on page reload. Fast to build, no backend required. |
| Touch drawing support (mobile line/arrow) | Medium | RISK-0017 — draw tools inaccessible on touch devices. Add `onTouchStart`/`onTouchMove` routing in `handleTouchStart`. |
| "Fit all" zoom button | Low | RISK-0016 — export only captures visible viewport. A fit-all button would prevent partial exports. |
| Replace `window.prompt()` for text tool | Low | RISK-0018 — unreliable on iOS Safari. Replace with inline text input rendered on canvas. |
| Grid snapping | Low | Feature candidate for next sprint. |
| Background image upload | Low | Feature candidate for next sprint. |

---

# OPEN RISKS

| Risk | Severity | Status |
|---|---|---|
| RISK-0020 | MEDIUM | Two Vercel projects exist. `frontend` project must be deleted. Mitigation: don't deploy to it. |
| RISK-0015 | LOW | No layout persistence. Accepted for MVP/validation phase. |
| RISK-0016 | LOW | Export captures visible viewport only. Accepted — operators must zoom out before export. |
| RISK-0017 | MEDIUM | Touch drawing not supported. Accepted — mobile primary use is review, not annotation. |
| RISK-0018 | LOW | `window.prompt()` unreliable on iOS Safari. Accepted for MVP. |

See KNOWN_RISKS.md for full details on each.
