import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getSettings, updateSettings } from '@/data/queries'
import type { Settings } from '@/types'

type SettingsForm = Omit<Settings, 'id' | 'updated_at'>

export function AdminSettings() {
  const [form, setForm] = React.useState<SettingsForm | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getSettings()
      .then((data) => {
        if (cancelled) return
        const { id: _id, updated_at: _updated_at, ...rest } = data
        setForm(rest)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load settings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleChange<K extends keyof SettingsForm>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => (f ? { ...f, [field]: e.target.value } : f))
      setSaved(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateSettings(form)
      const { id: _id, updated_at: _updated_at, ...rest } = updated
      setForm(rest)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError || !form) {
    return <p className="text-sm text-destructive">{loadError ?? 'Failed to load settings'}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Programme-wide configuration." />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic programme information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="programme_name">Programme name</Label>
              <Input
                id="programme_name"
                value={form.programme_name}
                onChange={handleChange('programme_name')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="programme_description">Description</Label>
              <Textarea
                id="programme_description"
                rows={3}
                value={form.programme_description ?? ''}
                onChange={handleChange('programme_description')}
              />
            </div>

            <Separator className="my-2" />

            <div className="flex flex-col gap-2">
              <Label htmlFor="discord_invite_url">Discord invite link</Label>
              <Input
                id="discord_invite_url"
                value={form.discord_invite_url ?? ''}
                onChange={handleChange('discord_invite_url')}
              />
              <p className="text-xs text-muted-foreground">
                Used across the LMS for community and mentor support.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notion_url">Notion curriculum link</Label>
              <Input
                id="notion_url"
                value={form.notion_url ?? ''}
                onChange={handleChange('notion_url')}
              />
              <p className="text-xs text-muted-foreground">
                Used across the LMS for curriculum, resources, and templates.
              </p>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save settings
              </Button>
              {saved && <span className="text-sm text-success">Saved</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
