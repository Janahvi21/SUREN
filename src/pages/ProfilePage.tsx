import { Save, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { updateOwnProfile, uploadProfileImage, type ProfileUpdate } from '../services/profileService'

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [form, setForm] = useState<ProfileUpdate>({ full_name: '', phone: '', organization_name: '', organization_type: '', address: '', city: '', pincode: '', bio: '' })
  const [image, setImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    setForm({ full_name: profile.full_name, phone: profile.phone ?? '', organization_name: profile.organization_name ?? '', organization_type: profile.organization_type ?? '', address: profile.address ?? '', city: profile.city ?? '', pincode: profile.pincode ?? '', bio: profile.bio ?? '' })
  }, [profile])

  function update(field: keyof ProfileUpdate, value: string) { setForm((current) => ({ ...current, [field]: value })) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setSaving(true); setMessage(''); setError('')
    try { await updateOwnProfile(profile.id, form); if (image) await uploadProfileImage(profile.auth_user_id, profile.id, image); await refreshProfile(); setImage(null); setMessage('Profile updated successfully.') } catch (saveError) { console.error(saveError); setError('Profile could not be updated.') } finally { setSaving(false) }
  }

  const input = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'

  return <div className="space-y-6"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Account settings</p><h1 className="mt-2 text-3xl font-bold text-slate-900">My profile</h1><p className="mt-2 text-sm text-slate-600">Keep your contact and organization information current for reliable coordination.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-6 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-700">{profile?.profile_image ? <img src={profile.profile_image} alt="Profile" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</div><div><p className="font-semibold text-slate-900">{profile?.email}</p><p className="text-xs uppercase tracking-[0.16em] text-emerald-700">{profile?.role} · {profile?.verification_status}</p></div></div><form className="grid gap-4 md:grid-cols-2" onSubmit={submit}><label className="text-sm font-medium text-slate-700 md:col-span-2">Profile image<input className={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label><label className="text-sm font-medium text-slate-700">Full name<input className={input} value={form.full_name} onChange={(event) => update('full_name', event.target.value)} required /></label><label className="text-sm font-medium text-slate-700">Phone<input className={input} value={form.phone} onChange={(event) => update('phone', event.target.value)} inputMode="tel" /></label><label className="text-sm font-medium text-slate-700">Organization name<input className={input} value={form.organization_name} onChange={(event) => update('organization_name', event.target.value)} /></label><label className="text-sm font-medium text-slate-700">Organization type<input className={input} value={form.organization_type} onChange={(event) => update('organization_type', event.target.value)} placeholder="NGO, school, business, individual" /></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Bio<textarea className={`${input} min-h-20`} value={form.bio} onChange={(event) => update('bio', event.target.value)} /></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Address<textarea className={`${input} min-h-24`} value={form.address} onChange={(event) => update('address', event.target.value)} /></label><label className="text-sm font-medium text-slate-700">City<input className={input} value={form.city} onChange={(event) => update('city', event.target.value)} /></label><label className="text-sm font-medium text-slate-700">Pincode<input className={input} value={form.pincode} onChange={(event) => update('pincode', event.target.value)} pattern="[1-9][0-9]{5}" /></label>{message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 md:col-span-2">{message}</p>}{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</p>}<div className="flex justify-end md:col-span-2"><Button type="submit" className="gap-2" disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save profile'}</Button></div></form></div></div>
}
