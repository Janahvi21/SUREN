import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../../lib/supabase'

export type UserRole = 'ADMIN' | 'PROVIDER' | 'SEEKER'

export type Profile = {
  id: string
  auth_user_id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  organization_name: string | null
  organization_type: string | null
  address: string | null
  city: string | null
  pincode: string | null
  bio: string | null
  profile_image: string | null
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED'
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  signUp: (input: { fullName: string; email: string; password: string; role: UserRole }) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(user: User | null) {
    if (!user) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, auth_user_id, full_name, email, phone, role, organization_name, organization_type, address, city, pincode, bio, profile_image, verification_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Unable to load user profile', error)
      setProfile(null)
      return
    }

    setProfile(data as Profile | null)
  }

  useEffect(() => {
    let mounted = true

    async function initialize() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      await loadProfile(data.session?.user ?? null)
      if (mounted) setLoading(false)
    }

    void initialize()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void loadProfile(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error ? new Error(error.message) : null }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? new Error(error.message) : null }
  }

  async function signUp({ fullName, email, password, role }: { fullName: string; email: string; password: string; role: UserRole }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    return { error: error ? new Error(error.message) : null }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error: error ? new Error(error.message) : null }
  }

  async function refreshProfile() {
    await loadProfile(session?.user ?? null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, requestPasswordReset, updatePassword, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
