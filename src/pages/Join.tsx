import * as React from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthState } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { getCohortInviteInfo, joinCohort } from '@/data/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Join() {
  const { token } = useParams<{ token: string }>()
  const { session, loading: authLoading } = useAuthState()
  const navigate = useNavigate()

  const [checking, setChecking] = React.useState(true)
  const [info, setInfo] = React.useState<{ cohort_name: string; valid: boolean } | null>(null)
  const [checkError, setCheckError] = React.useState<string | null>(null)

  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    let cancelled = false
    getCohortInviteInfo(token)
      .then((data) => {
        if (!cancelled) setInfo(data)
      })
      .catch((err) => {
        if (!cancelled) setCheckError(err instanceof Error ? err.message : 'Failed to check invite link')
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!authLoading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      await joinCohort({ token, email, full_name: fullName, password })
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Join Web3Ladies</CardTitle>
          {checking && <CardDescription>Checking your invite link…</CardDescription>}
          {!checking && info?.valid && (
            <CardDescription>You're joining {info.cohort_name}.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {checking && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!checking && (checkError || !info?.valid) && (
            <p className="text-sm text-destructive">
              {checkError ?? 'This invite link is invalid or has expired. Ask your admin for a new one.'}
            </p>
          )}

          {!checking && info?.valid && (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Create account
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
