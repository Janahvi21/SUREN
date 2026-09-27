import { Download, RefreshCw, Recycle, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { loadAnalytics, type AnalyticsData } from '../services/analyticsService'

const colors = ['#059669', '#0f766e', '#0891b2', '#d97706', '#64748b', '#be123c']

function csvEscape(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

export function AnalyticsPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    if (!profile) return
    setLoading(true)
    setError('')
    try { setData(await loadAnalytics(profile)) } catch (loadError) { console.error(loadError); const analyticsError = loadError as { message?: string }; setError(analyticsError.message ? `Analytics could not be loaded: ${analyticsError.message}` : 'Analytics could not be loaded.') } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [profile?.id, profile?.role])

  const summary = useMemo(() => {
    if (!data) return { resources: 0, available: 0, requests: 0, completed: 0, quantity: 0, waste: 0, carbon: 0 }
    return {
      resources: data.resources.length,
      available: data.resources.filter((item) => item.status === 'AVAILABLE' || item.status === 'PARTIALLY_ALLOCATED').length,
      requests: data.requests.filter((item) => item.status === 'PENDING').length,
      completed: data.transactions.filter((item) => item.status === 'COMPLETED').length,
      quantity: data.transactions.filter((item) => item.status === 'COMPLETED').reduce((total, item) => total + Number(item.quantity), 0),
      waste: data.sustainability.reduce((total, item) => total + Number(item.estimated_waste_avoided), 0),
      carbon: data.sustainability.reduce((total, item) => total + Number(item.estimated_carbon_impact), 0),
    }
  }, [data])

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const resource of data?.resources ?? []) {
      const name = resource.category?.name ?? 'Other'
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count }))
  }, [data])

  const monthlyData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const transaction of data?.transactions ?? []) {
      const month = new Date(transaction.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      counts.set(month, (counts.get(month) ?? 0) + 1)
    }
    return [...counts.entries()].map(([month, exchanges]) => ({ month, exchanges })).slice(-6)
  }, [data])

  function exportCsv() {
    if (!data) return
    const rows: Array<Array<string | number>> = [['resource_id', 'category', 'quantity', 'status', 'created_at']]
    for (const resource of data.resources) rows.push([resource.id, resource.category?.name ?? 'Other', resource.quantity, resource.status, resource.created_at])
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'suren-resource-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const cards = [
    ['Resources tracked', summary.resources],
    ['Available resources', summary.available],
    ['Pending requests', summary.requests],
    ['Completed exchanges', summary.completed],
    ['Quantity exchanged', summary.quantity],
    ['Waste avoided estimate', summary.waste],
  ]

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Supply-chain intelligence</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Analytics</h1><p className="mt-2 text-sm text-slate-600">Live visibility from resource availability to completed exchange.</p></div><div className="flex gap-2"><Button variant="outline" className="gap-2" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Refresh</Button><Button className="gap-2" onClick={exportCsv} disabled={!data}><Download className="h-4 w-4" />Export CSV</Button></div></div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading live analytics...</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></div>)}</div>
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold text-slate-900">Exchange activity</h2></div>{monthlyData.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="exchanges" fill="#059669" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="grid h-64 place-items-center text-sm text-slate-500">Completed and pending exchange activity will appear here.</div>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Resource categories</h2>{categoryData.length ? <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={categoryData} dataKey="count" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>{categoryData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="grid h-64 place-items-center text-sm text-slate-500">No category data yet.</div>}</div>
    </div>
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6"><div className="flex items-start gap-3"><Recycle className="mt-1 h-6 w-6 text-emerald-700" /><div><h2 className="text-lg font-semibold text-emerald-950">Sustainability estimates</h2><p className="mt-1 text-sm text-emerald-800">Waste avoided is based on completed exchange quantities. Carbon impact is a demo quantity-based proxy, not a scientific lifecycle assessment.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-white/80 p-4"><p className="text-sm text-slate-500">Estimated waste avoided</p><p className="mt-1 text-2xl font-bold text-slate-900">{summary.waste} units</p></div><div className="rounded-xl bg-white/80 p-4"><p className="text-sm text-slate-500">Estimated carbon proxy</p><p className="mt-1 text-2xl font-bold text-slate-900">{summary.carbon} points</p></div></div></div></div></div>
  </div>
}
