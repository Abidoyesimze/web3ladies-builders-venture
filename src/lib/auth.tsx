import * as React from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Role, User } from '@/types'
import { supabase } from '@/lib/supabaseClient'

interface AuthState {
  session: Session | null
  user: User | null
  role: Role | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  const loadProfile = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
    if (error) {
      console.error('Failed to load user profile', error)
      setUser(null)
      return
    }
    setUser(data as User)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function handleSession(nextSession: Session | null) {
      if (!nextSession) {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }
      await loadProfile(nextSession.user.id)
      if (!cancelled) setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (cancelled) return
      setSession(initialSession)
      handleSession(initialSession)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      setLoading(true)
      handleSession(nextSession)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = React.useCallback(async () => {
    if (session) await loadProfile(session.user.id)
  }, [session, loadProfile])

  const value = React.useMemo<AuthState>(
    () => ({ session, user, role: user?.role ?? null, loading, signOut, refreshProfile }),
    [session, user, loading, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Raw auth state — nullable, for components that render before/without a session (route guard, login, shell). */
export function useAuthState() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuthState must be used within AuthProvider')
  return ctx
}

/** For use inside already-protected routes, where a signed-in user with a loaded profile is guaranteed. */
export function useAuth() {
  const ctx = useAuthState()
  if (!ctx.user || !ctx.role) {
    throw new Error('useAuth must be used within an authenticated route')
  }
  return { user: ctx.user, role: ctx.role, signOut: ctx.signOut, refreshProfile: ctx.refreshProfile }
}
