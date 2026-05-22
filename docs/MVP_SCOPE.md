# MVP SCOPE
## RN Layout Engine

**Last Updated:** 2026-05-21 — SESSION-0012
**Status:** In active development — locally validated, not yet deployed

---

## PURPOSE

Define the official scope boundary for the RN Layout Engine MVP.

This is an operational layout engine for live event production — not a full CAD platform.

---

## MVP GOALS

1. Enable the Reality Near team to produce operational event layout plans in-browser
2. Export plans as professional-looking PNG documents for client and crew use
3. Replace manual sketching, generic slide tools, and external CAD tools for typical events
4. Operate entirely browser-native — no accounts, no backend, no install

---

## OPERATIONAL SUCCESS METRICS

- A non-technical team member can produce a usable event layout in under 10 minutes
- The exported PNG is readable and presentable to a client
- All major event asset types are represented in the library
- The tool does not freeze or lose responsiveness during normal use
- Layouts can be annotated with lines, arrows, and text without training

---

## INCLUDED IN MVP

### Canvas Engine
- Vite + React 19 + Konva.js (2D canvas — NOT Three.js, NOT SVG, NOT WebGL)
- Pan, zoom, grid reference system
- Real-world measurements (meters) — all elements have x, y, width, height in meters
- `PIXELS_PER_METER = 20` world coordinate system

### Asset Library
- 34 operational assets across 6 categories: Stage, Structure, Seating, Barrier, Utility, Circulation
- Asset shapes: rectangle (default) or circle (round tables)
- Click-to-place from the library panel
- Each asset has default dimensions appropriate for real events

### Element Manipulation
- Select, move (drag), resize, rotate (Konva Transformer)
- Delete (keyboard Delete/Backspace)
- Properties panel: name, position, dimensions, color, opacity, rotation, notes, lock state

### Drawing Annotations
- Line, Arrow, Text annotation tools
- All drawings selectable, editable (color, stroke width, opacity, text content), deletable
- Visual selection: blue shadow glow on selected drawing
- Delete key works on drawings as well as elements

### Color System
- Operational color presets per element category (default)
- Override: 9 operational presets (red, orange, yellow, green, cyan, blue, purple, white, gray) + custom color picker
- Opacity control: 10%–100% for both elements and drawings
- Intended use: color = operational meaning (confirmed, flagged, pending, zone type)

### Export
- PNG export ("Exportar Plano")
- Captures visible viewport at 2x pixel resolution
- Includes footer legend (title block) below canvas
- Dark background, subtle grid, professional layout document appearance
- Direct browser download — no server required

### Footer Legend (Title Block)
- Company name (Reality Near)
- 9 editable metadata fields: CLIENTE, LUGAR EVENTO, FECHA EVENTO, PAX/INVITADOS, VERSION DEL PLANO, FECHA DEL PLANO, CONTACTO, TELEFONO, CORREO
- All fields editable inline at the bottom of the editor
- Included in PNG export

---

## EXCLUDED FROM MVP

| Feature | Reason |
|---|---|
| PDF export | Requires third-party library or backend; out of scope |
| Layout save / load | No persistence yet (RISK-0015) — planned for next milestone |
| Backend / database | Browser-native only |
| Auth / accounts | Not needed for internal team use |
| Realtime collaboration | Out of scope |
| 3D rendering | Not applicable — 2D top-down operational plans only |
| BIM / IFC / CAD file import | Not applicable |
| Multiplayer editing | Out of scope |
| AI-generated layouts | Future consideration only |
| Mobile app | Desktop browser only |
| Advanced physics / lighting | Not applicable |
| Inventory automation | Separate system concern |
| Background image upload | Planned — not yet implemented |
| Grid snapping | Planned — not yet implemented |
| Layers / Z-ordering UI | Planned — not yet implemented |
| Undo / redo | Planned — not yet implemented |

---

## TECHNICAL CONSTRAINTS

- Must run entirely in the browser — no Node.js backend, no server-side rendering
- Must not freeze, lag, or lose responsiveness during normal canvas operations
- Canvas engine is Konva — do not introduce Three.js, SVG-based editors, or HTML5 Canvas direct manipulation
- No SSR — this is a browser-only SPA (Vite)
- All measurements are in meters with 0.1m precision

---

## NEXT EXPANSION PRIORITIES (POST-MVP)

1. Layout persistence — `localStorage` save/load or JSON file export/import
2. Background image upload — floor plan / venue map underlay
3. Grid snapping (0.5m or 1m) — improves placement accuracy
4. Fit-all zoom button — ensures full layout visible before export
5. Undo / Redo (browser history pattern or simple stack)
6. Vercel deployment + production URL (closes RISK-0014)
