import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthState } from '@/lib/auth'
import { roleHome } from '@/lib/roles'
import type { Role } from '@/types'

export function ProtectedRoute({ allow }: { allow?: Role[] }) {
  const { session, user, role, loading } = useAuthState()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session || !user || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to={roleHome[role]} replace />
  }

  return <Outlet />
}
