-- ============================================================
-- RN Layout Engine — Ajustes de Layout de la organización (bloque 4)
--
-- Decisión (Javier, 2026-10-31): las medidas por defecto de mesas y sillas y
-- la separación entre mesas son ajustes de la org, en
-- organizations.settings.layout (regla del 2026-10-29: un solo lugar, nunca
-- tablas de ajustes nuevas), editables en Administración → Organización.
-- Se leen con public.org_settings(org) (trae los valores por defecto) y se
-- escriben con public.set_org_settings(org, 'layout', valores), que exige
-- tener el módulo Layout con "editar" (can_edit_org_module).
--
-- Claves (metros):
--   chair_size 0,45 · table_round8 1,5 · table_round10 1,8 · table_round12 2,1
--   table_rect_length 2,4 · table_rect_width 0,75 · chair_gap 0,15
--   table_spacing 1,5
-- Las del plano del local (bloque 5) y del PDF (bloque 8) se agregan después.
--
-- ¡OJO! org_settings_schema() es compartida por todos los módulos. Esta
-- versión parte de la que estaba en la base al aplicar (inventarios, ventas,
-- financiero) y solo agrega "layout". Quien la reemplace después tiene que
-- partir de la versión viva (pg_get_functiondef), no de un archivo viejo.
--
-- Aplicar: `supabase db query --linked -f <este archivo>` + verificación
-- directa (ledger compartido entre repos; nunca db push).
-- ============================================================

create or replace function public.org_settings_schema()
 returns jsonb
 language sql
 immutable
 set search_path to ''
as $function$
  select '{
    "inventarios": {"module": "inventario", "keys": {
      "default_unit":            {"type": "string",  "default": "unidad"},
      "default_stock_min":       {"type": "number",  "default": 0, "min": 0},
      "reservation_buffer_days": {"type": "number",  "default": 1, "min": 0}
    }},
    "ventas": {"module": "ventas", "keys": {
      "auto_create_sections":    {"type": "boolean", "default": true}
    }},
    "financiero": {"module": "financiero", "keys": {
      "cxc_automatica":           {"type": "boolean", "default": true},
      "cxc_dias_antes_evento":    {"type": "number",  "default": 7, "min": 0},
      "caja_saldo_inicial":       {"type": "number",  "default": 0},
      "caja_saldo_inicial_fecha": {"type": "string",  "default": ""},
      "estructura_criterio":      {"type": "string",  "default": "precio_venta"},
      "planilla_conceptos":       {"type": "array",   "default": null,
                                   "items": {"clave": "string", "nombre": "string", "suma": "boolean"}}
    }},
    "layout": {"module": "layout", "keys": {
      "chair_size":        {"type": "number", "default": 0.45, "min": 0.2},
      "table_round8":      {"type": "number", "default": 1.5,  "min": 0.5},
      "table_round10":     {"type": "number", "default": 1.8,  "min": 0.5},
      "table_round12":     {"type": "number", "default": 2.1,  "min": 0.5},
      "table_rect_length": {"type": "number", "default": 2.4,  "min": 0.5},
      "table_rect_width":  {"type": "number", "default": 0.75, "min": 0.3},
      "chair_gap":         {"type": "number", "default": 0.15, "min": 0},
      "table_spacing":     {"type": "number", "default": 1.5,  "min": 0}
    }}
  }'::jsonb;
$function$;
