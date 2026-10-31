-- ============================================================
-- RN Layout Engine — Plano del local y cotas (bloque 5)
--
-- Decisión (Javier, 2026-10-31): fondo del plano en imagen o PDF, muros de
-- 0,15 m y cotas con 2 decimales, todo como ajuste de la org
-- (organizations.settings.layout).
--
-- 1) Ajustes nuevos en el grupo "layout" de org_settings_schema():
--      wall_thickness 0,15 · dimension_decimals 2
--      background_image true · background_pdf true (formatos de fondo)
--    ¡OJO! La función es compartida. Esta versión se generó a partir de la
--    que estaba en la base al aplicar (md5 46326df0…, con los cambios de
--    otras sesiones posteriores al bloque 4), agregando solo estas 4 claves.
--
-- 2) Bucket privado "layout-backgrounds" para la imagen del fondo. Ruta:
--    <org_id>/backgrounds/<uuid>.<ext>. Un PDF se convierte a imagen en el
--    navegador antes de subirlo. Leer: miembro activo de la org. Escribir o
--    borrar: además, permiso "editar" de Layout (layout_can).
--
-- Aplicar: `supabase db query --linked -f <este archivo>` + verificación
-- directa (ledger compartido entre repos; nunca db push).
-- ============================================================

begin;

-- Candado contra carreras: la función es compartida y otras sesiones la
-- cambian. Si al aplicar ya no es la versión de la que se generó este archivo
-- (md5 46326df0ef61447438eefad4f80d78b0), no se aplica nada.
do $guard$
begin
  if md5(pg_get_functiondef('public.org_settings_schema()'::regprocedure)) <> '46326df0ef61447438eefad4f80d78b0' then
    raise exception 'org_settings_schema() cambió desde que se generó esta migración: regenerar desde la versión viva';
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
      "auto_create_sections":    {"type": "boolean", "default": true},
      "moneda_cobro_default":    {"type": "string",  "default": ""}
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
      "background_pdf":     {"type": "boolean", "default": true}
    }}
  }'::jsonb;
$function$;

-- ── Bucket del fondo del plano ──────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('layout-backgrounds', 'layout-backgrounds', false, 15728640, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Escribir en el bucket: miembro activo de una org aprobada (como el resto de
-- los buckets) y además "editar" en Layout. Ruta mal formada → no.
create or replace function public.can_write_layout_storage(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  begin
    v_org := split_part(p_path, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.can_write_org_storage(p_path) and public.layout_can(v_org, 'editar');
end;
$$;

revoke all on function public.can_write_layout_storage(text) from public, anon;
grant execute on function public.can_write_layout_storage(text) to authenticated;

drop policy if exists "layout_backgrounds_select" on storage.objects;
drop policy if exists "layout_backgrounds_insert" on storage.objects;
drop policy if exists "layout_backgrounds_update" on storage.objects;
drop policy if exists "layout_backgrounds_delete" on storage.objects;

create policy "layout_backgrounds_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'layout-backgrounds' and public.can_read_org_storage(name));

create policy "layout_backgrounds_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'layout-backgrounds' and public.can_write_layout_storage(name));

create policy "layout_backgrounds_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'layout-backgrounds' and public.can_write_layout_storage(name))
  with check (bucket_id = 'layout-backgrounds' and public.can_write_layout_storage(name));

create policy "layout_backgrounds_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'layout-backgrounds' and public.can_write_layout_storage(name));

commit;
