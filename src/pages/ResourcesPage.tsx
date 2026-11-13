import { BadgeCheck, CalendarDays, Edit3, Eye, ImagePlus, MapPin, Package, PackagePlus, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { Button } from '../components/ui/button'
import { ResourceDetailsModal } from '../components/resources/ResourceDetailsModal'
import { useAuth } from '../features/auth/AuthContext'
import {
  createResource,
  deleteResource,
  getResourceContactAccess,
  listCategories,
  listResources,
  type Resource,
  type ResourceCategory,
  type ResourceInput,
  updateResource,
  updateResourceStatus,
  uploadResourceImage,
} from '../services/resourceService'
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
  pickupInstructions: '',
  district: '',
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

function cardPrice(resource: Resource) {
  if (resource.exchange_type === 'FREE') {
    return { badge: 'FREE', amount: '₹0 · No payment required', tone: 'bg-emerald-100 text-emerald-800' }
  }

  if (resource.price === null || !Number.isFinite(resource.price)) {
    return {
      badge: resource.exchange_type === 'NEGOTIABLE' ? 'NEGOTIABLE' : 'PAID',
      amount: 'Price not specified',
      tone: 'bg-amber-100 text-amber-900',
    }
  }

  const unit = resource.unit.toLowerCase().endsWith('s') ? resource.unit.slice(0, -1) : resource.unit
  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(resource.price)
  return {
    badge: resource.exchange_type === 'NEGOTIABLE' ? 'NEGOTIABLE' : 'PAID',
    amount: `${amount} per ${unit}`,
    tone: 'bg-amber-100 text-amber-900',
  }
}

function cardDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
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
  const [form, setForm] = useState<ResourceInput>(() => resource ? {
    categoryId: resource.category_id,
    title: resource.title,
    description: resource.description ?? '',
    quantity: resource.total_quantity,
    unit: resource.unit,
    condition: resource.condition ?? 'Good',
    location: resource.location ?? '',
    landmark: resource.landmark ?? '',
    pickupInstructions: resource.pickup_instructions ?? '',
    district: resource.district ?? '',
    city: resource.city ?? '',
    pincode: resource.pincode ?? '',
    latitude: resource.latitude,
    longitude: resource.longitude,
    availableFrom: resource.available_from ?? '',
    expiryDate: resource.expiry_date ?? '',
    contactPhone: '',
    exchangeType: resource.exchange_type,
    price: resource.price,
  } : { ...emptyForm, categoryId: categories[0]?.id ?? '' })
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingContact, setLoadingContact] = useState(Boolean(resource))
  const [contactLoadFailed, setContactLoadFailed] = useState(false)
  const [savedResourceId, setSavedResourceId] = useState<string | null>(null)

  useEffect(() => {
    if (!resource) return
    let active = true

    void getResourceContactAccess(resource.id)
      .then((access) => {
        if (!active) return
        if (!access.is_authorized) throw new Error('You are not authorized to view this contact information.')
        setForm((current) => ({ ...current, contactPhone: access.contact_phone ?? '' }))
      })
      .catch((contactError: unknown) => {
        console.error('Unable to load resource contact for editing', contactError)
        if (active) {
          setContactLoadFailed(true)
          setError('Provider contact details could not be loaded. Close and reopen the form before saving.')
        }
      })
      .finally(() => {
        if (active) setLoadingContact(false)
      })

    return () => { active = false }
  }, [resource])

  function updateField(field: keyof ResourceInput, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setError('')
    if (form.exchangeType === 'PAID' && (form.price === null || typeof form.price !== 'number' || !Number.isFinite(form.price) || form.price <= 0)) {
      setError('Enter a price greater than ₹0 for paid resources.')
      return
    }
    setSaving(true)
    let resourceId = savedResourceId
    let imageUploadFailed = false
    try {
      if (resource) {
        await updateResource(resource.id, form)
      } else if (!resourceId) {
        resourceId = await createResource(profile.id, form)
        setSavedResourceId(resourceId)
      }
      if (image && resourceId) {
        try {
          await uploadResourceImage(resourceId, image)
        } catch (uploadError) {
          imageUploadFailed = true
          throw uploadError
        }
      }
      await onSaved()
      onCancel()
    } catch (saveError) {
      console.error('Unable to save resource', saveError)
      if (!resource && resourceId) {
        setError(imageUploadFailed
          ? 'Your resource was published, but its image could not be uploaded. Retry to upload the image, or cancel; the listing is already saved.'
          : 'Your resource was published, but the listing could not be refreshed. Cancel and refresh the page; the listing is already saved.')
      } else {
        setError(resourceSaveError(saveError))
      }
    } finally {
      setSaving(false)
    }
  }

  function resourceSaveError(saveError: unknown) {
    if (typeof saveError !== 'object' || saveError === null) {
      return 'Resource could not be saved. Check the required fields and try again.'
    }

    const code = 'code' in saveError && typeof saveError.code === 'string' ? saveError.code : ''
    const message = 'message' in saveError && typeof saveError.message === 'string' ? saveError.message : ''
    if (code === 'PGRST204' && /district|pickup_instructions/i.test(message)) {
      return 'Your Supabase database is missing the new pickup fields. This version retries without those optional fields; reload the page and try again.'
    }

    switch (code) {
      case '42501':
        return 'Supabase denied this action. Confirm that you are signed in with a provider account and that the resource and image-storage policies allow providers.'
      case '23503':
        return 'The selected category or provider profile is no longer valid. Refresh the page and try again.'
      case '23514':
        return 'One or more values do not meet the database rules. Check the quantity and price.'
      case '42703':
        return 'The database is missing a required resource field. Refresh the page and try again; if it continues, apply the latest SUREN migration.'
      default:
        return message
          ? `Resource could not be saved: ${message}`
          : 'Resource could not be saved. Check the required fields and Supabase policies.'
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
        <label className="text-sm font-medium text-slate-700">Total quantity<input className={inputClass} type="number" min={Math.max(resource?.reserved_quantity ?? 0, 0.01)} step="0.01" value={form.quantity} onChange={(event) => updateField('quantity', Number(event.target.value))} required />{resource?.reserved_quantity ? <span className="mt-1 block text-xs text-slate-500">{resource.reserved_quantity} {resource.unit} reserved for approved pickups.</span> : null}</label>
        <label className="text-sm font-medium text-slate-700">Unit<select className={inputClass} value={form.unit} onChange={(event) => updateField('unit', event.target.value)}><option>kg</option><option>items</option><option>boxes</option><option>litres</option><option>sets</option></select></label>
        <label className="text-sm font-medium text-slate-700">Condition<select className={inputClass} value={form.condition} onChange={(event) => updateField('condition', event.target.value)}><option>New</option><option>Like New</option><option>Used</option><option>Good Condition</option><option>Good</option><option>Usable</option><option>Needs repair</option></select></label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Address<input className={inputClass} value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="SV Road, Vile Parle" required /></label>
        <label className="text-sm font-medium text-slate-700">Landmark<input className={inputClass} value={form.landmark} onChange={(event) => updateField('landmark', event.target.value)} placeholder="Near station road" /></label>
        <label className="text-sm font-medium text-slate-700">District<input className={inputClass} value={form.district} onChange={(event) => updateField('district', event.target.value)} placeholder="District" /></label>
        <label className="text-sm font-medium text-slate-700">City<input className={inputClass} value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="Mumbai" required /></label>
        <label className="text-sm font-medium text-slate-700">Pincode<input className={inputClass} value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{5}" placeholder="400056" required /></label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Pickup instructions<textarea className={`${inputClass} min-h-20`} value={form.pickupInstructions} onChange={(event) => updateField('pickupInstructions', event.target.value)} placeholder="Add directions or pickup arrangements." /></label>
        <LocationPicker address={form.location} city={form.city} pincode={form.pincode} landmark={form.landmark} latitude={form.latitude} longitude={form.longitude} onChange={({ latitude, longitude }) => setForm((current) => ({ ...current, latitude, longitude }))} />
        <label className="text-sm font-medium text-slate-700">Available from<input className={inputClass} type="date" value={form.availableFrom} onChange={(event) => updateField('availableFrom', event.target.value)} /></label>
        <label className="text-sm font-medium text-slate-700">Expiry date<input className={inputClass} type="date" value={form.expiryDate} onChange={(event) => updateField('expiryDate', event.target.value)} /></label>
        <label className="text-sm font-medium text-slate-700">Mobile number<input className={inputClass} value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} placeholder="Available after approval" inputMode="tel" /></label>
        <label className="text-sm font-medium text-slate-700">Exchange type<select className={inputClass} value={form.exchangeType} onChange={(event) => setForm((current) => ({ ...current, exchangeType: event.target.value as ResourceInput['exchangeType'], price: event.target.value === 'FREE' ? null : current.price }))}><option value="FREE">Free / donation</option><option value="PAID">Paid</option><option value="NEGOTIABLE">Negotiable</option></select></label>
        {form.exchangeType !== 'FREE' && <label className="text-sm font-medium text-slate-700">Price in INR<input className={inputClass} type="number" min={form.exchangeType === 'PAID' ? '0.01' : '0'} step="0.01" value={form.price ?? ''} onChange={(event) => updateField('price', event.target.value === '' ? '' : Number(event.target.value))} placeholder={form.exchangeType === 'PAID' ? 'Required amount in ₹' : 'Optional starting amount in ₹'} required={form.exchangeType === 'PAID'} /></label>}
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Description<textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Describe what is available and any pickup requirements." /></label>
        {!resource && <label className="text-sm font-medium text-slate-700 md:col-span-2">Image<input className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-700`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>}

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</p>}
        <div className="flex justify-end gap-3 md:col-span-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || loadingContact || contactLoadFailed}>{saving ? 'Saving...' : loadingContact ? 'Loading provider contact...' : resource ? 'Save changes' : savedResourceId && image ? 'Retry image upload' : savedResourceId ? 'Refresh resources' : 'Publish resource'}</Button></div>
      </form>
    </div>
  )
}

export function ResourcesPage() {
  const { profile } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [editing, setEditing] = useState<Resource | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const resourceLoadVersion = useRef(0)

  const canManage = profile?.role === 'PROVIDER' || profile?.role === 'ADMIN'
  const profileId = profile?.id
  const role = profile?.role

  const loadResources = useCallback(async () => {
    if (!profileId || !role) return
    const loadVersion = ++resourceLoadVersion.current
    try {
      const nextResources = await listResources(profileId, role, role === 'PROVIDER' ? 'OWN' : 'DISCOVERABLE')
      if (loadVersion === resourceLoadVersion.current) setResources(nextResources)
    } catch (loadError) {
      console.error('Unable to load resources', loadError)
      if (loadVersion === resourceLoadVersion.current) setError('Resources could not be loaded. Apply the latest database migrations and check your connection.')
    } finally {
      if (loadVersion === resourceLoadVersion.current) setLoading(false)
    }
  }, [profileId, role])

  const refreshResources = useCallback(async () => {
    setLoading(true)
    setError('')
    await loadResources()
  }, [loadResources])

  useEffect(() => {
    if (!profileId || !role) return
    let active = true
    const loadVersion = ++resourceLoadVersion.current
    void Promise.all([
      listCategories(),
      listResources(profileId, role, role === 'PROVIDER' ? 'OWN' : 'DISCOVERABLE'),
    ])
      .then(([nextCategories, nextResources]) => {
        if (!active || loadVersion !== resourceLoadVersion.current) return
        setCategories(nextCategories)
        setResources(nextResources)
        setError('')
      })
      .catch((loadError: unknown) => {
        console.error('Unable to load resource data', loadError)
        if (active && loadVersion === resourceLoadVersion.current) {
          setError('Resources and categories could not be loaded. Apply the latest database migrations and check your connection.')
        }
      })
      .finally(() => {
        if (active && loadVersion === resourceLoadVersion.current) setLoading(false)
      })
    return () => {
      active = false
      resourceLoadVersion.current += 1
    }
  }, [profileId, role])

  const selectedResource = resources.find((resource) => resource.id === selectedResourceId) ?? null
  const closeDetails = useCallback(() => setSelectedResourceId(null), [])

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return resources
    return resources.filter((resource) => [
      resource.title,
      resource.description,
      resource.location,
      resource.landmark,
      resource.district,
      resource.city,
      resource.pincode,
      resource.category?.name,
      resource.provider?.display_name,
    ].some((value) => value?.toLowerCase().includes(term)))
  }, [resources, search])

  async function handleDelete(resource: Resource) {
    if (!window.confirm(`Delete ${resource.title}?`)) return
    try {
      await deleteResource(resource.id)
      await refreshResources()
    } catch (deleteError) {
      console.error('Unable to delete resource', deleteError)
      setError('Resource could not be deleted.')
    }
  }

  async function handleStatus(resource: Resource, status: Resource['status']) {
    try {
      await updateResourceStatus(resource.id, status)
      await refreshResources()
    } catch (statusError) {
      console.error('Unable to update resource status', statusError)
      setError('Resource status could not be updated.')
    }
  }

  return (
    <div className="space-y-6">
      {showForm && canManage && <ResourceForm key={editing?.id ?? 'new'} categories={categories} resource={editing} onSaved={refreshResources} onCancel={() => { setShowForm(false); setEditing(null) }} />}
      {selectedResource && (
        <ResourceDetailsModal
          key={selectedResource.id}
          resource={selectedResource}
          canRequest={profile?.role === 'SEEKER' && selectedResource.quantity > 0 && ['AVAILABLE', 'PARTIALLY_ALLOCATED'].includes(selectedResource.status)}
          onClose={closeDetails}
          onRequestCreated={refreshResources}
        />
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">{profile?.role === 'PROVIDER' ? 'Provider workspace' : 'Resource discovery'}</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{canManage ? 'My resources' : 'Browse resources'}</h1><p className="mt-2 text-sm text-slate-600">{canManage ? 'Publish and manage the resources your network can access.' : 'Explore listings and review each provider’s verification status.'}</p></div>
        {canManage && <Button className="gap-2" onClick={() => { setEditing(null); setShowForm(true) }}><PackagePlus className="h-4 w-4" />Add resource</Button>}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Search className="h-4 w-4 text-slate-400" /><input className="w-full bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by resource, provider, address, city, or pincode" aria-label="Search resources" /></div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading resources...</div>}
      {!loading && !error && filteredResources.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ImagePlus className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-medium text-slate-800">No resources found</p><p className="mt-1 text-sm text-slate-500">{canManage ? 'Publish your first resource to begin.' : 'Try a different search or check back later.'}</p></div>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredResources.map((resource) => (
          <article key={resource.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            {resource.image_url
              ? <img src={resource.image_url} alt={resource.title} className="h-44 w-full object-cover" loading="lazy" />
              : <div className="grid h-36 place-items-center bg-emerald-50 text-emerald-700"><PackagePlus className="h-9 w-9" /></div>}
            <div className="flex flex-1 flex-col p-5">
              <div className="flex min-w-0 items-center gap-3 border-b border-slate-100 pb-4">
                {resource.provider?.profile_image
                  ? <img src={resource.provider.profile_image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" />
                  : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UserRound className="h-5 w-5" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{resource.provider?.display_name || 'Provider details unavailable'}</p>
                  {resource.provider?.verification_status === 'VERIFIED'
                    ? <p className="flex items-center gap-1 text-xs font-medium text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Verified provider</p>
                    : <p className="flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" />{resource.provider?.verification_status === 'PENDING' ? 'Verification pending' : resource.provider?.verification_status === 'REJECTED' ? 'Not verified' : 'Verification unavailable'}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{resource.quantity <= 0 ? 'OUT OF STOCK' : resource.status.replaceAll('_', ' ')}</span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{resource.category?.name ?? 'Resource'}</p>
                <h2 className="mt-1 line-clamp-1 text-lg font-semibold text-slate-900">{resource.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{resource.description || 'No description provided.'}</p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                {(() => {
                  const price = cardPrice(resource)
                  return (
                    <>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${price.tone}`}>{price.badge}</span>
                      <p className="mt-1 break-words text-base font-bold text-slate-900">{price.amount}</p>
                      {resource.exchange_type !== 'FREE' && <p className="mt-1 text-xs text-slate-500">Payment is arranged after approval; SUREN does not process payments.</p>}
                    </>
                  )
                })()}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><Package className="h-3.5 w-3.5" />Quantity</p>
                  <p className="mt-1 font-semibold text-slate-900">{resource.quantity} {resource.unit}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Condition</p>
                  <p className="mt-1 truncate font-semibold text-slate-900">{resource.condition || 'Not specified'}</p>
                </div>
              </div>

              <div className="mt-4 flex min-w-0 gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Pickup address</p>
                  <p className="line-clamp-2 font-medium text-slate-800">{resource.location || 'Address not provided'}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{[resource.landmark, resource.district, resource.city, resource.pincode].filter(Boolean).join(' · ') || 'Location details unavailable'}</p>
                </div>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />Posted {cardDate(resource.created_at)}
              </p>

              <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setSelectedResourceId(resource.id)}>
                  <Eye className="h-4 w-4" />View details
                </Button>
                {profile?.role === 'SEEKER' && resource.quantity > 0 && ['AVAILABLE', 'PARTIALLY_ALLOCATED'].includes(resource.status) && (
                  <Button type="button" className="flex-1" onClick={() => setSelectedResourceId(resource.id)}>Request resource</Button>
                )}
              </div>

              {canManage && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditing(resource); setShowForm(true) }}><Edit3 className="h-3.5 w-3.5" />Edit</Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void handleDelete(resource)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
                  <select aria-label={`Set status for ${resource.title}`} className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" value={resource.status} onChange={(event) => void handleStatus(resource, event.target.value as Resource['status'])}><option value="AVAILABLE">Available</option><option value="CANCELLED">Cancelled</option><option value="COMPLETED">Completed</option></select>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
