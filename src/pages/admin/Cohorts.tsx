import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
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
import { createCohort, listCohorts } from '@/data/queries'
import { formatDate } from '@/lib/format'
import type { Cohort } from '@/types'

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
                  <Badge
                    variant={cohort.status === 'active' ? 'success' : 'outline'}
                    className="capitalize"
                  >
                    {cohort.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{cohort.student_count} students</span>
                  <span>{cohort.mentor_count} mentors</span>
                </div>
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
