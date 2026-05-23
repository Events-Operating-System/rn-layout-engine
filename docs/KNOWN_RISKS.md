# KNOWN RISKS
## RN Layout Engine

---

# LAST UPDATED
2026-05-23 — SESSION-0013 (Mobile Stability & Responsive Pass)

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
Operators must ensure all elements are visible before exporting. Zoom out to confirm full layout is in frame. A "fit all" zoom button would mitigate this. Carry to SESSION-0014 backlog.

---

## RISK-0017
**Severity:** MEDIUM
**Status:** OPEN

### Description
Mobile drawing tools (line, arrow, text) are not supported via touch. The touch handlers added in SESSION-0013 cover pan and pinch-to-zoom only. Users on iPhone/iPad cannot create drawing annotations.

### Trigger Condition
User switches to line/arrow/text tool on a touch device and attempts to draw.

### Impact
Drawing tools are functionally inaccessible on mobile. Pan and zoom still work. Asset placement and selection work via tap. Export works. Core operational use (placing and reviewing layout assets) is unaffected.

### Mitigation
Currently accepted as a known limitation for mobile. The primary use case on mobile is reviewing and sharing layouts, not creating annotations. If touch drawing becomes required, add `onTouchStart`/`onTouchMove` routing in `handleTouchStart` for active drawing tools (line/arrow), mirroring the existing mouse logic.

---

## RISK-0018
**Severity:** LOW
**Status:** OPEN

### Description
`window.prompt()` used by the text annotation tool does not work reliably on iOS Safari (may be blocked as a pop-up or not render correctly).

### Trigger Condition
User taps the canvas in text tool mode on iOS Safari.

### Impact
Text annotations cannot be added from iPhone/iPad.

### Mitigation
Currently accepted. Text tool is rarely the primary use case on mobile. Long-term fix: replace `window.prompt()` with an inline text input component rendered on the canvas.
