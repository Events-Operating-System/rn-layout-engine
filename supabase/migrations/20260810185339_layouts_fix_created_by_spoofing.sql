-- ============================================================
-- RN Layout Engine — Cerrar spoofing de created_by en layouts
--
-- Contexto: revisión de seguridad de
-- 20260810183024_layouts_fix_org_id_and_scope_by_org.sql encontró que
-- esa migración, al reemplazar la policy de escritura por membership de
-- organización, sacó sin querer el constraint `created_by = auth.uid()`
-- que la policy anterior (20260727193938_layouts_restrict_writes_to_
-- active_orgs.sql) tenía en su WITH CHECK. El trigger
-- layouts_set_org_id() ya resuelve org_id del lado del servidor
-- ignorando lo que manda el cliente, pero para created_by usaba
-- `coalesce(new.created_by, auth.uid())` — que no hace nada si el
-- cliente manda un created_by no-nulo (INSERT), y no hace nada en
-- absoluto en UPDATE (la columna ya viene no-nula de la fila existente).
--
-- Confirmado explotable en producción antes de este fix: impersonando a
-- jbambaren (77985bec-...), tanto un INSERT con
-- created_by = '<id de tzuloaga>' como un UPDATE de
-- created_by sobre una fila existente pasaban la RLS sin problema —
-- cualquier miembro de una org podía atribuir un layout a cualquier
-- otro usuario real, de su org o de otra.
--
-- Fix: mismo criterio que ya se usa para org_id — nunca confiar en lo
-- que manda el cliente para este campo. En INSERT, created_by se pisa
-- siempre con auth.uid() (sin coalesce). En UPDATE, created_by queda
-- inmutable: se restaura siempre al valor que ya tenía la fila
-- (OLD.created_by), sin importar qué mande el cliente.
-- ============================================================

create or replace function public.layouts_set_org_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id
  from public.organization_members
  where user_id = auth.uid() and is_active = true
  limit 1;

  if v_org_id is null then
    raise exception 'No se encontró una organización activa para el usuario actual — no se puede crear/editar el layout.';
  end if;

  new.org_id := v_org_id;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
  end if;

  return new;
end;
$$;
