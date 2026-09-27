import { Edit3, ImagePlus, PackagePlus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import {
  createResource,
  deleteResource,
  listCategories,
  listResources,
  type Resource,
  type ResourceCategory,
  type ResourceInput,
  updateResource,
  updateResourceStatus,
  uploadResourceImage,
} from '../services/resourceService'
import { createResourceRequest } from '../services/requestService'
import { LocationPicker } from '../components/location/LocationPicker'

const emptyForm: ResourceInput = {
  categoryId: '',
  title: '',
  description: '',
  quantity: 1,
  unit: 'kg',
  condition: 'Good',
  location: '',
  landmark: '',
  city: '',
  pincode: '',
  latitude: null,
  longitude: null,
  availableFrom: '',
  expiryDate: '',
  contactPhone: '',
  exchangeType: 'FREE',
  price: null,
}

function ResourceForm({
  categories,
  resource,
  onSaved,
  onCancel,
}: {
  categories: ResourceCategory[]
  resource: Resource | null
  onSaved: () => Promise<void>
  onCancel: () => void
}) {
  const { profile } = useAuth()
  const [form, setForm] = useState<ResourceInput>(emptyForm)
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!resource) {
      setForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' })
      return
    }
    setForm({
      categoryId: resource.category_id,
      title: resource.title,
      description: resource.description ?? '',
      quantity: resource.quantity,
      unit: resource.unit,
      condition: resource.condition ?? 'Good',
      location: resource.location ?? '',
      landmark: resource.landmark ?? '',
      city: resource.city ?? '',
      pincode: resource.pincode ?? '',
      latitude: resource.latitude,
      longitude: resource.longitude,
      availableFrom: resource.available_from ?? '',
      expiryDate: resource.expiry_date ?? '',
      contactPhone: resource.contact_phone ?? '',
      exchangeType: resource.exchange_type,
      price: resource.price,
    })
  }, [categories, resource])

  function updateField(field: keyof ResourceInput, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setError('')
    setSaving(true)
    try {
      if (resource) {
        await updateResource(resource.id, form)
      } else {
        const resourceId = await createResource(profile.id, form)
        if (image) await uploadResourceImage(resourceId, image)
      }
      await onSaved()
      onCancel()
    } catch (saveError) {
      console.error('Unable to save resource', saveError)
      setError('Resource could not be saved. Check your fields and Supabase policies.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Resource listing</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{resource ? 'Edit resource' : 'Add a resource'}</h2>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Close form">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-slate-700">Title<input className={inputClass} value={form.title} onChange={(event) => updateField('title', event.target.value)} required placeholder="e.g. Surplus rice bags" /></label>
        <label className="text-sm font-medium text-slate-700">Category<select className={inputClass} value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)} required><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Quantity<input className={inputClass} type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => updateField('quantity', Number(event.target.value))} required /></label>
        <label className="text-sm font-medium text-slate-700">Unit<select className={inputClass} value={form.unit} onChange={(event) => updateField('unit', event.target.value)}><option>kg</option><option>items</option><option>boxes</option><option>litres</option><option>sets</option></select></label>
        <label className="text-sm font-medium text-slate-700">Condition<select className={inputClass} value={form.condition} onChange={(event) => updateField('condition', event.target.value)}><option>New</option><option>Good</option><option>Usable</option><option>Needs repair</option></select></label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Address<input className={inputClass} value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="SV Road, Vile Parle" required /></label>
        <label className="text-sm font-medium text-slate-700">Landmark<input className={inputClass} value={form.landmark} onChange={(event) => updateField('landmark', event.target.value)} placeholder="Near station road" /></label>
        <label className="text-sm font-medium text-slate-700">City<input className={inputClass} value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="Mumbai" required /></label>
        <label className="text-sm font-medium text-slate-700">Pincode<input className={inputClass} value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{5}" placeholder="400056" required /></label>
        <LocationPicker address={form.location} city={form.city} pincode={form.pincode} landmark={form.landmark} latitude={form.latitude} longitude={form.longitude} onChange={({ latitude, longitude }) => setForm((current) => ({ ...current, latitude, longitude }))} />
        <label className="text-sm font-medium text-slate-700">Available from<input className={inputClass} type="date" value={form.availableFrom} onChange={(event) => updateField('availableFrom', event.target.value)} /></label>
        <label className="text-sm font-medium text-slate-700">Expiry date<input className={inputClass} type="date" value={form.expiryDate} onChange={(event) => updateField('expiryDate', event.target.value)} /></label>
        <label className="text-sm font-medium text-slate-700">Mobile number<input className={inputClass} value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} placeholder="Available after approval" inputMode="tel" /></label>
        <label className="text-sm font-medium text-slate-700">Exchange type<select className={inputClass} value={form.exchangeType} onChange={(event) => updateField('exchangeType', event.target.value)}><option value="FREE">Free</option><option value="PAID">Paid</option><option value="NEGOTIABLE">Negotiable</option></select></label>
        {form.exchangeType !== 'FREE' && <label className="text-sm font-medium text-slate-700">Expected amount<input className={inputClass} type="number" min="0" step="0.01" value={form.price ?? ''} onChange={(event) => updateField('price', event.target.value === '' ? '' : Number(event.target.value))} placeholder="₹" /></label>}
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Description<textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Describe what is available and any pickup requirements." /></label>
        {!resource && <label className="text-sm font-medium text-slate-700 md:col-span-2">Image<input className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-700`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>}

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</p>}
        <div className="flex justify-end gap-3 md:col-span-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : resource ? 'Save changes' : 'Publish resource'}</Button></div>
      </form>
    </div>
  )
}

function RequestForm({ resource, onSubmitted, onCancel }: { resource: Resource; onSubmitted: () => Promise<void>; onCancel: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createResourceRequest(resource.id, quantity, message)
      await onSubmitted()
      onCancel()
    } catch (requestError) {
      console.error('Unable to create resource request', requestError)
      setError('Request could not be submitted. The available quantity may have changed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div><p className="text-sm font-semibold text-emerald-950">Request {resource.title}</p><p className="text-xs text-emerald-800">Available: {resource.quantity} {resource.unit}</p></div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Close request form"><X className="h-4 w-4" /></Button>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">Quantity<input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" type="number" min="0.01" max={resource.quantity} step="0.01" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required /></label>
        <label className="block text-sm font-medium text-slate-700">Message<textarea className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell the provider what this resource is needed for." /></label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button><Button type="submit" size="sm" disabled={saving}>{saving ? 'Submitting...' : 'Submit request'}</Button></div>
      </form>
    </div>
  )
}

export function ResourcesPage() {
  const { profile } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [editing, setEditing] = useState<Resource | null>(null)
  const [requesting, setRequesting] = useState<Resource | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canManage = profile?.role === 'PROVIDER' || profile?.role === 'ADMIN'
  const canSeeAll = profile?.role !== 'PROVIDER'

  async function loadResources() {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const nextResources = await listResources(profile.id, canSeeAll)
      setResources(nextResources)
    } catch (loadError) {
      console.error('Unable to load resources', loadError)
      setError('Resources could not be loaded. Apply the database migration if this is a new setup.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    void Promise.all([listCategories().then(setCategories), loadResources()]).catch(() => setError('Resource data could not be loaded.'))
  }, [profile?.id, canSeeAll])

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return resources
    return resources.filter((resource) => [resource.title, resource.description, resource.location, resource.landmark, resource.city, resource.pincode, resource.category?.name].some((value) => value?.toLowerCase().includes(term)))
  }, [resources, search])

  async function handleDelete(resource: Resource) {
    if (!window.confirm(`Delete ${resource.title}?`)) return
    try {
      await deleteResource(resource.id)
      await loadResources()
    } catch (deleteError) {
      console.error('Unable to delete resource', deleteError)
      setError('Resource could not be deleted.')
    }
  }

  async function handleStatus(resource: Resource, status: Resource['status']) {
    try {
      await updateResourceStatus(resource.id, status)
      await loadResources()
    } catch (statusError) {
      console.error('Unable to update resource status', statusError)
      setError('Resource status could not be updated.')
    }
  }

  return (
    <div className="space-y-6">
      {showForm && canManage && <ResourceForm categories={categories} resource={editing} onSaved={loadResources} onCancel={() => { setShowForm(false); setEditing(null) }} />}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">{profile?.role === 'PROVIDER' ? 'Provider workspace' : 'Resource discovery'}</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{canManage ? 'My resources' : 'Browse resources'}</h1><p className="mt-2 text-sm text-slate-600">{canManage ? 'Publish and manage the resources your network can access.' : 'Find available resources shared by verified providers.'}</p></div>
        {canManage && <Button className="gap-2" onClick={() => { setEditing(null); setShowForm(true) }}><PackagePlus className="h-4 w-4" />Add resource</Button>}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Search className="h-4 w-4 text-slate-400" /><input className="w-full bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, category, address, city, or pincode" /></div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading resources...</div>}
      {!loading && filteredResources.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ImagePlus className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-medium text-slate-800">No resources found</p><p className="mt-1 text-sm text-slate-500">{canManage ? 'Publish your first resource to begin.' : 'Try a different search or check back later.'}</p></div>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredResources.map((resource) => (
          <article key={resource.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {resource.image_url ? <img src={resource.image_url} alt={resource.title} className="h-40 w-full object-cover" /> : <div className="grid h-32 place-items-center bg-emerald-50 text-emerald-700"><PackagePlus className="h-8 w-8" /></div>}
            <div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">{resource.category?.name ?? 'Resource'}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{resource.title}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{resource.status}</span></div><p className="mt-3 line-clamp-2 text-sm text-slate-600">{resource.description || 'No description provided.'}</p><div className="mt-4 grid gap-3 text-sm"><div><p className="text-slate-500">Quantity</p><p className="font-semibold text-slate-900">{resource.quantity} {resource.unit}</p></div><div><p className="text-slate-500">Pickup address</p><p className="font-semibold text-slate-900">{resource.location || 'Not set'}</p><p className="text-xs text-slate-500">{[resource.landmark, resource.city, resource.pincode].filter(Boolean).join(' · ') || 'Location details unavailable'}</p></div></div>{requesting?.id === resource.id && <div className="mt-4"><RequestForm resource={resource} onSubmitted={loadResources} onCancel={() => setRequesting(null)} /></div>}{canManage && <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditing(resource); setShowForm(true) }}><Edit3 className="h-3.5 w-3.5" />Edit</Button><Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void handleDelete(resource)}><Trash2 className="h-3.5 w-3.5" />Delete</Button><select className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" value={resource.status} onChange={(event) => void handleStatus(resource, event.target.value as Resource['status'])}><option value="AVAILABLE">Available</option><option value="CANCELLED">Cancelled</option><option value="COMPLETED">Completed</option></select></div>}{profile?.role === 'SEEKER' && resource.status === 'AVAILABLE' && !requesting && <Button className="mt-5 w-full" onClick={() => setRequesting(resource)}>Request resource</Button>}</div>
          </article>
        ))}
      </div>
    </div>
  )
}
