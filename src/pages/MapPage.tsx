import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

import { useAuth } from '../features/auth/AuthContext'
import { listResources, type Resource } from '../services/resourceService'

const defaultCenter: [number, number] = [19.076, 72.8777]
const markerIcon = new L.Icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })

function MapViewport({ resource, resources }: { resource: Resource | null; resources: Resource[] }) {
  const map = useMap()
  useEffect(() => {
    if (resource?.latitude != null && resource.longitude != null) map.setView([resource.latitude, resource.longitude], 13)
    else if (resources.length > 0) {
      const bounds = L.latLngBounds(resources.map((item) => [item.latitude as number, item.longitude as number]))
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 })
    }
  }, [map, resource, resources])
  return null
}

export function MapPage() {
  const { profile } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [selected, setSelected] = useState<Resource | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    const currentProfile = profile
    async function load() {
      try { setResources(await listResources(currentProfile.id, currentProfile.role !== 'PROVIDER')) } catch (loadError) { console.error(loadError); setError('Map resources could not be loaded.') } finally { setLoading(false) }
    }
    void load()
  }, [profile])

  const mappedResources = useMemo(() => resources.filter((resource) => resource.latitude != null && resource.longitude != null && [resource.title, resource.location, resource.landmark, resource.city, resource.pincode, resource.category?.name].some((value) => value?.toLowerCase().includes(search.toLowerCase()))), [resources, search])

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Location discovery</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Resource map</h1><p className="mt-2 text-sm text-slate-600">Explore public resource locations without exposing private provider addresses.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input className="w-48 bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search map" /></div></div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading map resources...</div>}
    {!loading && mappedResources.length === 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No resources with public coordinates match this search. Resources without a confirmed pin remain available in the resource list.</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><MapContainer center={defaultCenter} zoom={10} scrollWheelZoom className="h-[520px] w-full"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapViewport resource={selected} resources={mappedResources} />{mappedResources.map((resource) => <Marker key={resource.id} position={[resource.latitude as number, resource.longitude as number]} icon={markerIcon} eventHandlers={{ click: () => setSelected(resource) }}><Popup><div className="min-w-48"><p className="font-semibold text-slate-900">{resource.title}</p><p className="mt-1 text-xs text-slate-600">Quantity: {resource.quantity} {resource.unit}</p><p className="mt-1 text-xs text-slate-600">Category: {resource.category?.name ?? 'Resource'}</p><p className="mt-1 text-xs text-slate-600">Pickup: {resource.location || 'Location available'}</p><p className="mt-1 text-xs text-slate-600">{[resource.landmark, resource.city, resource.pincode].filter(Boolean).join(' · ')}</p><p className="mt-1 text-xs font-medium text-emerald-700">Status: {resource.status}</p></div></Popup></Marker>)}</MapContainer></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mappedResources.map((resource) => <button key={resource.id} type="button" className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 ${selected?.id === resource.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`} onClick={() => setSelected(resource)}><div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-semibold text-slate-900">{resource.title}</p><p className="mt-1 text-sm text-slate-600">{resource.quantity} {resource.unit} · {resource.category?.name ?? 'Resource'}</p><p className="mt-1 text-xs text-slate-500">{resource.location || 'Public location'}</p><p className="text-xs text-slate-500">{[resource.landmark, resource.city, resource.pincode].filter(Boolean).join(' · ')}</p></div></div></button>)}</div>
  </div>
}
