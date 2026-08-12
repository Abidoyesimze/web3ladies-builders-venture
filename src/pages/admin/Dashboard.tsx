import * as React from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Users, GraduationCap, FolderKanban, CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listCohorts, listProjects, listSessions, listUsers } from '@/data/queries'
import { stageLabels, formatDateTime } from '@/lib/format'
import type { Cohort, Project, Session, User } from '@/types'

export function AdminDashboard() {
  const [users, setUsers] = React.useState<User[]>([])
  const [cohorts, setCohorts] = React.useState<Cohort[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([listUsers(), listCohorts(), listSessions(), listProjects()])
      .then(([userData, cohortData, sessionData, projectData]) => {
        if (cancelled) return
        setUsers(userData)
        setCohorts(cohortData)
        setSessions(sessionData)
        setProjects(projectData)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load overview')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const students = users.filter((u) => u.role === 'student')
  const mentors = users.filter((u) => u.role === 'mentor')
  const activeCohorts = cohorts.filter((c) => c.status === 'active')
  const upcoming = sessions
    .filter((s) => new Date(s.start_time).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 4)

  const stageBreakdown = Object.keys(stageLabels).map((stage) => ({
    stage,
    count: projects.filter((p) => p.current_stage === stage).length,
  }))

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Programme overview" description="Cross-cohort snapshot of the Builder Venture Programme." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={students.length} icon={GraduationCap} />
        <StatCard label="Mentors" value={mentors.length} icon={Users} />
        <StatCard label="Active cohorts" value={activeCohorts.length} icon={FolderKanban} />
        <StatCard label="Upcoming sessions" value={upcoming.length} icon={CalendarClock} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Projects by stage</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/projects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stageBreakdown.map(({ stage, count }) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-sm">{stageLabels[stage]}</span>
                <div className="flex flex-1 items-center gap-2 px-4">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${projects.length ? (count / projects.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming sessions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/sessions">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcoming.map((session) => (
              <div key={session.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{session.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(session.start_time)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Cohorts</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/cohorts">Manage</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {cohorts.map((cohort) => (
            <div key={cohort.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{cohort.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cohort.student_count} students · {cohort.mentor_count} mentors
                </p>
              </div>
              <Badge variant={cohort.status === 'active' ? 'success' : 'outline'} className="capitalize">
                {cohort.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
