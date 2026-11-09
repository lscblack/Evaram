import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { EmptyState } from '@/shared/ui/EmptyState'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <>{children}</>
}

export function RequirePermission({ perm, children }: { perm: string | string[]; children: ReactNode }) {
  const { can } = useAuth()
  const perms = Array.isArray(perm) ? perm : [perm]
  if (!can(...perms)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Ask an administrator to grant your role the required permission."
      />
    )
  }
  return <>{children}</>
}
