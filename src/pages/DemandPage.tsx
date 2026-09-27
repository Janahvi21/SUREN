import { BrainCircuit, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { loadDemandRecords, type DemandRecord } from '../services/demandService'

export function DemandPage() {
  const { profile } = useAuth()
  const [records, setRecords] = useState<DemandRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    if (!profile) return
    setLoading(true)
    setError('')
    try { setRecords(await loadDemandRecords(profile)) } catch (loadError) { console.error(loadError); setError('Demand data could not be loaded.') } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [profile?.id, profile?.role])

  const categoryData = useMemo(() => {
    const totals = new Map<string, number>()
    for (const record of records) totals.set(record.category, (totals.get(record.category) ?? 0) + record.quantity)
    return [...totals.entries()].map(([category, quantity]) => ({ category, quantity: Number(quantity.toFixed(2)) })).sort((a, b) => b.quantity - a.quantity)
  }, [records])

  const forecast = categoryData.map((item) => ({ ...item, estimatedNextPeriod: Number((item.quantity / Math.max(records.length, 1) * 7).toFixed(2)) }))

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Demand intelligence</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Demand insights</h1><p className="mt-2 text-sm text-slate-600">Understand what people are requesting from real SUREN request history.</p></div><Button variant="outline" className="gap-2" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Refresh</Button></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><BrainCircuit className="mt-1 h-5 w-5 text-amber-700" /><div><p className="font-semibold text-amber-950">Early-stage rule-based estimate</p><p className="mt-1 text-sm text-amber-800">The next-period estimate is a transparent baseline from observed request volume. It is not an ML prediction and should not be treated as a claim of forecast accuracy.</p></div></div></div>{error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading demand history...</div>}{!loading && records.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No request history is available yet. Demand insights will appear after seekers submit requests.</div>}{!loading && records.length > 0 && <><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Requests observed</p><p className="mt-2 text-3xl font-bold text-slate-900">{records.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Categories requested</p><p className="mt-2 text-3xl font-bold text-slate-900">{categoryData.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Top demand category</p><p className="mt-2 text-xl font-bold text-slate-900">{categoryData[0]?.category}</p></div></div><div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-lg font-semibold text-slate-900">Requested quantity by category</h2><ResponsiveContainer width="100%" height={320}><BarChart data={categoryData} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" /><YAxis type="category" dataKey="category" width={110} /><Tooltip /><Bar dataKey="quantity" fill="#059669" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Baseline estimate</h2><div className="mt-5 space-y-3">{forecast.map((item) => <div key={item.category} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-medium text-slate-900">{item.category}</p><p className="text-xs text-slate-500">Observed: {item.quantity}</p></div><p className="text-sm font-semibold text-emerald-700">{item.estimatedNextPeriod}</p></div>)}</div></div></div></>}</div>
}
