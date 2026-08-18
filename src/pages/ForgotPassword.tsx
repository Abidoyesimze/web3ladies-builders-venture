import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPassword() {
  const [email, setEmail] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    // Always show the same success state regardless of whether this
    // email actually has an account — don't leak which addresses are
    // registered.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    })

    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            {submitted
              ? "If an account exists for that email, we've sent a link to reset your password."
              : "Enter your account's email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted && (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}
          <Button variant="ghost" size="sm" asChild className="mt-4 -ml-2">
            <Link to="/login">
              <ArrowLeft className="size-4" /> Back to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
