import { useCallback, useEffect, useState } from 'react'
import { supabase, type User } from '@/lib/supabase'
import { withTimeout } from '@/lib/withTimeout'

const ORG_STATUS_TIMEOUT_MS = 10000

type OrgRow = {
  id: string
  name: string
  approval_status: string
  locale: string | null
}

type MembershipRow = {
  org_id: string
  locale: string | null
  organizations: OrgRow | null
}

export type OrgStatus =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'no-org' }
  | { state: 'pending'; orgName: string }
  | { state: 'suspended'; orgName: string }
  | { state: 'rejected'; orgName: string }
  | {
      state: 'active'
      orgId: string
      orgName: string
      // Insumos de la cascada de idioma (ver LangProvider):
      // organization_members.locale y organizations.locale.
      memberLocale: string | null
      orgLocale: string | null
    }

async function fetchOrgStatus(userId: string): Promise<OrgStatus> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, locale, organizations(id, name, approval_status, locale)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle() as { data: MembershipRow | null; error: unknown }

  const org = data?.organizations ?? null
  if (error || !data || !org) return { state: 'no-org' }

  if (org.approval_status === 'active') return {
    state: 'active',
    orgId: org.id,
    orgName: org.name,
    memberLocale: data.locale,
    orgLocale: org.locale,
  }
  if (org.approval_status === 'pending') return { state: 'pending', orgName: org.name }
  if (org.approval_status === 'suspended') return { state: 'suspended', orgName: org.name }
  // 'rejected', o cualquier valor no reconocido: fail-closed, nunca se
  // trata como activo.
  return { state: 'rejected', orgName: org.name }
}

export function useOrgStatus(user: User | null): { status: OrgStatus; refresh: () => void } {
  const [status, setStatus] = useState<OrgStatus>({ state: 'loading' })

  const refresh = useCallback(() => {
    if (!user) return
    setStatus({ state: 'loading' })
    withTimeout(fetchOrgStatus(user.id), ORG_STATUS_TIMEOUT_MS)
      .then(setStatus)
      .catch(() => setStatus({ state: 'error' }))
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { status, refresh }
}
