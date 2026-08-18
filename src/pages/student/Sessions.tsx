import * as React from 'react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserNames, listSessions } from '@/data/queries'
import { formatDateTime } from '@/lib/format'
import { ExternalLink, Loader2 } from 'lucide-react'
import type { Session } from '@/types'

const typeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  'live-class': 'default',
  workshop: 'secondary',
  'office-hours': 'outline',
  'demo-day': 'default',
}

export function StudentSessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [facilitatorNames, setFacilitatorNames] = React.useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    listSessions()
      .then(async (data) => {
        const facilitatorIds = [
          ...new Set(data.map((s) => s.facilitator_id).filter((id): id is string => !!id)),
        ]
        const names = await getUserNames(facilitatorIds)
        if (!cancelled) {
          setSessions(data)
          setFacilitatorNames(names)
        }
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

  const all = user.cohort_id ? sessions.filter((s) => s.cohort_id === user.cohort_id) : sessions
  const now = Date.now()
  const upcoming = all.filter((s) => new Date(s.start_time).getTime() >= now)
  const past = all.filter((s) => new Date(s.start_time).getTime() < now)

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
      <PageHeader title="Sessions" description="Live classes, workshops, and office hours for your cohort." />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Upcoming</h3>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
        )}
        {upcoming.map((session) => (
          <Card key={session.id}>
            <CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{session.title}</p>
                  <Badge variant={typeVariant[session.type]} className="capitalize">
                    {session.type.replace('-', ' ')}
                  </Badge>
                </div>
                {session.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{session.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(session.start_time)} – {formatDateTime(session.end_time)} ·{' '}
                  {facilitatorNames.find((f) => f.id === session.facilitator_id)?.full_name ?? 'Unassigned'} ·{' '}
                  <span className="capitalize">{session.location.replace('-', ' ')}</span>
                </p>
              </div>
              {session.link && (
                <Button variant="outline" size="sm" asChild>
                  <a href={session.link} target="_blank" rel="noreferrer">
                    Join <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Past</h3>
        {past.length === 0 && <p className="text-sm text-muted-foreground">No past sessions.</p>}
        {past.map((session) => (
          <Card key={session.id} className="opacity-70">
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{session.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(session.start_time)}</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {session.type.replace('-', ' ')}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
