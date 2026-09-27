import { supabase } from '../lib/supabase'

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'

export type ResourceRequest = {
  id: string
  resource_id: string
  seeker_id: string
  quantity_requested: number
  message: string | null
  status: RequestStatus
  requested_at: string
  updated_at: string
  resource: { title: string; unit: string; city: string | null; location: string | null } | null
}

export async function createResourceRequest(resourceId: string, quantity: number, message: string) {
  const { data, error } = await supabase.rpc('create_resource_request', {
    p_resource_id: resourceId,
    p_quantity: quantity,
    p_message: message || null,
  })
  if (error) throw error
  return data as string
}

export async function listRequests(profileId: string, role: 'ADMIN' | 'PROVIDER' | 'SEEKER') {
  let query = supabase
    .from('requests')
    .select('id, resource_id, seeker_id, quantity_requested, message, status, requested_at, updated_at, resource:resources!inner(title, unit, city, location, provider_id)')
    .order('requested_at', { ascending: false })

  if (role === 'SEEKER') query = query.eq('seeker_id', profileId)
  if (role === 'PROVIDER') query = query.eq('resources.provider_id', profileId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((item) => ({
    ...item,
    resource: Array.isArray(item.resource) ? item.resource[0] ?? null : item.resource,
  })) as unknown as ResourceRequest[]
}

export async function reviewResourceRequest(requestId: string, decision: 'APPROVED' | 'REJECTED') {
  const { data, error } = await supabase.rpc('review_resource_request', {
    p_request_id: requestId,
    p_decision: decision,
  })
  if (error) throw error
  return data as string
}