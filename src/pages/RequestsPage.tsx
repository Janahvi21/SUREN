import { Check, ClipboardList, QrCode, RefreshCw, ShieldCheck, UserRound, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { supabase } from '../lib/supabase'
import { cancelResourceRequest, listRequests, reviewResourceRequest, type ResourceRequest } from '../services/requestService'
import { issueTransactionQr } from '../services/transactionService'

type RequestQr = { token: string; expiresAt: string }

function statusClass(status: ResourceRequest['status']) {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-red-50 text-red-700'
  return 'bg-amber-50 text-amber-700'
}

function statusLabel(status: ResourceRequest['status']) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function paymentSummary(request: ResourceRequest) {
  if (request.exchange_type_at_request === 'FREE') {
    return { price: 'FREE · ₹0', payment: 'Not Applicable · no payment required' }
  }
  if (request.exchange_type_at_request === null) {
    return { price: 'Price snapshot unavailable', payment: 'Payment status unavailable' }
  }
  if (request.price_per_unit_at_request === null) {
    return { price: 'Price not specified', payment: request.payment_status.replaceAll('_', ' ') }
  }
  const unit = request.unit_at_request || 'unit'
  const singularUnit = unit.toLowerCase().endsWith('s') ? unit.slice(0, -1) : unit
  const price = `${formatPrice(request.price_per_unit_at_request)} per ${singularUnit}`
  const total = request.total_price_at_request === null ? '' : ` · Total ${formatPrice(request.total_price_at_request)}`
  return { price: `${request.exchange_type_at_request} · ${price}${total}`, payment: request.payment_status.replaceAll('_', ' ') }
}

function requestDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-IN')
}

