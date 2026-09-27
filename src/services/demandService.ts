import { supabase } from '../lib/supabase'
import type { Profile } from '../features/auth/AuthContext'

export type DemandRecord = { category: string; quantity: number; requestedAt: string }

export async function loadDemandRecords(profile: Profile) {
  let query = supabase
    .from('requests')
    .select('quantity_requested, requested_at, resource:resources!inner(provider_id, category:resource_categories(name))')
    .order('requested_at', { ascending: true })

  if (profile.role === 'PROVIDER') query = query.eq('resources.provider_id', profile.id)
  if (profile.role === 'SEEKER') query = query.eq('seeker_id', profile.id)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((request) => {
    const resource = Array.isArray(request.resource) ? request.resource[0] : request.resource
    const category = Array.isArray(resource?.category) ? resource.category[0] : resource?.category
    return { category: category?.name ?? 'Other', quantity: Number(request.quantity_requested), requestedAt: request.requested_at }
  }) as DemandRecord[]
}
