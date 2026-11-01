-- ============================================================
-- RN Layout Engine — Sugerencias por org para la lista de materiales
--
-- Pedido de Javier (2026-11-01): para que "Blanco" y "blanco" no se cuenten
-- como distintos, el editor normaliza y sugiere los valores ya usados en la
-- org. Esta función devuelve, de los planos activos de la org, los tipos de
-- silla, los tipos/telas de mantel y los nombres de color escritos.
--
-- Solo lee. Pide ser miembro activo de la org con el módulo Layout (ver).
-- No toca Inventarios ni Ventas.
--
-- Aplicar: `supabase db query --linked -f <este archivo>` + verificación
-- directa (ledger compartido entre repos; nunca db push).
-- ============================================================

begin;

create or replace function public.layout_vocab(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_org_id is null
     or p_org_id not in (select public.my_active_org_ids())
     or not public.role_can(p_org_id, 'layout', 'ver') then
    raise exception 'LAYOUT_PERM: sin acceso a los planos de esta organización'
      using errcode = '42501';
  end if;

  return (
    with e as (
      select el
      from public.layouts l, jsonb_array_elements(coalesce(l.elements, '[]'::jsonb)) el
      where l.org_id = p_org_id
        and not coalesce(l.is_archived, false)
        and jsonb_typeof(el) = 'object'
    ),
    v as (
      select k, btrim(el ->> k) as val
      from e, unnest(array['chairType', 'fabric', 'colorName']) k
      where nullif(btrim(el ->> k), '') is not null
    )
    select jsonb_build_object(
      'chairTypes', coalesce((select jsonb_agg(val order by val) from (select distinct val from v where k = 'chairType' limit 200) x), '[]'::jsonb),
      'fabrics',    coalesce((select jsonb_agg(val order by val) from (select distinct val from v where k = 'fabric' limit 200) x), '[]'::jsonb),
      'colorNames', coalesce((select jsonb_agg(val order by val) from (select distinct val from v where k = 'colorName' limit 200) x), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.layout_vocab(uuid) from public, anon;
grant execute on function public.layout_vocab(uuid) to authenticated, service_role;

commit;
