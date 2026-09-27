import { supabase } from '../lib/supabase'
import type { Profile } from '../features/auth/AuthContext'

type AnalyticsRow = {
  id: string
  quantity: number
  status: string
  created_at: string
  category: { name: string } | null
}

type TransactionRow = {
  id: string
  quantity: number
  status: string
  created_at: string
  completed_at: string | null
  resource: { title: string; unit: string } | null
}

export type AnalyticsData = {
  resources: AnalyticsRow[]
  transactions: TransactionRow[]
  requests: Array<{ id: string; status: string; requested_at: string }>
  sustainability: Array<{ resource_quantity: number; estimated_waste_avoided: number; estimated_carbon_impact: number }>
}

export async function loadAnalytics(profile: Profile): Promise<AnalyticsData> {
  let resourceQuery = supabase.from('resources').select('id, quantity, status, created_at, category:resource_categories(name)').order('created_at', { ascending: true })
  let requestQuery = supabase.from('requests').select('id, status, requested_at, resource:resources!inner(provider_id)').order('requested_at', { ascending: true })
  let transactionQuery = supabase.from('transactions').select('id, quantity, status, created_at, completed_at, resource:resources(title, unit)').order('created_at', { ascending: true })
  let sustainabilityQuery = supabase.from('sustainability_records').select('resource_quantity, estimated_waste_avoided, estimated_carbon_impact')

  if (profile.role === 'PROVIDER') {
    resourceQuery = resourceQuery.eq('provider_id', profile.id)
    requestQuery = requestQuery.eq('resources.provider_id', profile.id)
    transactionQuery = transactionQuery.eq('provider_id', profile.id)
    // RLS filters sustainability records through their related transaction.
  } else if (profile.role === 'SEEKER') {
    resourceQuery = resourceQuery.eq('status', 'AVAILABLE')
    requestQuery = requestQuery.eq('seeker_id', profile.id)
    transactionQuery = transactionQuery.eq('seeker_id', profile.id)
    // RLS filters sustainability records through their related transaction.
  }

  const [resources, requests, transactions, sustainability] = await Promise.all([resourceQuery, requestQuery, transactionQuery, sustainabilityQuery])
  const firstError = resources.error || requests.error || transactions.error || sustainability.error
  if (firstError) throw firstError

  return {
    resources: (resources.data ?? []) as unknown as AnalyticsRow[],
    requests: requests.data ?? [],
    transactions: (transactions.data ?? []) as unknown as TransactionRow[],
    sustainability: sustainability.data ?? [],
  }
}
