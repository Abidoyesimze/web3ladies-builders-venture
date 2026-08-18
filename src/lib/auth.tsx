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

// Client-enforced session cap — Supabase's own server-side session
// timebox is a Pro-plan feature. This isn't tamper-proof (someone
// could edit localStorage), but it's a reasonable stand-in for an
// internal cohort LMS rather than a high-security app. Deliberately
// no inactivity tracking — just a hard 24h from the actual sign-in.
const SESSION_STARTED_KEY = 'w3l-session-started-at'
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

function isSessionExpired() {
  const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY))
  if (!startedAt) return false
  return Date.now() - startedAt >= SESSION_MAX_AGE_MS
}

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
        localStorage.removeItem(SESSION_STARTED_KEY)
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      if (isSessionExpired()) {
        localStorage.removeItem(SESSION_STARTED_KEY)
        await supabase.auth.signOut()
        return
      }
      if (!localStorage.getItem(SESSION_STARTED_KEY)) {
        localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()))
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return
      if (event === 'SIGNED_IN') {
        localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()))
      }
      setSession(nextSession)
      setLoading(true)
      handleSession(nextSession)
    })

    const interval = setInterval(() => {
      if (isSessionExpired()) {
        localStorage.removeItem(SESSION_STARTED_KEY)
        supabase.auth.signOut()
      }
    }, 60_000)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearInterval(interval)
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
