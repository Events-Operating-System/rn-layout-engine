# RN Layout Engine — Agent & Claude Code Rules

## Stack

- Vite + React 19 + TypeScript
- Tailwind v4 (via `@tailwindcss/vite` plugin — no PostCSS config needed)
- Konva.js + react-konva (2D canvas)
- Three.js 0.186.1 ONLY in `src/components/viewer3d/` (route `/3d/<plano>`, lazy-loaded; see below)
- No SSR — this is a browser-only client application

## Path Alias

`@/` resolves to `src/`. Defined in both `vite.config.ts` and `tsconfig.json`.

## Entry Points

- `index.html` → Vite HTML entry
- `src/main.tsx` → React root mount
- `src/App.tsx` → Application shell (header, LayoutEditor, footer)
- `src/components/LayoutEditor.tsx` → Three-panel layout
- `src/components/canvas/LayoutCanvas.tsx` → Konva canvas (DO NOT modify without explicit instruction)

## Operational Principles

This is NOT a general-purpose UI app. It is an operational layout engine for live event production.

- Real-world measurements are mandatory. Every element has x, y, width, height in meters.
- The canvas is the source of truth for spatial data.
- Assets are reusable operational entities — not decorative objects.
- AI agents may read and suggest. Humans approve all changes to operational data.

## What NOT to do

- Do NOT run `npm install` or `npm run dev` inside the agent unless explicitly instructed.
- Do NOT rewrite canvas logic or Konva implementation without explicit instruction.
- Do NOT refactor hooks, components, or types without explicit instruction.
- Do NOT introduce SSR, server components, or backend dependencies into this frontend.
- Three.js is allowed ONLY in `src/components/viewer3d/` (decision 2026-10-31, replaces DEC-0020 for the 3D view only). It must stay behind the lazy route `/3d/<plano>` in `App.tsx`; never import it from the editor, the canvas or any shared module. The 2D editor stays on Konva.

## Governance

Session records and decisions live in `docs/` at the repo root (not inside `frontend/`).

## Commit Attribution Policy

Strategic ownership of this project belongs to the founder (Javier Bambaren D).
AI systems (Claude, agents) are execution collaborators — not strategic owners or autonomous decision-makers.

**For feature/code commits:** standard `Co-Authored-By:` attribution is acceptable.

**For governance, strategy, session-state, and architecture commits:** use the following format in the commit body:

```
Author: Javier Bambaren D
Execution Support: Claude Sonnet 4.6
```

AI systems:
- Do NOT imply autonomous authority over architectural decisions in commit messages
- Do NOT claim ownership of strategic direction
- Do NOT commit governance documents without explicit human instruction to do so
- MAY draft commit messages, but humans control what is recorded as their intent
