# RN Layout Engine — Agent & Claude Code Rules

## Stack

- Vite + React 19 + TypeScript
- Tailwind v4 (via `@tailwindcss/vite` plugin — no PostCSS config needed)
- Konva.js + react-konva (2D canvas — NOT Three.js)
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
- Do NOT introduce Three.js — this project uses Konva for 2D canvas operations.

## Governance

Session records and decisions live in `docs/` at the repo root (not inside `frontend/`).
