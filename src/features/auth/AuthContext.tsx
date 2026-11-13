import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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
  profileError: string
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  signUp: (input: { fullName: string; email: string; password: string; role: UserRole }) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function runAuthAction(
  action: () => Promise<{ error: { message: string } | null }>,
  operation: string,
) {
  try {
    const { error } = await action()
    return { error: error ? new Error(error.message) : null }
  } catch (actionError) {
    console.error(`Unable to ${operation}`, actionError)
    return {
      error: actionError instanceof Error
        ? actionError
        : new Error(`Unable to ${operation}. Please try again.`),
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState('')
  const [loading, setLoading] = useState(true)
  const profileLoadVersion = useRef(0)

  const loadProfile = useCallback(async (user: User | null) => {
    const loadVersion = ++profileLoadVersion.current
    setProfileError('')
    if (!user) {
      setProfile(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name, email, phone, role, organization_name, organization_type, address, city, pincode, bio, profile_image, verification_status')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (loadVersion !== profileLoadVersion.current) return
      if (error) throw error
      if (!data) {
        setProfile(null)
        setProfileError('Your account profile could not be found. Try again or contact support.')
        return
      }

      setProfile(data as Profile)
    } catch (loadError) {
      console.error('Unable to load user profile', loadError)
      if (loadVersion !== profileLoadVersion.current) return
      setProfile(null)
      setProfileError('Unable to load your account profile. Check your connection and try again.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let authEventVersion = 0

    async function initialize() {
      const initialVersion = authEventVersion
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted || initialVersion !== authEventVersion) return
        if (error) throw error
        setSession(data.session)
        await loadProfile(data.session?.user ?? null)
      } catch (initializationError) {
        console.error('Unable to restore auth session', initializationError)
        if (mounted && initialVersion === authEventVersion) {
          setSession(null)
          setProfile(null)
          setProfileError('Unable to restore your session. Refresh the page and try again.')
        }
      } finally {
        if (mounted && initialVersion === authEventVersion) setLoading(false)
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion += 1
      const eventVersion = authEventVersion
      setSession(nextSession)
      setLoading(true)
      queueMicrotask(() => {
        if (!mounted || eventVersion !== authEventVersion) return
        void loadProfile(nextSession?.user ?? null).finally(() => {
          if (mounted && eventVersion === authEventVersion) setLoading(false)
        })
      })
    })

    void initialize()

    return () => {
      mounted = false
      profileLoadVersion.current += 1
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  function signIn(email: string, password: string) {
    return runAuthAction(
      () => supabase.auth.signInWithPassword({ email: email.trim(), password }),
      'sign in',
    )
  }

  function requestPasswordReset(email: string) {
    return runAuthAction(
      () => supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      }),
      'request a password reset',
    )
  }

  function updatePassword(password: string) {
    return runAuthAction(() => supabase.auth.updateUser({ password }), 'update your password')
  }

  function signUp({ fullName, email, password, role }: { fullName: string; email: string; password: string; role: UserRole }) {
    return runAuthAction(
      () => supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), role } },
      }),
      'create your account',
    )
  }

  function signOut() {
    return runAuthAction(() => supabase.auth.signOut(), 'sign out')
  }

  async function refreshProfile() {
    await loadProfile(session?.user ?? null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, profileError, loading, signIn, requestPasswordReset, updatePassword, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
