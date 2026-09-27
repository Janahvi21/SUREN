import { supabase } from '../lib/supabase'

export type Notification = {
  id: string
  title: string
  message: string
  type: string | null
  related_id: string | null
  is_read: boolean
  created_at: string
}

export async function listNotifications(profileId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, related_id, is_read, created_at')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(profileId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', profileId).eq('is_read', false)
  if (error) throw error
}
