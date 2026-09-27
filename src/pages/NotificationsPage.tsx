import { CheckCheck, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { listNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from '../services/notificationService'

export function NotificationsPage() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    if (!profile) return
    setLoading(true)
    setError('')
    try { setNotifications(await listNotifications(profile.id)) } catch (loadError) { console.error(loadError); setError('Notifications could not be loaded.') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [profile?.id])

  async function read(id: string) {
    await markNotificationRead(id)
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item))
  }

  async function readAll() {
    if (!profile) return
    await markAllNotificationsRead(profile.id)
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Activity center</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Notifications</h1><p className="mt-2 text-sm text-slate-600">Updates about requests, approvals, pickups, and completed exchanges.</p></div><div className="flex gap-2"><Button variant="outline" className="gap-2" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button><Button variant="outline" className="gap-2" onClick={() => void readAll()}><CheckCheck className="h-4 w-4" />Mark all read</Button></div></div>{error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading notifications...</div>}{!loading && notifications.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No notifications yet.</div>}{!loading && notifications.length > 0 && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{notifications.map((notification) => <button key={notification.id} type="button" onClick={() => void read(notification.id)} className={`w-full border-b border-slate-100 p-5 text-left transition last:border-0 hover:bg-slate-50 ${notification.is_read ? '' : 'bg-emerald-50/60'}`}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{notification.title}</p><p className="mt-1 text-sm text-slate-600">{notification.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</p></div>{!notification.is_read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />}</div></button>)}</div>}</div>
}
