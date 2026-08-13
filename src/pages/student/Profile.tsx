import * as React from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getIntakeForm, updateOwnProfile } from '@/data/queries'
import { formatDate } from '@/lib/format'
import type { IntakeForm } from '@/types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function StudentProfile() {
  const { user, refreshProfile } = useAuth()
  const [form, setForm] = React.useState({
    full_name: user.full_name,
    bio: user.bio ?? '',
    timezone: user.timezone ?? '',
    discord_handle: user.discord_handle ?? '',
    wallet_address: user.wallet_address ?? '',
  })
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [intake, setIntake] = React.useState<IntakeForm | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getIntakeForm(user.id)
      .then((data) => {
        if (!cancelled) setIntake(data)
      })
      .catch(() => {
        // Non-critical for this page; leave the intake card hidden on failure.
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setSaved(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await updateOwnProfile(user.id, form)
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Keep your profile accurate so mentors know who they're working with." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>Visible to mentors and admins.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={form.full_name} onChange={handleChange('full_name')} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} disabled />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={form.bio} onChange={handleChange('bio')} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" value={form.timezone} onChange={handleChange('timezone')} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="discord_handle">Discord handle</Label>
                  <Input id="discord_handle" value={form.discord_handle} onChange={handleChange('discord_handle')} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wallet_address">Wallet address</Label>
                <Input id="wallet_address" value={form.wallet_address} onChange={handleChange('wallet_address')} />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
                {saved && <span className="text-sm text-success">Saved</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <Avatar className="size-16">
                <AvatarFallback className="text-lg">{initials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/set-password">Change password</Link>
              </Button>
            </CardContent>
          </Card>

          {intake && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Intake form</CardTitle>
                <CardDescription>Submitted {formatDate(intake.submitted_at)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="font-medium">Experience level</p>
                  <p className="text-muted-foreground capitalize">{intake.experience_level}</p>
                </div>
                <div>
                  <p className="font-medium">Motivation</p>
                  <p className="text-muted-foreground">{intake.motivation}</p>
                </div>
                <div>
                  <p className="font-medium">Goals</p>
                  <p className="text-muted-foreground">{intake.goals}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
