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

## Estado actual (2026-11-01)
- Bloques 1 a 9 de la auditoría hechos y en `main` (permisos, canvas modular, mesas con sillas y PAX, plano del local
  con recorte, muros y cotas, capas y biblioteca de la org, curvas, PDF vectorial A4/A3 con cajetín, 3D en otra
  pestaña). Además: mantel y sillas, alturas 3D por tipo (ajuste de la org), lista de materiales (L1 simple; L2–L5 en
  espera) y edición de curvas/polígonos/muros con el mouse.
- Esperando OK: unificar capa y tipo (propuesta en `docs/AUDITORIA-LAYOUT.md` §10; cambia colores de planos
  existentes, no aplicar sin el OK).
- Pendiente: probar en QA con sesión el recorte del fondo y la tarjeta de Administración; curvas: agregar/quitar
  vértices; 3D: modelos CC0, choques al recorrer, cotas en 3D.
