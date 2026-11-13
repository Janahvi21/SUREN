import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth, type UserRole } from './AuthContext'

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { session, profile, profileError, loading, refreshProfile } = useAuth()
  const location = useLocation()
  const [retrying, setRetrying] = useState(false)

  async function retryProfile() {
    setRetrying(true)
    try {
      await refreshProfile()
    } finally {
      setRetrying(false)
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-600">Loading your workspace...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-700" role={profileError ? 'alert' : 'status'}>
            {profileError || 'Your profile is still being prepared.'}
          </p>
          {profileError && (
            <button
              type="button"
              onClick={() => void retryProfile()}
              disabled={retrying}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {retrying ? 'Retrying...' : 'Try again'}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
