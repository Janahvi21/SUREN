import { supabase } from '../lib/supabase'

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'
export type PaymentStatus =
  | 'NOT_APPLICABLE'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'

export type ResourceRequest = {
  id: string
  resource_id: string
  seeker_id: string
  provider_id: string
  quantity_requested: number
  message: string | null
  status: RequestStatus
  requested_at: string
  updated_at: string
  exchange_type_at_request: 'FREE' | 'PAID' | 'NEGOTIABLE' | null
  price_per_unit_at_request: number | null
  total_price_at_request: number | null
  unit_at_request: string | null
  payment_status: PaymentStatus
  approved_at: string | null
  rejected_at: string | null
  completed_at: string | null
  seeker_name: string | null
  seeker_image: string | null
  provider_name: string | null
  provider_image: string | null
  resource_title: string
  resource_image: string | null
  resource_unit: string
  resource_city: string | null
  resource_location: string | null
  transaction_id: string | null
  transaction_status: 'READY_FOR_PICKUP' | 'VERIFIED' | 'COMPLETED' | 'CANCELLED' | null
  token_expires_at: string | null
  qr_verified: boolean | null
}

export async function createResourceRequest(
  resourceId: string,
  quantity: number,
  message: string,
  exchangeType: 'FREE' | 'PAID' | 'NEGOTIABLE',
  price: number | null,
  unit: string,
) {
  const { data, error } = await supabase.rpc('create_resource_request', {
    p_resource_id: resourceId,
    p_quantity: quantity,
    p_message: message.trim() || null,
    p_expected_exchange_type: exchangeType,
    p_expected_price: price,
    p_expected_unit: unit,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('The request was not returned after submission.')
  return data
}

export async function cancelResourceRequest(requestId: string) {
  const { data, error } = await supabase.rpc('cancel_resource_request', {
    p_request_id: requestId,
  })
  if (error) throw error
  return data as string
}

export async function listRequests() {
  const { data, error } = await supabase.rpc('list_resource_requests')
  if (error) throw error
  return (data ?? []) as ResourceRequest[]
}

export async function reviewResourceRequest(requestId: string, decision: 'APPROVED' | 'REJECTED') {
  const { data, error } = await supabase.rpc('review_resource_request', {
    p_request_id: requestId,
    p_decision: decision,
  })
  if (error) throw error
  return data as string
}
