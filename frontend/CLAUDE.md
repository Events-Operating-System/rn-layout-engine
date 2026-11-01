# EventOS Layout (rn-layout-engine/frontend) — reglas y estado

> **Reglas comunes de EventOS:** `eventos-reglas/REGLAS.md` (se cargan solas desde `~/Developer/CLAUDE.md`). Este
> archivo y `frontend/AGENTS.md` (stack, principios, qué no hacer) se cargan desde el `CLAUDE.md` de la raíz del repo.
> Bitácora: `docs/SESSION_LOG.md` (raíz del repo). Detalle de la auditoría, decisiones y pruebas:
> `docs/AUDITORIA-LAYOUT.md`.

## Reglas propias del repo
- Three.js solo en `src/components/viewer3d/` (ruta lazy `/3d/<plano>`); el editor 2D sigue en Konva. Ver AGENTS.md.
- Ajustes de Layout en `organizations.settings.layout` (los edita Administración → Organización → Layout); al tocar
  `org_settings_schema()`, regla 6 de REGLAS.md (versión viva + candado md5, como `20261031240000`, `…280000`,
  `…300000`).
- Permisos por acción en la base (`layout_can`, RLS por acción); facultad `layout.compartir` para la biblioteca de la
  org.

## Estado actual (2026-10-31)
- Bloques 1 a 9 de la auditoría hechos y en `main`: permisos por rol; canvas partido en `components/canvas/`; mesas
  con sillas como bloque, PAX automático, alinear/distribuir/repetir; plano del local de fondo (con recorte del área
  útil), muros y cotas; capas fijas y "Vista cliente" según la org; biblioteca de la org con plantillas; curvas; PDF
  vectorial A4/A3 a escala con cajetín y exportar selección; vista 3D en otra pestaña (mantel, sillas, alturas por
  tipo de pieza, luz clara); lista de materiales del plano (versión simple de L1).
- Pendiente: repetir en la app con sesión el diálogo de exportar, "Ver en 3D" y la tarjeta de Administración (hoja del
  PDF); 3D: modelos CC0, choques al recorrer, dibujos/cotas en 3D, render con IA (sin proveedor pago).
- `get_event_summary` (bug que figuraba en "Known Bugs") ya no existe: Eventos la eliminó el 2026-10-11.
