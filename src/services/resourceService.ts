import { supabase } from '../lib/supabase'

export type ResourceStatus = 'AVAILABLE' | 'RESERVED' | 'PARTIALLY_ALLOCATED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'

export type ResourceCategory = {
  id: string
  name: string
  description: string | null
}

export type Resource = {
  id: string
  provider_id: string
  category_id: string
  title: string
  description: string | null
  quantity: number
  total_quantity: number
  reserved_quantity: number
  unit: string
  condition: string | null
  location: string | null
  landmark: string | null
  pickup_instructions: string | null
  district: string | null
  city: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  exchange_type: 'FREE' | 'PAID' | 'NEGOTIABLE'
  price: number | null
  is_negotiable: boolean
  available_from: string | null
  expiry_date: string | null
  image_url: string | null
  status: ResourceStatus
  created_at: string
  category: ResourceCategory | null
  provider: ResourceProvider | null
}

type ResourceRow = Omit<Resource, 'provider'> & { quantity_reserved?: number }

export type ResourceProvider = {
  id: string
  display_name: string
  profile_image: string | null
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED'
}

export type ResourceInput = {
  categoryId: string
  title: string
  description: string
  quantity: number
  unit: string
  condition: string
  location: string
  landmark: string
  pickupInstructions: string
  district: string
  city: string
  pincode: string
  latitude: number | null
  longitude: number | null
  contactPhone: string
  exchangeType: 'FREE' | 'PAID' | 'NEGOTIABLE'
  price: number | null
  availableFrom: string
  expiryDate: string
}

export type ResourceContactAccess = {
  is_authorized: boolean
  contact_phone: string | null
}

export async function getResourceContactAccess(resourceId: string) {
  const { data, error } = await supabase.rpc('get_resource_contact_access', {
    p_resource_id: resourceId,
  })
  if (error) throw error
  const access = Array.isArray(data) ? data[0] : data
  if (!access) throw new Error('Resource contact information is unavailable.')
  return access as ResourceContactAccess
}

export async function listCategories() {
  const { data, error } = await supabase
    .from('resource_categories')
    .select('id, name, description')
    .order('name')
  if (error) throw error
  return (data ?? []) as ResourceCategory[]
}

export async function listResources(
  profileId: string,
  role: 'ADMIN' | 'PROVIDER' | 'SEEKER',
  scope: 'OWN' | 'DISCOVERABLE' = 'DISCOVERABLE',
) {
  const query = supabase
    .from('resources')
    .select('id, provider_id, category_id, title, description, quantity, quantity_reserved, unit, condition, location, landmark, pickup_instructions, district, city, pincode, latitude, longitude, exchange_type, price, is_negotiable, available_from, expiry_date, image_url, status, created_at, category:resource_categories(id, name, description)')
  const scopedQuery = applyResourceScope(query, profileId, role, scope)

  let { data, error } = await scopedQuery
  let resources: ResourceRow[]
  if (error?.code === '42703') {
    const legacyQuery = supabase
      .from('resources')
      .select('id, provider_id, category_id, title, description, quantity, unit, condition, location, landmark, city, pincode, latitude, longitude, exchange_type, price, is_negotiable, available_from, expiry_date, image_url, status, created_at, category:resource_categories(id, name, description)')
    const legacyResult = await applyResourceScope(legacyQuery, profileId, role, scope)
    if (legacyResult.error) throw legacyResult.error
    resources = (legacyResult.data ?? []).map((resource) => ({
      ...resource,
      quantity_reserved: 0,
      pickup_instructions: null,
      district: null,
    })) as unknown as ResourceRow[]
  } else {
    if (error) throw error
    resources = (data ?? []) as unknown as ResourceRow[]
  }

  resources = resources.map((resource) => {
    const totalQuantity = Number(resource.quantity)
    const reservedQuantity = Number(resource.quantity_reserved || 0)
    return {
      ...resource,
      total_quantity: totalQuantity,
      reserved_quantity: reservedQuantity,
      quantity: Math.max(0, totalQuantity - reservedQuantity),
    }
  })
  if (role === 'SEEKER') resources = resources.filter((resource) => resource.quantity > 0)

  let providerRows: Array<ResourceProvider & { resource_id: string }>
  try {
    providerRows = await listResourceProviders(resources.map((resource) => resource.id))
  } catch (providerError) {
    if (!isMissingProviderRpc(providerError)) throw providerError
    providerRows = []
  }
  const providers = new Map(providerRows.map(({ resource_id, ...provider }) => [resource_id, provider]))
  return resources.map((resource) => ({
    ...resource,
    provider: providers.get(resource.id) ?? null,
  }))
}

