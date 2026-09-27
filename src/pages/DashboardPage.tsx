import { ArrowUpRight, CheckCircle2, ClipboardList, Package2, Ticket, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth } from '../features/auth/AuthContext'
import { getDashboardActivity, getDashboardStats } from '../services/dashboardService'
import { Link } from 'react-router-dom'

type Stats = Awaited<ReturnType<typeof getDashboardStats>>
type Activity = Awaited<ReturnType<typeof getDashboardActivity>>

export function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<Activity>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    const currentProfile = profile
    let active = true

    async function loadDashboard() {
      try {
        const [nextStats, nextActivity] = await Promise.all([
          getDashboardStats(currentProfile),
          getDashboardActivity(currentProfile),
        ])
        if (!active) return
        setStats(nextStats)
        setActivity(nextActivity)
      } catch (loadError) {
        console.error('Unable to load dashboard data', loadError)
        if (active) setError('Dashboard data could not be loaded. Check that the Supabase schema is applied.')
      }
    }

    void loadDashboard()
    return () => {
      active = false
    }
  }, [profile])

  const isAdmin = profile?.role === 'ADMIN'
  const statsCards = [
    { label: isAdmin ? 'Total resources' : 'Resources in view', value: stats?.resources, icon: Package2 },
    { label: isAdmin ? 'Registered users' : 'Available resources', value: isAdmin ? stats?.activeUsers : stats?.availableResources, icon: Users },
    { label: 'Pending requests', value: stats?.pendingRequests, icon: Ticket },
    { label: 'Completed exchanges', value: stats?.completedTransactions, icon: CheckCircle2 },
  ]

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-5 text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? '...'}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Platform activity</h3>
            <span className="text-sm text-slate-500">Live database totals</span>
          </div>
          <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            <div className="text-center">
              <ClipboardList className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
              <p>Live totals are ready for deeper analysis.</p>
              <Link to="/dashboard/analytics" className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800">Open analytics workspace</Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
          <div className="mt-5 space-y-4">
            {activity.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No requests yet.</p>}
            {activity.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