export function RequestsPage() {
  const { profile } = useAuth()
  const profileId = profile?.id
  const role = profile?.role
  const [requests, setRequests] = useState<ResourceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [qrTokens, setQrTokens] = useState<Record<string, RequestQr>>({})
  const [qrErrors, setQrErrors] = useState<Record<string, string>>({})
  const issuedQrIds = useRef(new Set<string>())

  const loadRequests = useCallback(async (silent = false) => {
    if (!profileId || !role) return
    if (!silent) setLoading(true)
    setError('')
    try {
      setRequests(await listRequests())
    } catch (loadError) {
      console.error('Unable to load requests', loadError)
      setError('Requests could not be loaded. Apply the latest SUREN database migrations and check your connection.')
    } finally {
      setLoading(false)
    }
  }, [profileId, role])

  const loadQr = useCallback(async (request: ResourceRequest) => {
    if (!request.transaction_id || request.transaction_status !== 'READY_FOR_PICKUP') return
    setQrErrors((current) => ({ ...current, [request.id]: '' }))
    try {
      const qr = await issueTransactionQr(request.transaction_id)
      setQrTokens((current) => ({ ...current, [request.id]: qr }))
    } catch (qrError) {
      console.error('Unable to issue request QR', qrError)
      issuedQrIds.current.delete(request.id)
      setQrErrors((current) => ({
        ...current,
        [request.id]: 'Pickup QR could not be generated. Refresh to try again.',
      }))
    }
  }, [])

  useEffect(() => {
    issuedQrIds.current.clear()
    setQrTokens({})
    setQrErrors({})
    void loadRequests()
  }, [loadRequests])

  useEffect(() => {
    if (!profileId || !role) return
    const channel = supabase.channel(`requests:${profileId}`)
    const requestFilter = role === 'SEEKER'
      ? `seeker_id=eq.${profileId}`
      : role === 'PROVIDER'
        ? `provider_id=eq.${profileId}`
        : undefined

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'requests',
      ...(requestFilter ? { filter: requestFilter } : {}),
    }, () => { void loadRequests(true) })
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${profileId}`,
    }, () => { void loadRequests(true) })
    void channel.subscribe()
    const refreshTimer = window.setInterval(() => { void loadRequests(true) }, 30_000)
    return () => {
      window.clearInterval(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [loadRequests, profileId, role])

  useEffect(() => {
    if (role !== 'SEEKER') return
    for (const request of requests) {
      if (request.status !== 'APPROVED'
        || request.transaction_status !== 'READY_FOR_PICKUP'
        || !request.transaction_id
        || issuedQrIds.current.has(request.id)) continue
      issuedQrIds.current.add(request.id)
      void loadQr(request)
    }
  }, [loadQr, requests, role])

  async function review(requestId: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(requestId)
    setError('')
    try {
      await reviewResourceRequest(requestId, decision)
      await loadRequests(true)
    } catch (reviewError) {
      console.error('Unable to review request', reviewError)
      const message = reviewError instanceof Error ? reviewError.message : ''
      setError(message || 'This request could not be updated. It may already have been reviewed or the resource quantity changed.')
    } finally {
      setBusyId('')
    }
  }

  async function cancel(requestId: string) {
    setBusyId(requestId)
    setError('')
    try {
      await cancelResourceRequest(requestId)
      await loadRequests(true)
    } catch (cancelError) {
      console.error('Unable to cancel request', cancelError)
      setError(cancelError instanceof Error ? cancelError.message : 'This request could not be cancelled. It may already have been reviewed.')
    } finally {
      setBusyId('')
    }
  }

  const canReview = role === 'PROVIDER' || role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">{canReview ? 'Provider workspace' : 'Seeker workspace'}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{canReview ? 'Received Requests' : 'My Requests'}</h1>
          <p className="mt-2 text-sm text-slate-600">{canReview ? 'Review requests for the resources you provide.' : 'Track decisions, payment status, and pickup verification.'}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadRequests()}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading requests...</div>}
      {!loading && !error && requests.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-medium text-slate-800">No requests yet</p><p className="mt-1 text-sm text-slate-500">New request activity will appear here.</p></div>}

      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => {
            const payment = paymentSummary(request)
            const isBusy = busyId === request.id
            const personName = canReview ? request.seeker_name || 'Seeker' : request.provider_name || 'Provider'
            const personImage = canReview ? request.seeker_image : request.provider_image
            const qr = qrTokens[request.id]
            return (
              <article key={request.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start">
                  {request.resource_image
                    ? <img src={request.resource_image} alt={request.resource_title} className="h-40 w-full rounded-xl object-cover lg:w-48" loading="lazy" />
                    : <div className="grid h-32 w-full place-items-center rounded-xl bg-emerald-50 text-emerald-700 lg:w-48"><ClipboardList className="h-8 w-8" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">{request.resource_title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(request.status)}`}>{statusLabel(request.status)}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {personImage
                        ? <img src={personImage} alt="" className="h-9 w-9 rounded-full object-cover" />
                        : <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500"><UserRound className="h-4 w-4" /></span>}
                      <div>
                        <p className="text-xs text-slate-500">{canReview ? 'Requested by' : 'Provided by'}</p>
                        <p className="font-semibold text-slate-900">{personName}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>Request ID: <span className="break-all font-mono text-xs text-slate-800">{request.id}</span></p>
                      <p>Requested: {requestDate(request.requested_at)}</p>
                      <p>Quantity: <strong className="text-slate-900">{request.quantity_requested} {request.unit_at_request || request.resource_unit}</strong></p>
                      <p>Location: {request.resource_city || request.resource_location || 'Not set'}</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{payment.price}</p>
                      <p className="mt-1 text-xs text-slate-600">Payment: {payment.payment}</p>
                      {request.exchange_type_at_request !== 'FREE' && <p className="mt-1 text-xs text-slate-500">SUREN does not process payments. Approval does not mean payment is complete.</p>}
                    </div>
                    {request.message && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-100 p-3 text-sm text-slate-600"><strong className="text-slate-800">{canReview ? 'Seeker message' : 'Your message'}:</strong> {request.message}</p>}

                    {!canReview && request.status === 'APPROVED' && request.transaction_status === 'READY_FOR_PICKUP' && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 font-semibold text-emerald-900"><ShieldCheck className="h-4 w-4" />Ready for Verification</div>
                        {qr ? (
                          <div className="mt-3 flex flex-col items-center rounded-xl bg-white p-4">
                            <QRCodeSVG value={qr.token} size={180} includeMargin />
                            <p className="mt-2 text-center text-sm font-medium text-slate-800">Pickup verification QR</p>
                            <p className="mt-1 text-center text-xs text-slate-600">Request {request.id}</p>
                            <p className="mt-1 text-center text-xs text-slate-600">Expires {new Date(qr.expiresAt).toLocaleString('en-IN')}</p>
                            <p className="mt-2 text-center text-xs text-amber-700">Show this QR only to the provider at pickup.</p>
                          </div>
                        ) : (
                          <div className="mt-3">
                            {qrErrors[request.id] && <p className="mb-2 text-sm text-red-700">{qrErrors[request.id]}</p>}
                            <Button size="sm" className="gap-2" onClick={() => { issuedQrIds.current.add(request.id); void loadQr(request) }}><QrCode className="h-4 w-4" />View QR Code</Button>
                          </div>
                        )}
                      </div>
                    )}
                    {!canReview && request.transaction_status === 'VERIFIED' && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700"><ShieldCheck className="h-4 w-4" />Pickup QR verified; awaiting provider handover confirmation.</p>}
                    {!canReview && request.transaction_status === 'COMPLETED' && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700"><ShieldCheck className="h-4 w-4" />Resource handover completed.</p>}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:w-40 lg:flex-col">
                    {canReview && request.status === 'PENDING' && <>
                      <Button size="sm" className="gap-1" disabled={isBusy} onClick={() => void review(request.id, 'APPROVED')}><Check className="h-4 w-4" />Accept request</Button>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={isBusy} onClick={() => void review(request.id, 'REJECTED')}><X className="h-4 w-4" />Reject request</Button>
                    </>}
                    {!canReview && request.status === 'PENDING' && <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={isBusy} onClick={() => void cancel(request.id)}>{isBusy ? 'Cancelling...' : 'Cancel request'}</Button>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
