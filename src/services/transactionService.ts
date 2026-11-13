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
  qr_token_expires_at: string | null
  resource: { title: string; unit: string; city: string | null; image_url: string | null } | null
}

export type TransactionQr = { token: string; expires_at: string }

export type VerifiedTransaction = {
  transaction_id: string
  request_id: string
  seeker_name: string
  seeker_image: string | null
  resource_title: string
  resource_image: string | null
  quantity: number
  unit: string
  provider_name: string
  request_status: string
  token_expires_at: string
  exchange_type: string
  total_price: number | null
  payment_status: string
}

export async function listTransactions(profileId: string, role: 'ADMIN' | 'PROVIDER' | 'SEEKER') {
  let query = supabase
    .from('transactions')
    .select('id, request_id, resource_id, provider_id, seeker_id, quantity, pickup_location, pickup_date, qr_verified, verification_time, completed_at, status, created_at, qr_token_expires_at, resource:resources(title, unit, city, image_url)')
    .order('created_at', { ascending: false })
  if (role === 'PROVIDER') query = query.eq('provider_id', profileId)
  if (role === 'SEEKER') query = query.eq('seeker_id', profileId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((item) => ({ ...item, resource: Array.isArray(item.resource) ? item.resource[0] ?? null : item.resource })) as unknown as Transaction[]
}

export async function issueTransactionQr(transactionId: string): Promise<{ token: string; expiresAt: string }> {
  const { data, error } = await supabase.rpc('issue_transaction_qr', { p_transaction_id: transactionId })
  if (error) throw error
  const qr = data as TransactionQr | null
  if (!qr?.token || !qr.expires_at) throw new Error('The pickup QR was not returned.')
  return { token: qr.token, expiresAt: qr.expires_at }
}

export async function verifyTransactionQr(token: string): Promise<VerifiedTransaction> {
  const { data, error } = await supabase.rpc('verify_transaction_qr', { p_token: token })
  if (error) throw error
  const verified = Array.isArray(data) ? data[0] : data
  if (!verified) throw new Error('The pickup QR could not be verified.')
  return verified as VerifiedTransaction
}

export async function completeTransaction(transactionId: string) {
  const { data, error } = await supabase.rpc('complete_transaction', { p_transaction_id: transactionId })
  if (error) throw error
  return data as string
}
