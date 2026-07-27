-- ============================================================
-- RN Layout Engine — Bloquear escritura para organizaciones no activas
--
-- Contexto: auditoría confirmó que este módulo bloqueaba solo por
-- membership (organization_members.is_active = true, vía
-- checkOrgMembership() en frontend/src/lib/supabase.ts), nunca por
-- public.organizations.approval_status. Un miembro de una org pending/
-- suspended/rejected podía seguir creando, editando y borrando layouts
-- pegándole directo a la REST API, sin pasar por ninguna UI (la única
-- pantalla de bloqueo que existía, SinAcceso, solo cubría el caso "sin
-- ninguna organización").
--
-- La policy existente sobre public.layouts era una única "FOR ALL"
-- (lectura + escritura, using/with check = created_by = auth.uid()), no
-- separada por comando. Se divide en dos: una de solo SELECT que preserva
-- exactamente la misma condición de antes (sin exigir org activa — mismo
-- motivo chicken-egg que en el resto de los módulos: useOrgStatus necesita
-- poder leer el estado de una org no-activa para mostrar la pantalla de
-- bloqueo correcta), y una de escritura (INSERT/UPDATE/DELETE, vía FOR ALL
-- con USING+WITH CHECK) que además exige approval_status = 'active'.
--
-- A diferencia del resto de los módulos (inventarios, agentes, ventas,
-- eventos), esta tabla nunca usó su columna layouts.org_id para
-- scoping de RLS (siempre fue created_by = auth.uid(), ownership directo
-- por usuario, no por organización) — y esa columna además viene
-- populada con el id del usuario, no el id real de la organización
-- (frontend/src/App.tsx, `const orgId = user?.id ?? ''`, corregido en esta
-- misma sesión para usar el orgId real de useOrgStatus). Por eso el check
-- de organización activa se resuelve acá vía membership real
-- (organization_members / public.my_active_org_ids(), auth.uid()),
-- nunca vía layouts.org_id — independiente de lo que esa columna
-- contenga.
--
-- Mismo patrón que eventos-ventas-frontend
-- (20260727190000_ventas_restrict_writes_to_active_orgs.sql),
-- eventos-administracion-frontend
-- (20260727101442_restrict_writes_to_active_orgs.sql),
-- eventos-fieldops-frontend (009_fieldops_restrict_writes_to_active_orgs.sql),
-- eventos-agentes-frontend
-- (20260727172654_agentes_restrict_writes_to_active_orgs.sql) y
-- eventos-eventos-frontend
-- (20260727184500_events_restrict_writes_to_active_orgs.sql).
--
-- Nombrado con timestamp (no numeración secuencial 009+) porque el ledger
-- supabase_migrations.schema_migrations de este proyecto Supabase es
-- compartido entre repos: las versiones 001-011 ya están tomadas por
-- eventos-financiero-frontend. Aplicada vía `supabase db query --linked
-- -f` (no `db push`) para no chocar con ese ledger ni tocarlo.
-- ============================================================

drop policy if exists "layouts: owner access" on public.layouts;

create policy "layouts: owner select" on public.layouts
  for select
  using (created_by = auth.uid());

create policy "layouts: owner write" on public.layouts
  for all
  using (
    created_by = auth.uid()
    and exists (
      select 1 from public.organizations
      where id in (select public.my_active_org_ids())
        and approval_status = 'active'
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.organizations
      where id in (select public.my_active_org_ids())
        and approval_status = 'active'
    )
  );
