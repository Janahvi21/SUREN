import { RefreshCw, Search, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { listUserProfiles, type UserProfile } from '../services/userService'

export function UsersPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'ALL' | 'PROVIDER' | 'SEEKER'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadUsers() {
    setLoading(true)
    setError('')
    try { setUsers(await listUserProfiles()) } catch (loadError) { console.error(loadError); setError('Users could not be loaded. Admin access is required.') } finally { setLoading(false) }
  }

  useEffect(() => { if (profile?.role === 'ADMIN') void loadUsers() }, [profile?.role])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((user) => (role === 'ALL' || user.role === role) && (!term || [user.full_name, user.email, user.city, user.organization_name].some((value) => value?.toLowerCase().includes(term))))
  }, [role, search, users])

  if (profile?.role !== 'ADMIN') return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Only administrators can view user management.</div>

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Administration</p><h1 className="mt-2 text-3xl font-bold text-slate-900">User management</h1><p className="mt-2 text-sm text-slate-600">Review registered providers and seekers using live profile data.</p></div><Button variant="outline" className="gap-2" onClick={() => void loadUsers()}><RefreshCw className="h-4 w-4" />Refresh</Button></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total users</p><p className="mt-2 text-3xl font-bold text-slate-900">{users.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Providers</p><p className="mt-2 text-3xl font-bold text-slate-900">{users.filter((user) => user.role === 'PROVIDER').length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Seekers</p><p className="mt-2 text-3xl font-bold text-slate-900">{users.filter((user) => user.role === 'SEEKER').length}</p></div></div><div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"><div className="flex flex-1 items-center gap-2"><Search className="h-4 w-4 text-slate-400" /><input className="w-full bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, city, or organization" /></div><select className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="ALL">All roles</option><option value="PROVIDER">Providers</option><option value="SEEKER">Seekers</option></select></div>{error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading users...</div>}{!loading && filteredUsers.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><UsersIcon className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm text-slate-500">No users match this filter.</p></div>}{!loading && filteredUsers.length > 0 && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{filteredUsers.map((user) => <div key={user.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-semibold text-slate-900">{user.full_name}</p><p className="text-sm text-slate-600">{user.email}</p><p className="mt-1 text-xs text-slate-500">{[user.organization_name, user.city].filter(Boolean).join(' · ') || 'No organization or city provided'}</p></div></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{user.role}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{user.verification_status}</span><span className="hidden text-xs text-slate-400 sm:inline">{new Date(user.created_at).toLocaleDateString()}</span></div></div>)}</div></div>}</div>
}
