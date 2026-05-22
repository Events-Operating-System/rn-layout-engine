# KNOWN RISKS
## RN Layout Engine

---

# LAST UPDATED
2026-05-21 — SESSION-0012 (Operational Polish Sprint)

---

# FORMAT

## RISK-XXXX
**Severity:** CRITICAL / HIGH / MEDIUM / LOW
**Status:** OPEN / MITIGATED / RESOLVED

### Description
What the risk is.

### Trigger Condition
When it activates.

### Impact
What breaks if it fires.

### Mitigation
Current state and recommended action.

---

# RISKS

---

## RISK-0014
**Severity:** MEDIUM
**Status:** OPEN

### Description
After the Next.js → Vite migration (SESSION-0009, DEC-0019), Vite produces a static SPA in `frontend/dist/`. No deployment target is currently configured for this output. The Layout Engine has no production URL.

### Trigger Condition
`feat/vite-migration` is merged to `main` and the team needs to access the Layout Engine in a production environment. No hosting service is wired to build and serve `dist/`.

### Impact
Layout Engine is not accessible outside of local `npm run dev`. The Vite migration is complete locally but has no live environment. Feature validation and operator use require local setup until this is resolved.

### Mitigation
Confirm and configure deployment target before merging to `main`. Options:

| Option | Setup | Auto-deploy |
|---|---|---|
| **Vercel (recommended)** | Connect repo, root dir = `frontend/`, output = `dist/` | On push to `main` |
| Render Static Site | Set publish dir = `frontend/dist/`, build cmd = `npm run build` | On push to `main` |
| Any CDN | Upload `dist/` manually or via CI | Manual |

Rollback: not applicable — no current production deployment exists to roll back.

---

## RISK-0015
**Severity:** LOW
**Status:** OPEN

### Description
No layout persistence exists. All canvas state (placed assets, drawings, metadata) is lost on page reload. Office testing sessions produce work that cannot be saved or resumed.

### Trigger Condition
A team member refreshes the browser, closes the tab, or the browser crashes during a layout session.

### Impact
All in-progress layout data is lost. No file save, no localStorage, no backend persistence.

### Mitigation
Currently accepted as an in-sprint limitation — the tool is in validation mode only. Before operational use for real events, one of the following must be implemented:
- Browser `localStorage` save/load (no backend required — fast to build)
- JSON file export/import (download layout as `.json`, re-import later)
- Backend persistence (out of scope for current MVP)

Add to SESSION-0013 scope if office testing reveals this blocks real operational use.

---

## RISK-0016
**Severity:** LOW
**Status:** OPEN

### Description
Export captures only the visible viewport (WYSIWYG). Assets or annotations placed outside the current viewport view are not included in the exported PNG.

### Trigger Condition
Operator places elements, then pans/zooms so some elements are off-screen, then exports.

### Impact
Exported plan is incomplete — missing elements that were placed but not in view.

### Mitigation
Operators must ensure all elements are visible before exporting. Zoom out to confirm full layout is in frame. A "fit all" zoom button would mitigate this. Add to SESSION-0013 if this becomes a friction point during office testing.
