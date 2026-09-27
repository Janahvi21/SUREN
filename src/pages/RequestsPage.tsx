import { Check, ClipboardList, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { listRequests, reviewResourceRequest, type ResourceRequest } from '../services/requestService'

function statusClass(status: ResourceRequest['status']) {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-red-50 text-red-700'
  return 'bg-amber-50 text-amber-700'
}

export function RequestsPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<ResourceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function loadRequests() {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      setRequests(await listRequests(profile.id, profile.role))
    } catch (loadError) {
      console.error('Unable to load requests', loadError)
      setError('Requests could not be loaded. Confirm that the request migration has been run.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [profile?.id, profile?.role])

  async function review(requestId: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(requestId)
    setError('')
    try {
      await reviewResourceRequest(requestId, decision)
      await loadRequests()
    } catch (reviewError) {
      console.error('Unable to review request', reviewError)
      setError('This request could not be updated. It may already have been reviewed or the resource quantity changed.')
    } finally {
      setBusyId('')
    }
  }

  const canReview = profile?.role === 'PROVIDER' || profile?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">{canReview ? 'Review queue' : 'Seeker workspace'}</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{canReview ? 'Incoming requests' : 'My requests'}</h1><p className="mt-2 text-sm text-slate-600">{canReview ? 'Review demand against the resources you have made available.' : 'Track the resources you have requested and their approval status.'}</p></div>
        <Button variant="outline" className="gap-2" onClick={() => void loadRequests()}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading requests...</div>}
      {!loading && requests.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-medium text-slate-800">No requests yet</p><p className="mt-1 text-sm text-slate-500">New request activity will appear here.</p></div>}

      {!loading && requests.length > 0 && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{requests.map((request) => <div key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold text-slate-900">{request.resource?.title ?? 'Resource request'}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(request.status)}`}>{request.status}</span></div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600"><span>Quantity: <strong className="text-slate-900">{request.quantity_requested} {request.resource?.unit ?? 'units'}</strong></span><span>Location: {request.resource?.city || request.resource?.location || 'Not set'}</span><span>{new Date(request.requested_at).toLocaleDateString()}</span></div>{request.message && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{request.message}</p>}</div>{canReview && request.status === 'PENDING' && <div className="flex shrink-0 gap-2"><Button size="sm" className="gap-1" disabled={busyId === request.id} onClick={() => void review(request.id, 'APPROVED')}><Check className="h-4 w-4" />Approve</Button><Button size="sm" variant="outline" className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={busyId === request.id} onClick={() => void review(request.id, 'REJECTED')}><X className="h-4 w-4" />Reject</Button></div>}</div>)}</div></div>}
    </div>
  )
}
