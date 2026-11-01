-- ============================================================
-- RN Layout Engine — Tipo de pieza "Sofá / lounge" (altura 3D)
--
-- Pedido de Javier (2026-11-01): las piezas de lounge (1 × 0,8 m, 2 × 0,8 m)
-- salían como "Otra pieza". Nuevo tipo con su altura en 3D como ajuste de la
-- org: h3d_lounge 0,8 m (mínimo 0).
--
-- ¡OJO! org_settings_schema() es compartida. Generada desde la versión viva
-- (pg_get_functiondef) con candado: si cambió desde entonces, no aplica nada.
--
-- Aplicar: `supabase db query --linked -f <este archivo>` + verificación
-- directa (ledger compartido entre repos; nunca db push).
-- ============================================================

begin;

do $guard$
begin
  if md5(pg_get_functiondef('public.org_settings_schema()'::regprocedure)) <> '80ee7dfcc7ca49bb51b41f27068a8ae2' then
    raise exception 'org_settings_schema() cambió desde que se generó esta migración: regenerarla desde la versión viva';
  end if;
end
$guard$;

CREATE OR REPLACE FUNCTION public.org_settings_schema()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
                                   "items": {"clave": "string", "nombre": "string", "suma": "boolean"}},
      "moneda_reporte":           {"type": "string",  "default": ""},
      "tc_regla_aplicacion":      {"type": "string",  "default": "dia_pago"},
      "tc_referencia":            {"type": "array",   "default": [],
                                   "items": {"moneda": "string", "valor": "number", "fecha": "string"}}
    }},
    "layout": {"module": "layout", "keys": {
      "chair_size":        {"type": "number", "default": 0.45, "min": 0.2},
      "table_round8":      {"type": "number", "default": 1.5,  "min": 0.5},
      "table_round10":     {"type": "number", "default": 1.8,  "min": 0.5},
      "table_round12":     {"type": "number", "default": 2.1,  "min": 0.5},
      "table_rect_length": {"type": "number", "default": 2.4,  "min": 0.5},
      "table_rect_width":  {"type": "number", "default": 0.75, "min": 0.3},
      "chair_gap":         {"type": "number", "default": 0.15, "min": 0},
      "table_spacing":     {"type": "number", "default": 1.5,  "min": 0},
      "wall_thickness":     {"type": "number",  "default": 0.15, "min": 0.01},
      "dimension_decimals": {"type": "number",  "default": 2,    "min": 0},
      "background_image":   {"type": "boolean", "default": true},
      "background_pdf":     {"type": "boolean", "default": true},
      "client_hide_structure": {"type": "boolean", "default": false},
      "client_hide_furniture": {"type": "boolean", "default": false},
      "client_hide_decor":     {"type": "boolean", "default": false},
      "client_hide_technical": {"type": "boolean", "default": true},
      "client_hide_notes":     {"type": "boolean", "default": true},
      "pdf_a3":                {"type": "boolean", "default": false},
      "pdf_landscape":         {"type": "boolean", "default": true},
      "h3d_table": {"type": "number", "default": 0.75, "min": 0},
      "h3d_chair": {"type": "number", "default": 0.9, "min": 0},
      "h3d_stage": {"type": "number", "default": 0.6, "min": 0},
      "h3d_dance": {"type": "number", "default": 0.05, "min": 0},
      "h3d_bar": {"type": "number", "default": 1.1, "min": 0},
      "h3d_screen": {"type": "number", "default": 3, "min": 0},
      "h3d_wall": {"type": "number", "default": 3, "min": 0},
      "h3d_tent": {"type": "number", "default": 3, "min": 0},
      "h3d_service": {"type": "number", "default": 2.6, "min": 0},
      "h3d_barrier": {"type": "number", "default": 1.1, "min": 0},
      "h3d_truss": {"type": "number", "default": 6, "min": 0},
      "h3d_vehicle": {"type": "number", "default": 3, "min": 0},
      "h3d_other": {"type": "number", "default": 0.9, "min": 0},
      "h3d_lounge": {"type": "number", "default": 0.8, "min": 0}
    }}
  }'::jsonb;
$function$;

commit;
