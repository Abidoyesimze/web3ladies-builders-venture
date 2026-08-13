import * as React from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Layers, Loader2, Plus, Rocket, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import type { Cohort, CohortStatus } from '@/types'

const statusVariant: Record<CohortStatus, 'success' | 'outline' | 'secondary'> = {
  active: 'success',
  upcoming: 'outline',
  completed: 'secondary',
  archived: 'outline',
}

export function AdminCohorts() {
  const [cohorts, setCohorts] = React.useState<Cohort[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<CohortStatus | 'all'>('all')

  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', programme: '', start_date: '', end_date: '' })
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
      const created = await createCohort({
        name: form.name,
        programme: form.programme || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
      })
      setCohorts((prev) => [created, ...prev])
      setForm({ name: '', programme: '', start_date: '', end_date: '' })
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create cohort')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = cohorts.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    total: cohorts.length,
    active: cohorts.filter((c) => c.status === 'active').length,
    upcoming: cohorts.filter((c) => c.status === 'upcoming').length,
    completed: cohorts.filter((c) => c.status === 'completed').length,
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cohort-programme">Programme (optional)</Label>
                  <Input
                    id="cohort-programme"
                    value={form.programme}
                    onChange={(e) => setForm((f) => ({ ...f, programme: e.target.value }))}
                    placeholder="Builder Venture"
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

      {!loading && !loadError && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Cohorts" value={counts.total} icon={Layers} hint="All statuses" />
            <StatCard label="Active Cohorts" value={counts.active} icon={Rocket} hint="Running now" />
            <StatCard
              label="Completed Cohorts"
              value={counts.completed}
              icon={FolderKanban}
              hint="Delivered"
            />
            <StatCard
              label="Upcoming Cohorts"
              value={counts.upcoming}
              icon={Layers}
              hint="Not yet started"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cohort name..."
                className="pl-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as CohortStatus | 'all')}>
              <div className="overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {cohorts.length === 0 ? 'No cohorts yet — create the first one.' : 'No cohorts match.'}
            </p>
          )}

          {filtered.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cohort name</TableHead>
                        <TableHead>Programme</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Mentors</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((cohort) => (
                        <TableRow key={cohort.id}>
                          <TableCell className="font-medium">{cohort.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {cohort.programme ?? '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(cohort.start_date)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(cohort.end_date)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cohort.student_count}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cohort.mentor_count}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[cohort.status]} className="capitalize">
                              {cohort.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/cohorts/${cohort.id}`}>View cohort →</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
