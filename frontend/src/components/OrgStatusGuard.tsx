import type { ReactNode } from 'react'
import type { OrgStatus } from '@/hooks/useOrgStatus'
import NoOrganization from '@/components/org/NoOrganization'
import PendingApproval from '@/components/org/PendingApproval'
import RejectedOrg from '@/components/org/RejectedOrg'
import SuspendedOrg from '@/components/org/SuspendedOrg'

interface OrgStatusGuardProps {
  status: OrgStatus
  onRefresh: () => void
  children: ReactNode
}

// Esta SPA no usa router (rutas parseadas a mano en App.tsx, ver
// getLayoutIdFromPath) — este componente es el único choke point entre
// login y el resto de la app (dashboard + editor), cubriendo ambas vistas
// por igual. Switch fail-closed sobre los 4 valores de
// organizations.approval_status: cualquier valor no reconocido llega acá
// ya normalizado a 'rejected' desde useOrgStatus, nunca se renderiza
// como activo.
export default function OrgStatusGuard({ status, onRefresh, children }: OrgStatusGuardProps) {
  if (status.state === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white text-sm opacity-50">Verificando acceso...</div>
    </div>
  )

  if (status.state === 'error') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
      <div className="text-white text-sm opacity-70">No se pudo verificar el estado de tu organización.</div>
      <button
        onClick={onRefresh}
        className="px-4 py-2 rounded-lg border border-slate-700/60 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )

  if (status.state === 'no-org') return <NoOrganization onCreated={onRefresh} />
  if (status.state === 'pending') return <PendingApproval orgName={status.orgName} />
  if (status.state === 'suspended') return <SuspendedOrg orgName={status.orgName} />
  if (status.state === 'rejected') return <RejectedOrg orgName={status.orgName} />

  return <>{children}</>
}
