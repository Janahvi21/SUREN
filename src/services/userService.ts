import { supabase } from '../lib/supabase'
import type { UserRole } from '../features/auth/AuthContext'

export type UserProfile = {
  id: string
  full_name: string
  email: string
  role: UserRole
  city: string | null
  organization_name: string | null
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  created_at: string
}

export async function listUserProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, city, organization_name, verification_status, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as UserProfile[]
}
