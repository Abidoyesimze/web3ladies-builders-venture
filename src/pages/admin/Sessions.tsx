import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createSession, listCohorts, listSessions } from '@/data/queries'
import { formatDateTime } from '@/lib/format'
import type { Cohort, Session } from '@/types'

export function AdminSessions() {
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [cohorts, setCohorts] = React.useState<Cohort[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    title: '',
    cohort_id: '',
    type: 'live-class' as Session['type'],
    start_time: '',
    end_time: '',
    facilitator: '',
    location: 'discord' as Session['location'],
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([listSessions(), listCohorts()])
      .then(([sessionData, cohortData]) => {
        if (cancelled) return
        setSessions(sessionData)
        setCohorts(cohortData)
        setForm((f) => ({ ...f, cohort_id: f.cohort_id || (cohortData[0]?.id ?? '') }))
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load sessions')
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
    if (!form.title || !form.cohort_id || !form.start_time || !form.end_time) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await createSession({
        cohort_id: form.cohort_id,
        title: form.title,
        type: form.type,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        facilitator: form.facilitator,
        location: form.location,
      })
      setSessions((prev) => [...prev, created])
      setForm({
        title: '',
        cohort_id: cohorts[0]?.id ?? '',
        type: 'live-class',
        start_time: '',
        end_time: '',
        facilitator: '',
        location: 'discord',
      })
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to schedule session')
    } finally {
      setSubmitting(false)
    }
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sessions"
        description="Schedule live classes, workshops, and events across cohorts."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule session</DialogTitle>
                <DialogDescription>Add a new session to a cohort's calendar.</DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleCreate}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="session-title">Title</Label>
                  <Input
                    id="session-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Cohort</Label>
                    <Select
                      value={form.cohort_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, cohort_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm((f) => ({ ...f, type: v as Session['type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live-class">Live class</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="office-hours">Office hours</SelectItem>
                        <SelectItem value="demo-day">Demo day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="start-time">Start</Label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      value={form.start_time}
                      onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="end-time">End</Label>
                    <Input
                      id="end-time"
                      type="datetime-local"
                      value={form.end_time}
                      onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="facilitator">Facilitator</Label>
                    <Input
                      id="facilitator"
                      value={form.facilitator}
                      onChange={(e) => setForm((f) => ({ ...f, facilitator: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Location</Label>
                    <Select
                      value={form.location}
                      onValueChange={(v) => setForm((f) => ({ ...f, location: v as Session['location'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discord">Discord</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="in-person">In person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    Schedule session
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

      {!loading && !loadError && sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p>
      )}

      {!loading && !loadError && sorted.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {sorted.map((session) => (
              <div
                key={session.id}
                className="flex flex-col justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{session.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {session.type.replace('-', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(session.start_time)} · {session.facilitator} ·{' '}
                    {cohorts.find((c) => c.id === session.cohort_id)?.name}
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit capitalize">
                  {session.location}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
