import { supabase } from '../lib/supabase'
import type { Profile } from '../features/auth/AuthContext'

type DashboardStats = {
  resources: number
  activeUsers: number
  pendingRequests: number
  completedTransactions: number
  availableResources: number
}

type DashboardActivity = {
  id: string
  title: string
  detail: string
  createdAt: string
}

async function countRows(table: string, filters: Array<[string, string, string]> = []) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  for (const [column, operator, value] of filters) {
    if (operator === 'eq') query = query.eq(column, value)
  }
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function getDashboardStats(profile: Profile): Promise<DashboardStats> {
  if (profile.role === 'ADMIN') {
    const [resources, activeUsers, pendingRequests, completedTransactions, availableResources] = await Promise.all([
      countRows('resources'),
      countRows('profiles'),
      countRows('requests', [['status', 'eq', 'PENDING']]),
      countRows('transactions', [['status', 'eq', 'COMPLETED']]),
      countRows('resources', [['status', 'eq', 'AVAILABLE']]),
    ])
    return { resources, activeUsers, pendingRequests, completedTransactions, availableResources }
  }

  if (profile.role === 'PROVIDER') {
    const [resources, pendingRequests, completedTransactions, availableResources] = await Promise.all([
      countRows('resources', [['provider_id', 'eq', profile.id]]),
      countRows('requests', [['status', 'eq', 'PENDING']]),
      countRows('transactions', [['provider_id', 'eq', profile.id], ['status', 'eq', 'COMPLETED']]),
      countRows('resources', [['provider_id', 'eq', profile.id], ['status', 'eq', 'AVAILABLE']]),
    ])
    return { resources, activeUsers: 0, pendingRequests, completedTransactions, availableResources }
  }

  const [resources, pendingRequests, completedTransactions] = await Promise.all([
    countRows('resources', [['status', 'eq', 'AVAILABLE']]),
    countRows('requests', [['seeker_id', 'eq', profile.id], ['status', 'eq', 'PENDING']]),
    countRows('transactions', [['seeker_id', 'eq', profile.id], ['status', 'eq', 'COMPLETED']]),
  ])
  return { resources, activeUsers: 0, pendingRequests, completedTransactions, availableResources: resources }
}

export async function getDashboardActivity(profile: Profile): Promise<DashboardActivity[]> {
  let query = supabase
    .from('requests')
    .select('id, status, requested_at, resource:resources(title)')
    .order('requested_at', { ascending: false })
    .limit(5)

  if (profile.role === 'SEEKER') query = query.eq('seeker_id', profile.id)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((request) => {
    const resource = Array.isArray(request.resource) ? request.resource[0] : request.resource
    return {
      id: request.id,
      title: resource?.title ?? 'Resource request',
      detail: `Request status: ${request.status}`,
      createdAt: request.requested_at,
    }
  })
}
