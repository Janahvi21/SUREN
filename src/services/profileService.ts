import { supabase } from '../lib/supabase'

export type ProfileUpdate = {
  full_name: string
  phone: string
  organization_name: string
  organization_type: string
  address: string
  city: string
  pincode: string
  bio: string
}

export async function updateOwnProfile(profileId: string, input: ProfileUpdate) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', profileId)
  if (error) throw error
}

export async function uploadProfileImage(authUserId: string, profileId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${authUserId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
  const { error } = await supabase.from('profiles').update({ profile_image: data.publicUrl, updated_at: new Date().toISOString() }).eq('id', profileId)
  if (error) throw error
}
