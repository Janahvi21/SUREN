import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth, type UserRole } from './AuthContext'

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-600">Loading your workspace...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!profile) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 px-6 text-center text-sm text-slate-600">Your profile is still being prepared. Please refresh in a moment.</div>
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
