import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, type UserProfile } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('[Auth] Fetching profile for:', userId)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.log('[Auth] Profile fetch error (non-fatal):', error.message)
        return null
      }
      console.log('[Auth] Profile fetched successfully')
      return data as UserProfile
    } catch (err) {
      console.log('[Auth] Profile exception (non-fatal):', err)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    console.log('[Auth] Initializing auth...')

    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[Auth] Auth state changed:', event, newSession ? 'has session' : 'no session')
      
      if (!mounted) return

      // Update state
      setSession(newSession)
      setUser(newSession?.user ?? null)
      
      // CRITICAL: Set loading to false when we get auth state
      if (!initialized) {
        console.log('[Auth] First auth event - setting initialized')
        setInitialized(true)
        setLoading(false)
      }

      // Fetch profile in background (non-blocking)
      if (newSession?.user) {
        fetchProfile(newSession.user.id).then((prof) => {
          if (mounted) setProfile(prof)
        })
      } else {
        setProfile(null)
      }
    })

    // Timeout fallback - if nothing happens in 3 seconds, stop loading
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.log('[Auth] Timeout - forcing loading to false')
        setLoading(false)
      }
    }, 3000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile, initialized, loading])

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing in...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) console.log('[Auth] Sign in error:', error.message)
    else console.log('[Auth] Sign in successful')
    return { error: error as Error | null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })
    return { error: error as Error | null }
  }, [])

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out...')
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('Not authenticated') }
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    
    if (!error && profile) {
      setProfile({ ...profile, ...updates })
    }
    return { error: error as Error | null }
  }, [user, profile])

  console.log('[Auth] Render - loading:', loading, 'user:', user?.email ?? 'none')

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
