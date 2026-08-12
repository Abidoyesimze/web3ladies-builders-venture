import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Star } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getProjectByStudentId, getUser, listMentorComments } from '@/data/queries'
import { formatDate, stageLabels } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MentorComment, Project, User } from '@/types'

export function MentorReviewDetail() {
  const { reviewId } = useParams<{ reviewId: string }>()
  const [review, setReview] = React.useState<MentorComment | null>(null)
  const [student, setStudent] = React.useState<User | null>(null)
  const [project, setProject] = React.useState<Project | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!reviewId) {
      setLoading(false)
      return
    }
    let cancelled = false
    listMentorComments()
      .then(async (comments) => {
        const found = comments.find((c) => c.id === reviewId) ?? null
        if (!found) {
          if (!cancelled) setReview(null)
          return
        }
        const [studentData, projectData] = await Promise.all([
          getUser(found.student_id),
          getProjectByStudentId(found.student_id),
        ])
        if (cancelled) return
        setReview(found)
        setStudent(studentData)
        setProject(projectData)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load review')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reviewId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError || !review) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={loadError ? 'Failed to load review' : 'Review not found'} description={loadError ?? undefined} />
        <Button variant="outline" asChild className="w-fit">
          <Link to="/mentor/reviews">
            <ArrowLeft className="size-4" /> Back to reviews
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/mentor/reviews">
            <ArrowLeft className="size-4" /> Back to reviews
          </Link>
        </Button>
        <PageHeader
          title={`Review for ${student?.full_name ?? 'Student'}`}
          description={formatDate(review.created_at)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Feedback</CardTitle>
            {review.rating && (
              <div className="flex items-center gap-0.5 pt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'size-4',
                      i < review.rating! ? 'fill-primary text-primary' : 'text-muted-foreground',
                    )}
                  />
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{review.comment}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project context</CardTitle>
            <CardDescription>{project?.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {project && (
              <>
                <Badge variant="outline" className="w-fit">
                  {stageLabels[project.current_stage]}
                </Badge>
                <p className="text-muted-foreground">{project.description}</p>
                <Button variant="outline" size="sm" asChild className="w-fit">
                  <Link to={`/mentor/students/${student?.id}`}>View student</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
