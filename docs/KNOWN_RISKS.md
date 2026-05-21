# KNOWN RISKS
## RN Layout Engine

---

# LAST UPDATED
2026-05-20 — SESSION-0009 (Next.js → Vite Migration)

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
