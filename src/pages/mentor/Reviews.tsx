import * as React from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Star } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { listMentorComments, listProjects, listUsers } from '@/data/queries'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MentorComment, Project, User } from '@/types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function MentorReviews() {
  const { user } = useAuth()
  const [myReviews, setMyReviews] = React.useState<MentorComment[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([listMentorComments({ mentorId: user.id }), listProjects(), listUsers()])
      .then(([reviewData, projectData, userData]) => {
        if (cancelled) return
        setMyReviews(reviewData)
        setProjects(projectData)
        setUsers(userData)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load reviews')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

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
      <PageHeader title="Reviews" description="Feedback you've given to students." />

      <div className="flex flex-col gap-3">
        {myReviews.length === 0 && (
          <p className="text-sm text-muted-foreground">You haven't left any reviews yet.</p>
        )}
        {myReviews.map((review) => {
          const student = users.find((u) => u.id === review.student_id)
          const project = projects.find((p) => p.id === review.project_id)
          return (
            <Link key={review.id} to={`/mentor/reviews/${review.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{student ? initials(student.full_name) : '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{student?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{project?.name}</p>
                      <p className="mt-2 line-clamp-2 text-sm">{review.comment}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {review.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'size-3.5',
                              i < review.rating! ? 'fill-primary text-primary' : 'text-muted-foreground',
                            )}
                          />
                        ))}
                      </div>
                    )}
                    <Badge variant="outline">{timeAgo(review.created_at)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
