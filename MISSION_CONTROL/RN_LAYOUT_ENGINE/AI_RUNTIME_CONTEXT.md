# AI RUNTIME CONTEXT — RN Layout Engine
## Boot file for supervisory / orchestration AI sessions

> Read this + `frontend/AGENTS.md`. Do NOT automatically read SESSION_LOG, full SYSTEM_STATE, or historical MC_STATE files unless the task requires it.

---

## 1 — Project Identity

Internal operational layout engine for live event production (Reality Near / JBD Investment Corp). Operators plan physical venue layouts — stage, tables, structures, barriers — and export a PNG floor plan for on-site teams. Not a SaaS product. Correctness and stability over features.

**Stack:** Vite 6 + React 19 + TypeScript + Konva.js (2D canvas) + Tailwind v4. Browser-only SPA. No SSR, no backend, no auth, no env vars.

---

## 2 — Current Production State

| Property | Value |
|---|---|
| Live URL | https://rn-layout-engine.vercel.app |
| Status | **LIVE** — SESSION-0016 deployed |
| Last feature set | Operational UX Pass v1 + v2 (15 features) |
| TypeScript errors | 0 |
| Build | Clean (553 KB, Konva SPA expected) |
| Mobile (iPhone Safari) | Confirmed working |

---

## 3 — Canonical Branch + Deploy Policy

- **`main` is the only production branch.** All work goes to `main`.
- Push to `main` → Vercel auto-deploys `rn-layout-engine` within ~60s.
- **Do NOT** run `vercel --prod` from `frontend/`. Do NOT use the legacy `frontend` Vercel project.
- Rollback: Vercel dashboard "Promote to Production" (preferred) or `git revert` + push.
- **Do NOT** `git reset --hard main` and force-push. Use `git revert`.

---

## 4 — Critical Protections — DO NOT TOUCH

Two lines in `frontend/src/components/canvas/LayoutCanvas.tsx` are load-bearing. Reverting either blanks the canvas on iPhone Safari with no error.

```
const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
```
Stage is not rendered until ResizeObserver fires — prevents premature 800×600 canvas allocation.

```
pixelRatio={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
```
DPR cap at 2 — on iPhone 12+ (DPR=3), uncapped Konva = ~33 MB canvas memory, which exceeds iOS Safari's ~16 MB limit. Both lines must remain untouched.

---

## 5 — Current Priorities

1. **Office validation** — real team testing UX Pass v1 + v2 features with actual event layouts
2. **Layout persistence** (RISK-0015) — localStorage save/load is the largest operational gap; no canvas state survives page reload yet
3. **Delete legacy `frontend` Vercel project** (`prj_C5ILNi9aCuQZgqTYqxDtWoOMQSZi`) — human action via Vercel dashboard
4. **Feature candidates** (post-validation): touch drawing, "fit all" zoom, background image upload, grid snapping

---

## 6 — Recently Completed

**SESSION-0016 — Operational UX Pass v2** (commit `42c0a25`):
undo/redo (Ctrl+Z, 50-step), text drag bug fix, complete EN/ES i18n (40 assets), footer branding (EventOS Layout / powered by / Reality Near), email adaptive font fix (no truncation), smart alignment guides (Figma-style, visual only), tree asset top-view canopy visual, toolbar polish.

**SESSION-0015 — Operational UX Pass v1** (commit `98ec46f`):
EN/ES language selector, export footer fix, asset duplication (Ctrl+D), element delete button, alignment center cross, draggable annotations, primitive shapes category (Circle, Oval, Rounded Box, Tree), keyboard tool shortcuts (S/L/A/T).

---

## 7 — Active Known Risks

| Risk | Description | Status |
|---|---|---|
| RISK-0015 | No layout persistence — canvas lost on reload | Open — next engineering priority |
| RISK-0017 | No touch drawing — finger cannot draw lines/arrows on mobile | Open — post-validation |
| RISK-0020 | Legacy `frontend` Vercel project still exists | Pending human deletion |

---

## 8 — Key Operational Files

| File | Purpose |
|---|---|
| `frontend/AGENTS.md` | Stack, rules, what NOT to do, commit attribution policy |
| `frontend/src/components/canvas/LayoutCanvas.tsx` | Konva Stage — iPhone fix lives here |
| `frontend/src/hooks/useCanvasState.ts` | All canvas + drawing + undo/redo state |
| `frontend/src/context/LangContext.tsx` | EN/ES strings + asset name translations |
| `frontend/src/types/layout.ts` | All shared types |
| `docs/KNOWN_RISKS.md` | Full risk register |
| `docs/DEPLOYMENT.md` | Vercel project details, rollback table |

---

## 9 — Session Bootstrap Rule

**Read only this file + `frontend/AGENTS.md` at session start.**

Do NOT automatically read:
- `docs/SESSION_LOG.md` — historical narrative, not needed unless debugging a specific past decision
- `docs/SYSTEM_STATE.md` — full system state, consult only when auditing architecture
- `MISSION_CONTROL/RN_LAYOUT_ENGINE/MC_STATE_*.md` — strategic snapshots, read only for governance context

If a coding task is scoped and clear, proceed directly. If uncertain about scope or prior decisions, ask the founder before reading historical docs.

---

*Last updated: 2026-05-24 — SESSION-0016*
