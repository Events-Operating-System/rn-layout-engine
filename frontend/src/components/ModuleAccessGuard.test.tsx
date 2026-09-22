import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ModuleAccessGuard from './ModuleAccessGuard'

// Test de regresión del guard que cierra el hueco diagnosticado 2026-09-21:
// un rol sin el módulo en su fila de role_module_permissions entraba igual
// porque el único chequeo vivía en CallbackScreen.tsx (rama del handoff),
// nunca en el resto de la app (esta SPA no usa router).

const rpcMock = vi.fn()

vi.mock('@/context/LangContext', () => ({
  useLang: () => ({
    t: {
      verifyingAccess: 'Verificando acceso…',
      callbackBlockedTitle: 'Sin acceso a este módulo',
      callbackBlockedBody: 'Tu cuenta no tiene acceso al módulo de Layout en esta organización.',
    },
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}))

describe('ModuleAccessGuard (layout)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('bloquea cuando module_keys no incluye "layout"', async () => {
    rpcMock.mockResolvedValue({
      data: [{ role_name: 'viewer', module_keys: ['portal_cliente'] }],
      error: null,
    })

    render(
      <ModuleAccessGuard orgId="org-123">
        <div data-testid="children-rendered" />
      </ModuleAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByText('Sin acceso a este módulo')).toBeInTheDocument()
    })
    expect(screen.getByText(/Tu cuenta no tiene acceso al módulo de Layout/)).toBeInTheDocument()
    expect(screen.queryByTestId('children-rendered')).not.toBeInTheDocument()
  })

  it('deja pasar (renderiza los children) cuando module_keys incluye "layout"', async () => {
    rpcMock.mockResolvedValue({
      data: [{ role_name: 'coordinacion', module_keys: ['eventos', 'layout', 'agentes_ai'] }],
      error: null,
    })

    render(
      <ModuleAccessGuard orgId="org-123">
        <div data-testid="children-rendered" />
      </ModuleAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('children-rendered')).toBeInTheDocument()
    })
    expect(screen.queryByText('Sin acceso a este módulo')).not.toBeInTheDocument()
  })

  it('falla cerrado: un error del RPC bloquea, nunca concede acceso', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'network error' } })

    render(
      <ModuleAccessGuard orgId="org-123">
        <div data-testid="children-rendered" />
      </ModuleAccessGuard>,
    )

    await waitFor(() => {
      expect(screen.getByText('Sin acceso a este módulo')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('children-rendered')).not.toBeInTheDocument()
  })
})
