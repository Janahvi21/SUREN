import type { ReactNode } from 'react'
import { BarChart3, BrainCircuit, ClipboardList, CreditCard, Crosshair, LayoutDashboard, LogOut, MapPinned, PackageCheck, UserRound, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Button } from '../ui/button'
import { useAuth } from '../../features/auth/AuthContext'
import { NotificationBell } from '../notifications/NotificationBell'
import { usePreferences } from '../../features/preferences/PreferencesContext'

const navItems = [
  { key: 'overview', to: '/dashboard', icon: LayoutDashboard },
  { key: 'resources', to: '/dashboard/resources', icon: PackageCheck },
  { key: 'requests', to: '/dashboard/requests', icon: ClipboardList },
  { key: 'transactions', to: '/dashboard/transactions', icon: CreditCard },
  { key: 'analytics', to: '/dashboard/analytics', icon: BarChart3 },
  { key: 'demand', to: '/dashboard/demand', icon: BrainCircuit },
  { key: 'matching', to: '/dashboard/matching', icon: Crosshair },
  { key: 'users', to: '/dashboard/users', icon: Users },
  { key: 'map', to: '/dashboard/map', icon: MapPinned },
  { key: 'profile', to: '/dashboard/profile', icon: UserRound },
  { key: 'settings', to: '/dashboard/settings', icon: UserRound },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const { t } = usePreferences()

  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 border-r border-slate-200 bg-white/80 p-6 backdrop-blur md:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
              S
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">
                SUREN
              </p>
              <h1 className="text-lg font-semibold text-slate-900">Operations</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ key, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {t(key as Parameters<typeof t>[0])}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              System note
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Live Supabase data is connected. Resource workflows are now available.
            </p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Urban Resource Exchange Network
                </p>
                <h2 className="text-xl font-semibold text-slate-900">{t('dashboard')}</h2>
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />
                <Button variant="outline" className="gap-2" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  {t('signOut')}
                </Button>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-emerald-900">Welcome, {profile?.full_name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">{profile?.role}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700">Profile connected</span>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
