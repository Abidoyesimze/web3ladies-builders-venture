import * as React from 'react'
import { Check, Copy, Link2, Loader2, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  createCohort,
  createInviteLink,
  deleteCohort,
  getActiveInviteLink,
  listCohorts,
  revokeInviteLink,
} from '@/data/queries'
import { formatDate } from '@/lib/format'
import type { Cohort, CohortInviteLink } from '@/types'

function DeleteCohortDialog({
  cohort,
  onDeleted,
}: {
  cohort: Cohort
  onDeleted: (id: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteCohort(cohort.id)
      onDeleted(cohort.id)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cohort')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive">
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete {cohort.name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {cohort.name}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the cohort along with its sessions, projects, and any active
            invite link. Students and mentors assigned to it are not deleted — they'll just be
            unassigned from a cohort. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Delete cohort
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteLinkDialog({ cohort }: { cohort: Cohort }) {
  const { user } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [link, setLink] = React.useState<CohortInviteLink | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getActiveInviteLink(cohort.id)
      .then((data) => {
        if (!cancelled) setLink(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load invite link')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, cohort.id])

  async function handleGenerate() {
    setBusy(true)
    setError(null)
    try {
      const created = await createInviteLink(cohort.id, user.id)
      setLink(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke() {
    if (!link) return
    setBusy(true)
    setError(null)
    try {
      await revokeInviteLink(link.id)
      setLink(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link')
    } finally {
      setBusy(false)
    }
  }

  const url = link ? `${window.location.origin}/join/${link.token}` : ''

  function handleCopy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-fit">
          <Link2 className="size-4" /> Invite link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join link for {cohort.name}</DialogTitle>
          <DialogDescription>
            Anyone with this link can create their own student account, auto-enrolled in this
            cohort. Expires 30 days after it's generated.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !link && (
          <Button onClick={handleGenerate} disabled={busy} className="w-fit">
            {busy && <Loader2 className="size-4 animate-spin" />}
            Generate link
          </Button>
        )}

        {!loading && link && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input value={url} readOnly className="text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                <span className="sr-only">Copy link</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {formatDate(link.expires_at)} · used {link.use_count} time
              {link.use_count === 1 ? '' : 's'}
            </p>
            <DialogFooter>
              <Button type="button" variant="destructive" size="sm" onClick={handleRevoke} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Revoke link
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function AdminCohorts() {
  const [cohorts, setCohorts] = React.useState<Cohort[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', start_date: '', end_date: '' })
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    listCohorts()
      .then((data) => {
        if (!cancelled) setCohorts(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load cohorts')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.start_date || !form.end_date) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await createCohort(form)
      setCohorts((prev) => [created, ...prev])
      setForm({ name: '', start_date: '', end_date: '' })
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create cohort')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cohorts"
        description="Manage Builder Venture cohorts."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New cohort
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create cohort</DialogTitle>
                <DialogDescription>Set up a new Builder Venture cohort.</DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleCreate}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cohort-name">Name</Label>
                  <Input
                    id="cohort-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="AI x Web3 Builder Venture — Cohort 5"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="start-date">Start date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="end-date">End date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    Create cohort
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {loadError && !loading && <p className="text-sm text-destructive">{loadError}</p>}

      {!loading && !loadError && cohorts.length === 0 && (
        <p className="text-sm text-muted-foreground">No cohorts yet — create the first one.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!loading &&
          !loadError &&
          cohorts.map((cohort) => (
            <Card key={cohort.id}>
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{cohort.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={cohort.status === 'active' ? 'success' : 'outline'}
                      className="capitalize"
                    >
                      {cohort.status}
                    </Badge>
                    <DeleteCohortDialog
                      cohort={cohort}
                      onDeleted={(id) => setCohorts((prev) => prev.filter((c) => c.id !== id))}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{cohort.student_count} students</span>
                  <span>{cohort.mentor_count} mentors</span>
                </div>
                <InviteLinkDialog cohort={cohort} />
                {(cohort.discord_invite_url || cohort.notion_url) && (
                  <div className="flex flex-wrap gap-3 border-t pt-3 text-xs">
                    {cohort.discord_invite_url && (
                      <a
                        href={cohort.discord_invite_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Discord →
                      </a>
                    )}
                    {cohort.notion_url && (
                      <a
                        href={cohort.notion_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Notion →
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
