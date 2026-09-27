import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'

export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (password.length < 6 || password !== confirm) { setError('Passwords must match and contain at least 6 characters.'); return }
    setLoading(true)
    const result = await updatePassword(password)
    setLoading(false)
    if (result.error) setError(result.error.message)
    else navigate('/dashboard', { replace: true })
  }

  return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12"><div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"><div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">S</div><h1 className="mt-4 text-2xl font-bold text-slate-900">Choose a new password</h1></div><form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm font-medium text-slate-700">New password<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label><label className="block text-sm font-medium text-slate-700">Confirm password<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={6} /></label>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button className="w-full" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</Button></form><p className="mt-6 text-center text-sm text-slate-600"><Link className="font-medium text-emerald-700" to="/login">Return to login</Link></p></div></div>
}
