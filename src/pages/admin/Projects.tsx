import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createProject, listCohorts, listProjects, listUsers, updateProjectStage } from '@/data/queries'
import { stageLabels, stageOrder, formatDate } from '@/lib/format'
import type { Cohort, Project, ProjectStage, User } from '@/types'

export function AdminProjects() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [cohorts, setCohorts] = React.useState<Cohort[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [stageError, setStageError] = React.useState<string | null>(null)

  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    student_id: '',
    name: '',
    problem_statement: '',
    solution: '',
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([listProjects(), listCohorts(), listUsers()])
      .then(([projectData, cohortData, userData]) => {
        if (cancelled) return
        setProjects(projectData)
        setCohorts(cohortData)
        setUsers(userData)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load projects')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleStageChange(projectId: string, stage: ProjectStage) {
    setUpdatingId(projectId)
    setStageError(null)
    try {
      const updated = await updateProjectStage(projectId, stage)
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)))
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Failed to update stage')
    } finally {
      setUpdatingId(null)
    }
  }

  const studentsWithoutProject = users.filter(
    (u) => u.role === 'student' && !projects.some((p) => p.student_id === u.id),
  )
  const selectedStudent = studentsWithoutProject.find((u) => u.id === form.student_id)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !selectedStudent?.cohort_id) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await createProject({
        student_id: selectedStudent.id,
        cohort_id: selectedStudent.cohort_id,
        name: form.name,
        problem_statement: form.problem_statement || undefined,
        solution: form.solution || undefined,
      })
      setProjects((prev) => [created, ...prev])
      setForm({ student_id: '', name: '', problem_statement: '', solution: '' })
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        description="All builder projects across cohorts. Admins can edit everything."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>
                  Set up a project record so a student can start working in their Workspace.
                </DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleCreate}>
                <div className="flex flex-col gap-2">
                  <Label>Student</Label>
                  {studentsWithoutProject.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Every student already has a project.
                    </p>
                  ) : (
                    <Select
                      value={form.student_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, student_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsWithoutProject.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {form.student_id && !selectedStudent?.cohort_id && (
                    <p className="text-xs text-destructive">
                      This student has no cohort assigned yet — set that first (Users page) before
                      creating their project.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="problem-statement">Problem statement (optional)</Label>
                  <Textarea
                    id="problem-statement"
                    rows={2}
                    value={form.problem_statement}
                    onChange={(e) => setForm((f) => ({ ...f, problem_statement: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="solution">Solution (optional)</Label>
                  <Textarea
                    id="solution"
                    rows={2}
                    value={form.solution}
                    onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
                  />
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={submitting || !form.student_id || !form.name || !selectedStudent?.cohort_id}
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    Create project
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

      {!loading && !loadError && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      )}

      {stageError && <p className="text-sm text-destructive">{stageError}</p>}

      {!loading && !loadError && projects.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const student = users.find((u) => u.id === project.student_id)
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">{student?.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cohorts.find((c) => c.id === project.cohort_id)?.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={project.current_stage}
                            onValueChange={(v) => handleStageChange(project.id, v as ProjectStage)}
                            disabled={updatingId === project.id}
                          >
                            <SelectTrigger className="h-8 w-36">
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
                          {updatingId === project.id && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(project.updated_at)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
