import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('')
    const result = await requestPasswordReset(email)
    setLoading(false)
    if (result.error) setError(result.error.message)
    else setMessage('If an account exists for this email, a password reset link has been sent.')
  }

  return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12"><div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"><div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">S</div><h1 className="mt-4 text-2xl font-bold text-slate-900">Reset your password</h1><p className="mt-2 text-sm text-slate-600">We will send a secure reset link to your email.</p></div><form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm font-medium text-slate-700">Email<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button className="w-full" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</Button></form><p className="mt-6 text-center text-sm text-slate-600"><Link className="font-medium text-emerald-700" to="/login">Back to login</Link></p></div></div>
}
