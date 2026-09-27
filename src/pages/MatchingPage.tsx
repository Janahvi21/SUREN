import { Crosshair, MapPin, PackageCheck, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { listCategories } from '../services/resourceService'
import { listResources, type Resource, type ResourceCategory } from '../services/resourceService'
import { rankResources, type MatchCriteria } from '../services/matchingService'

const initialCriteria: MatchCriteria = { category: '', city: '', quantity: 1 }

export function MatchingPage() {
  const { profile } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [criteria, setCriteria] = useState(initialCriteria)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    const currentProfile = profile
    async function load() {
      try {
        const [nextResources, nextCategories] = await Promise.all([listResources(currentProfile.id, true), listCategories()])
        setResources(nextResources)
        setCategories(nextCategories)
      } catch (loadError) { console.error(loadError); setError('Matching data could not be loaded.') } finally { setLoading(false) }
    }
    void load()
  }, [profile])

  const matches = useMemo(() => rankResources(resources, criteria), [criteria, resources])

  return <div className="space-y-6"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Smart discovery</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Find the best match</h1><p className="mt-2 text-sm text-slate-600">Rule-based matching scores category, city, quantity, and current availability.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-center gap-2"><Crosshair className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold text-slate-900">Your requirements</h2></div><div className="grid gap-4 md:grid-cols-4"><label className="text-sm font-medium text-slate-700">Category<select className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" value={criteria.category} onChange={(event) => setCriteria((current) => ({ ...current, category: event.target.value }))}><option value="">Any category</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">City<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" value={criteria.city} onChange={(event) => setCriteria((current) => ({ ...current, city: event.target.value }))} placeholder="Mumbai" /></label><label className="text-sm font-medium text-slate-700">Quantity<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" type="number" min="0.01" step="0.01" value={criteria.quantity} onChange={(event) => setCriteria((current) => ({ ...current, quantity: Number(event.target.value) }))} /></label><Button className="mt-auto gap-2" onClick={() => setSearched(true)}><Search className="h-4 w-4" />Find matches</Button></div><p className="mt-4 text-xs text-slate-500">Score weighting: category 40%, city 25%, quantity 20%, availability 15%.</p></div>{error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading available resources...</div>}{!loading && !searched && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Enter requirements to see ranked resource matches.</div>}{!loading && searched && matches.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No available resources match those requirements.</div>}{searched && matches.length > 0 && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{matches.map((resource) => <article key={resource.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">{resource.category?.name ?? 'Resource'}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{resource.title}</h2></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">{resource.matchScore}%</span></div><p className="mt-3 text-sm text-slate-600">{resource.quantity} {resource.unit} available</p><p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-600" />{resource.location || resource.city || 'Location unavailable'}</p><div className="mt-4 flex flex-wrap gap-2">{resource.matchReasons.map((reason) => <span key={reason} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{reason}</span>)}</div><Button asChild variant="outline" className="mt-5 w-full gap-2"><Link to="/dashboard/resources"><PackageCheck className="h-4 w-4" />View resources</Link></Button></article>)}</div>}</div>
}