function applyResourceScope<T extends {
  eq: (column: string, value: string) => T
  in: (column: string, values: string[]) => T
  order: (column: string, options: { ascending: boolean }) => T
}>(query: T, profileId: string, role: 'ADMIN' | 'PROVIDER' | 'SEEKER', scope: 'OWN' | 'DISCOVERABLE') {
  let scopedQuery = query.order('created_at', { ascending: false })
  if (role === 'PROVIDER' && scope === 'OWN') {
    scopedQuery = scopedQuery.eq('provider_id', profileId)
  } else if (role === 'SEEKER') {
    scopedQuery = scopedQuery.in('status', ['AVAILABLE', 'PARTIALLY_ALLOCATED'])
  }
  return scopedQuery
}

function isMissingProviderRpc(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error.code === 'PGRST202' || error.code === '42883')
}

async function listResourceProviders(resourceIds: string[]) {
  if (resourceIds.length === 0) return []

  const { data, error } = await supabase.rpc('get_public_resource_providers', {
    p_resource_ids: resourceIds,
  })
  if (error) throw error
  return (data ?? []) as Array<ResourceProvider & { resource_id: string }>
}

export async function createResource(profileId: string, input: ResourceInput) {
  const resource = {
    provider_id: profileId,
    category_id: input.categoryId,
    title: input.title,
    description: input.description || null,
    quantity: input.quantity,
    unit: input.unit,
    condition: input.condition || null,
    location: input.location || null,
    landmark: input.landmark || null,
    district: input.district || null,
    pickup_instructions: input.pickupInstructions || null,
    city: input.city || null,
    pincode: input.pincode || null,
    latitude: input.latitude,
    longitude: input.longitude,
    contact_phone: input.contactPhone || null,
    exchange_type: input.exchangeType,
    price: input.price,
    is_negotiable: input.exchangeType === 'NEGOTIABLE',
    available_from: input.availableFrom || null,
    expiry_date: input.expiryDate || null,
  }

  let { data, error } = await supabase
    .from('resources')
    .insert(resource)
    .select('id')
    .single()

  if (isMissingDiscoveryColumn(error)) {
    const { district: _district, pickup_instructions: _pickupInstructions, ...legacyResource } = resource
    ;({ data, error } = await supabase
      .from('resources')
      .insert(legacyResource)
      .select('id')
      .single())
  }

  if (error) throw error
  if (!data) throw new Error('Resource was not returned after saving.')
  return data.id as string
}

export async function updateResource(id: string, input: ResourceInput) {
  const resource = {
    category_id: input.categoryId,
    title: input.title,
    description: input.description || null,
    quantity: input.quantity,
    unit: input.unit,
    condition: input.condition || null,
    location: input.location || null,
    landmark: input.landmark || null,
    pickup_instructions: input.pickupInstructions || null,
    district: input.district || null,
    city: input.city || null,
    pincode: input.pincode || null,
    latitude: input.latitude,
    longitude: input.longitude,
    contact_phone: input.contactPhone || null,
    exchange_type: input.exchangeType,
    price: input.price,
    is_negotiable: input.exchangeType === 'NEGOTIABLE',
    available_from: input.availableFrom || null,
    expiry_date: input.expiryDate || null,
    updated_at: new Date().toISOString(),
  }

  let { error } = await supabase
    .from('resources')
    .update(resource)
    .eq('id', id)

  if (isMissingDiscoveryColumn(error)) {
    const { district: _district, pickup_instructions: _pickupInstructions, ...legacyResource } = resource
    ;({ error } = await supabase
      .from('resources')
      .update(legacyResource)
      .eq('id', id))
  }

  if (error) throw error
}

function isMissingDiscoveryColumn(error: { code?: string; message?: string } | null) {
  return (error?.code === '42703' || error?.code === 'PGRST204')
    && (error.message?.includes('district') === true || error.message?.includes('pickup_instructions') === true)
}

export async function updateResourceStatus(id: string, status: ResourceStatus) {
  const { error } = await supabase
    .from('resources')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteResource(id: string) {
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) throw error
}

export async function uploadResourceImage(resourceId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${resourceId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('resource-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('resource-images').getPublicUrl(path)
  const { error: resourceError } = await supabase
    .from('resources')
    .update({ image_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', resourceId)
  if (resourceError) throw resourceError
}
