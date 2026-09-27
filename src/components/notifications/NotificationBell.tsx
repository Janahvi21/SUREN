import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../features/auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { listNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from '../../services/notificationService'
import { Button } from '../ui/button'

export function NotificationBell() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!profile) return
    const currentProfile = profile
    let active = true
    const channel = supabase.channel(`notifications:${currentProfile.id}`)

    async function load() {
      const next = await listNotifications(currentProfile.id)
      if (active) setNotifications(next)
    }

    void load()
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
      setNotifications((current) => [payload.new as Notification, ...current].slice(0, 30))
    }).subscribe()

    return () => {
      active = false
      void channel.unsubscribe()
    }
  }, [profile?.id])

  const unread = notifications.filter((notification) => !notification.is_read).length

  async function read(notification: Notification) {
    await markNotificationRead(notification.id)
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
  }

  async function readAll() {
    if (!profile) return
    await markAllNotificationsRead(profile.id)
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }

  return <div className="relative"><Button variant="ghost" size="icon" aria-label="Open notifications" onClick={() => setOpen((value) => !value)}><Bell className="h-4 w-4" />{unread > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}</Button>{open && <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p className="font-semibold text-slate-900">Notifications</p><Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => void readAll()}><CheckCheck className="h-3.5 w-3.5" />Read all</Button></div><div className="max-h-80 overflow-y-auto">{notifications.length === 0 && <p className="p-5 text-sm text-slate-500">No notifications yet.</p>}{notifications.slice(0, 6).map((notification) => <button key={notification.id} type="button" className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${notification.is_read ? 'bg-white' : 'bg-emerald-50/60'}`} onClick={() => void read(notification)}><p className="text-sm font-medium text-slate-900">{notification.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(notification.created_at).toLocaleString()}</p></button>)}</div><Link to="/dashboard/notifications" className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-emerald-700 hover:bg-slate-50" onClick={() => setOpen(false)}>View all notifications</Link></div>}</div>
}
