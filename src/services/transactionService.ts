import { supabase } from '../lib/supabase'

export type TransactionStatus = 'READY_FOR_PICKUP' | 'VERIFIED' | 'COMPLETED' | 'CANCELLED'

export type Transaction = {
  id: string
  request_id: string
  resource_id: string
  provider_id: string
  seeker_id: string
  quantity: number
  pickup_location: string | null
  pickup_date: string | null
  qr_verified: boolean
  verification_time: string | null
  completed_at: string | null
  status: TransactionStatus
  created_at: string
  resource: { title: string; unit: string; city: string | null } | null
}

export async function listTransactions(profileId: string, role: 'ADMIN' | 'PROVIDER' | 'SEEKER') {
  let query = supabase
    .from('transactions')
    .select('id, request_id, resource_id, provider_id, seeker_id, quantity, pickup_location, pickup_date, qr_verified, verification_time, completed_at, status, created_at, resource:resources(title, unit, city)')
    .order('created_at', { ascending: false })
  if (role === 'PROVIDER') query = query.eq('provider_id', profileId)
  if (role === 'SEEKER') query = query.eq('seeker_id', profileId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((item) => ({ ...item, resource: Array.isArray(item.resource) ? item.resource[0] ?? null : item.resource })) as unknown as Transaction[]
}

export async function issueTransactionQr(transactionId: string) {
  const { data, error } = await supabase.rpc('issue_transaction_qr', { p_transaction_id: transactionId })
  if (error) throw error
  return data as string
}

export async function verifyTransactionQr(token: string) {
  const { data, error } = await supabase.rpc('verify_transaction_qr', { p_token: token })
  if (error) throw error
  return data as string
}

export async function completeTransaction(transactionId: string) {
  const { data, error } = await supabase.rpc('complete_transaction', { p_transaction_id: transactionId })
  if (error) throw error
  return data as string
}
