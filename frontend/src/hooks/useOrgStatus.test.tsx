import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User } from '@/lib/supabase'

const maybeSingle = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }) },
}))

import { useOrgStatus } from './useOrgStatus'

describe('useOrgStatus', () => {
  beforeEach(() => {
    maybeSingle.mockReset()
    maybeSingle.mockResolvedValue({
      data: { org_id: 'o1', locale: null, organizations: { id: 'o1', name: 'QA', approval_status: 'active', locale: null } },
      error: null,
    })
  })

  it('un objeto user nuevo con el mismo id (token renovado) no recarga ni vuelve a "cargando"', async () => {
    const { result, rerender } = renderHook(({ user }) => useOrgStatus(user), {
      initialProps: { user: { id: 'u1' } as User },
    })
    await waitFor(() => expect(result.current.status.state).toBe('active'))
    rerender({ user: { id: 'u1' } as User })
    expect(result.current.status.state).toBe('active')
    expect(maybeSingle).toHaveBeenCalledTimes(1)
  })
})
