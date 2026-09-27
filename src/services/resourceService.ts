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
  unit: string
  condition: string | null
  location: string | null
  landmark: string | null
  city: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  contact_phone: string | null
  exchange_type: 'FREE' | 'PAID' | 'NEGOTIABLE'
  price: number | null
  is_negotiable: boolean
  available_from: string | null
  expiry_date: string | null
  image_url: string | null
  status: ResourceStatus
  created_at: string
  category: ResourceCategory | null
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

export async function listCategories() {
  const { data, error } = await supabase
    .from('resource_categories')
    .select('id, name, description')
    .order('name')
  if (error) throw error
  return (data ?? []) as ResourceCategory[]
}

export async function listResources(profileId: string, canSeeAll: boolean) {
  let query = supabase
    .from('resources')
    .select('id, provider_id, category_id, title, description, quantity, unit, condition, location, landmark, city, pincode, latitude, longitude, contact_phone, exchange_type, price, is_negotiable, available_from, expiry_date, image_url, status, created_at, category:resource_categories(id, name, description)')
    .order('created_at', { ascending: false })

  if (!canSeeAll) {
    query = query.eq('provider_id', profileId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Resource[]
}

export async function createResource(profileId: string, input: ResourceInput) {
  const { data, error } = await supabase
    .from('resources')
    .insert({
      provider_id: profileId,
      category_id: input.categoryId,
      title: input.title,
      description: input.description || null,
      quantity: input.quantity,
      unit: input.unit,
      condition: input.condition || null,
      location: input.location || null,
      landmark: input.landmark || null,
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
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateResource(id: string, input: ResourceInput) {
  const { error } = await supabase
    .from('resources')
    .update({
      category_id: input.categoryId,
      title: input.title,
      description: input.description || null,
      quantity: input.quantity,
      unit: input.unit,
      condition: input.condition || null,
      location: input.location || null,
      landmark: input.landmark || null,
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
    })
    .eq('id', id)
  if (error) throw error
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
