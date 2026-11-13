import { useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck, CalendarDays, CheckCircle2, Clock3, MapPin, Package, Phone, ShieldCheck, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../ui/button'
import { useAuth } from '../../features/auth/AuthContext'
import { createResourceRequest } from '../../services/requestService'
import { getResourceContactAccess, type Resource } from '../../services/resourceService'

function pricePerUnit(unit: string) {
  const singular = unit.toLowerCase().endsWith('s') ? unit.slice(0, -1) : unit
  return `per ${singular || unit}`
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function postedDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

function availabilityLabel(resource: Resource) {
  if (resource.quantity <= 0) return 'Out of stock'
  const { status } = resource
  if (status === 'PARTIALLY_ALLOCATED') return 'Partially allocated'
  return status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())
}

export function ResourceDetailsModal({
  resource,
  canRequest,
  onClose,
  onRequestCreated,
}: {
  resource: Resource
  canRequest: boolean
  onClose: () => void
  onRequestCreated: () => Promise<void>
}) {
  const { profile } = useAuth()
  const [requesting, setRequesting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestCreated, setRequestCreated] = useState(false)
  const [requestId, setRequestId] = useState('')
  const [contactAccess, setContactAccess] = useState<{ is_authorized: boolean; contact_phone: string | null } | null>(null)
  const [contactError, setContactError] = useState('')
  const [contactLoading, setContactLoading] = useState(true)
  const amount = resource.price

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    let active = true

    getResourceContactAccess(resource.id)
      .then((access) => {
        if (active) setContactAccess(access)
      })
      .catch((error: unknown) => {
        console.error('Unable to load authorized provider contact', error)
        if (active) setContactError('Provider contact details could not be loaded.')
      })
      .finally(() => {
        if (active) setContactLoading(false)
      })

    return () => {
      active = false
    }
  }, [resource.id])

  const isFree = resource.exchange_type === 'FREE'
  const isNegotiable = resource.exchange_type === 'NEGOTIABLE'
  const hasPrice = amount !== null && Number.isFinite(amount)
  const priceLabel = isFree
    ? 'FREE'
    : hasPrice
      ? `${isNegotiable ? 'NEGOTIABLE · ' : 'PAID · '}${formatPrice(amount)} ${pricePerUnit(resource.unit)}`
      : isNegotiable
        ? 'NEGOTIABLE · PRICE NOT SPECIFIED'
        : 'PAID · PRICE NOT SPECIFIED'
  const providerName = resource.provider?.display_name || 'Provider details unavailable'
  const canDisplayContact = contactAccess?.is_authorized === true && !contactError

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestError('')
    setSubmitting(true)
    try {
      const createdRequestId = await createResourceRequest(
        resource.id,
        quantity,
        message,
        resource.exchange_type,
        resource.price,
        resource.unit,
      )
      setRequestId(createdRequestId)
      setRequestCreated(true)
      setRequesting(false)
      void onRequestCreated().catch((error: unknown) => {
        console.error('Unable to refresh resource listings after request', error)
      })
    } catch (error) {
      console.error('Unable to create resource request', error)
      const rpcError = error as { code?: string; message?: string }
      if (rpcError.code === 'PGRST202') {
        setRequestError('The request service is not installed in the connected Supabase project yet. Apply the latest SUREN database migrations.')
      } else if (rpcError.message?.includes('pricing or unit changed')) {
        setRequestError('The listing price or unit changed. Review the refreshed details before trying again.')
      } else if (rpcError.message?.includes('quantity')) {
        setRequestError('The available quantity changed. Review the updated quantity and try again.')
      } else if (rpcError.message?.includes('already have a pending request')) {
        setRequestError('You already have a pending request for this resource. Track it in My Requests.')
      } else if (rpcError.message?.includes('own resource')) {
        setRequestError('You cannot request a resource that you provided.')
      } else {
        setRequestError(rpcError.message || 'Your request could not be submitted. Please try again.')
      }
      void onRequestCreated().catch((refreshError: unknown) => {
        console.error('Unable to refresh resource details after request failure', refreshError)
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-details-title"
        className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-7">
          <p className="text-sm font-semibold text-slate-700">Resource details</p>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close resource details">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {resource.image_url
          ? <img src={resource.image_url} alt={resource.title} className="h-56 w-full object-cover sm:h-72" />
          : <div className="grid h-44 place-items-center bg-emerald-50 text-emerald-700 sm:h-56"><Package className="h-12 w-12" /></div>}

        <div className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{resource.category?.name ?? 'Resource'}</p>
              <h2 id="resource-details-title" className="mt-1 break-words text-2xl font-bold text-slate-900">{resource.title}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isFree ? 'bg-emerald-100 text-emerald-800' : hasPrice ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
                  {priceLabel}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{availabilityLabel(resource)}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:min-w-40">
              <p className="text-xs text-slate-500">Quantity available</p>
              <p className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900"><Package className="h-4 w-4 text-emerald-700" />{resource.quantity} {resource.unit}</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Provider</h3>
              <div className="mt-3 flex items-center gap-3">
                {resource.provider?.profile_image
                  ? <img src={resource.provider.profile_image} alt="" className="h-12 w-12 rounded-full object-cover" />
                  : <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UserRound className="h-5 w-5" /></div>}
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900">{providerName}</p>
                  {resource.provider?.verification_status === 'VERIFIED'
                    ? <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Verified provider</p>
                    : <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" />{resource.provider?.verification_status === 'PENDING' ? 'Verification pending' : resource.provider?.verification_status === 'REJECTED' ? 'Not verified' : 'Verification unavailable'}</p>}
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                {contactLoading && <p className="text-slate-500">Checking contact availability...</p>}
                {!contactLoading && contactError && <p className="text-amber-700">{contactError}</p>}
                {!contactLoading && !contactError && canDisplayContact && contactAccess?.contact_phone && (
                  <a className="flex items-center gap-2 font-medium text-emerald-700 hover:text-emerald-800" href={`tel:${contactAccess.contact_phone}`}>
                    <Phone className="h-4 w-4" />{contactAccess.contact_phone}
                  </a>
                )}
                {!contactLoading && !contactError && canDisplayContact && !contactAccess?.contact_phone && <p className="text-slate-500">The provider has not shared a phone number.</p>}
                {!contactLoading && !contactError && !canDisplayContact && <p className="text-slate-500">Contact details are shared after your request is approved.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Pickup</h3>
              <div className="mt-3 flex gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <p>{resource.location || 'Pickup address not provided'}</p>
                  {resource.landmark && <p className="mt-1 text-slate-600">Landmark: {resource.landmark}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {resource.district && <span>District: {resource.district}</span>}
                    {resource.city && <span>City: {resource.city}</span>}
                    {resource.pincode && <span>PIN: {resource.pincode}</span>}
                  </div>
                </div>
              </div>
              {resource.pickup_instructions && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{resource.pickup_instructions}</p>}
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays className="h-4 w-4" />Posted {postedDate(resource.created_at)}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">About this resource</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{resource.description || 'No description provided.'}</p>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
              <span>Condition: <strong className="text-slate-900">{resource.condition || 'Not specified'}</strong></span>
              {resource.available_from && <span>Available from: <strong className="text-slate-900">{postedDate(resource.available_from)}</strong></span>}
              {resource.expiry_date && <span>Available until: <strong className="text-slate-900">{postedDate(resource.expiry_date)}</strong></span>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Price and payment</h3>
            <p className="mt-2 text-lg font-bold text-slate-900">{isFree ? 'FREE · No payment required' : priceLabel}</p>
            <p className="mt-1 text-sm text-slate-600">{isFree ? 'Payment status: Not applicable.' : 'Payment status: Not tracked by SUREN.'}</p>
            {!isFree && <p className="mt-1 text-sm text-slate-600">{isNegotiable ? 'Confirm the final amount with the provider after approval.' : 'Payment is arranged directly with the provider after approval.'}</p>}
            {!isFree && <p className="mt-2 text-xs text-slate-500">SUREN does not process payments. Payment instructions and any additional charges have not been specified.</p>}
          </section>

          {requestCreated && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-semibold text-emerald-950">Your resource request has been submitted successfully!</p>
                  <p className="mt-1 text-sm text-emerald-800">Your request is pending provider review. Approval does not mean payment has been made.</p>
                  <p className="mt-1 break-all text-xs text-emerald-800">Request ID: {requestId}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-800">Status: PENDING</p>
                  <Link to="/dashboard/requests" onClick={onClose} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 underline underline-offset-2">
                    Track request status <Clock3 className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {requesting && !requestCreated && (
            <form className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" onSubmit={(event) => void submitRequest(event)}>
              <div>
                <h3 className="font-semibold text-emerald-950">Confirm your request</h3>
                <p className="mt-1 text-sm text-emerald-900">You are requesting {resource.title} from {providerName}.</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">{isFree ? 'FREE · No payment required' : priceLabel}</p>
                {!isFree && hasPrice && <p className="mt-1 text-sm text-emerald-900">Estimated total for {quantity} {resource.unit}: <strong>{formatPrice(amount * quantity)}</strong>{isNegotiable ? ' · final price to be confirmed' : ''}</p>}
                {!isFree && <p className="mt-1 text-xs text-emerald-800">No payment is collected now. Payment details are not tracked by SUREN.</p>}
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Quantity
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  type="number"
                  min="0.01"
                  max={resource.quantity}
                  step="0.01"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Message to provider <span className="font-normal text-slate-500">(optional)</span>
                <textarea
                  className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Share any pickup or usage details."
                />
              </label>
              {requestError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{requestError}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setRequesting(false)}>Back to details</Button>
                <Button type="submit" disabled={submitting || !profile || quantity <= 0 || quantity > resource.quantity}>
                  {submitting ? 'Submitting request...' : 'Confirm and send request'}
                </Button>
              </div>
            </form>
          )}

          {canRequest && !requesting && !requestCreated && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="button" onClick={() => setRequesting(true)}>Request resource</Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
