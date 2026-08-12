import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createMentorComment,
  getProjectByStudentId,
  getUser,
  listAttendanceForStudents,
  listMentorComments,
  listProgressUpdatesByStudent,
  listSessions,
  updateProjectStage,
} from '@/data/queries'
import { stageLabels, stageOrder, formatDate, timeAgo } from '@/lib/format'
import type {
  AttendanceRecord,
  MentorComment,
  Project,
  ProgressUpdate,
  ProjectStage,
  Session,
  User,
} from '@/types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function MentorStudentReview() {
  const { studentId } = useParams<{ studentId: string }>()
  const { user } = useAuth()

  const [student, setStudent] = React.useState<User | null>(null)
  const [project, setProject] = React.useState<Project | null>(null)
  const [updates, setUpdates] = React.useState<ProgressUpdate[]>([])
  const [comments, setComments] = React.useState<MentorComment[]>([])
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [stageUpdating, setStageUpdating] = React.useState(false)
  const [stageError, setStageError] = React.useState<string | null>(null)

  const [feedback, setFeedback] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.all([
      getUser(studentId),
      getProjectByStudentId(studentId),
      listProgressUpdatesByStudent(studentId),
      listMentorComments({ studentId }),
      listAttendanceForStudents([studentId]),
      listSessions(),
    ])
      .then(([studentData, projectData, updateData, commentData, attendanceData, sessionData]) => {
        if (cancelled) return
        setStudent(studentData)
        setProject(projectData)
        setUpdates(updateData)
        setComments(commentData)
        setAttendance(attendanceData)
        setSessions(sessionData)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load student')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  async function handleStageChange(next: ProjectStage) {
    if (!project) return
    setStageUpdating(true)
    setStageError(null)
    try {
      const updated = await updateProjectStage(project.id, next)
      setProject(updated)
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Failed to update stage')
    } finally {
      setStageUpdating(false)
    }
  }

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!feedback.trim() || !project || !student) return
    setSubmitting(true)
    setFeedbackError(null)
    try {
      const created = await createMentorComment({
        project_id: project.id,
        mentor_id: user.id,
        student_id: student.id,
        comment: feedback,
      })
      setComments((prev) => [created, ...prev])
      setFeedback('')
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError || !student) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={loadError ? 'Failed to load student' : 'Student not found'} description={loadError ?? undefined} />
        <Button variant="outline" asChild className="w-fit">
          <Link to="/mentor/students">
            <ArrowLeft className="size-4" /> Back to students
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/mentor/students">
            <ArrowLeft className="size-4" /> Back to students
          </Link>
        </Button>
        <PageHeader
          title={student.full_name}
          description={student.bio}
          action={
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback>{initials(student.full_name)}</AvatarFallback>
              </Avatar>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {project ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.problem_statement}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">{project.description}</p>
                <div className="flex flex-col gap-2 sm:w-64">
                  <Label>Project stage</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={project.current_stage}
                      onValueChange={(v) => handleStageChange(v as ProjectStage)}
                      disabled={stageUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stageOrder.map((s) => (
                          <SelectItem key={s} value={s}>
                            {stageLabels[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {stageUpdating && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  </div>
                  {stageError && <p className="text-xs text-destructive">{stageError}</p>}
                  <p className="text-xs text-muted-foreground">
                    Only mentors and admins can update the project stage.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                This student hasn't created a project yet.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress updates</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {updates.length === 0 && (
                <p className="text-sm text-muted-foreground">No progress updates yet.</p>
              )}
              {updates.map((update) => (
                <div key={update.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDate(update.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(update.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm">{update.summary}</p>
                  {update.blockers && (
                    <p className="mt-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
                      Blocker: {update.blockers}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave feedback</CardTitle>
              <CardDescription>Visible to {student.full_name.split(' ')[0]}.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={handleSubmitFeedback}>
                <Textarea
                  rows={3}
                  placeholder="Share feedback on their latest progress..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={!project}
                />
                {feedbackError && <p className="text-sm text-destructive">{feedbackError}</p>}
                <Button type="submit" className="w-fit" disabled={!project || submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Submit feedback
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Past feedback</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No feedback given yet.</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border p-3 text-sm">
                  <p>{comment.comment}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{timeAgo(comment.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {attendance.length === 0 && (
                <p className="text-sm text-muted-foreground">No attendance records yet.</p>
              )}
              {attendance.map((record) => {
                const session = sessions.find((s) => s.id === record.session_id)
                return (
                  <div key={record.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{session?.title ?? 'Session'}</span>
                    <Badge
                      variant={
                        record.status === 'present'
                          ? 'success'
                          : record.status === 'excused'
                            ? 'outline'
                            : 'destructive'
                      }
                      className="capitalize"
                    >
                      {record.status}
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
