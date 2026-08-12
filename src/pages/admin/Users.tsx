import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { inviteUser, listCohorts, listUsers } from '@/data/queries'
import { formatDate } from '@/lib/format'
import type { Cohort, Role, User } from '@/types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

const roleVariant: Record<Role, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  mentor: 'secondary',
  student: 'outline',
}

function UserTable({ users, cohorts }: { users: User[]; cohorts: Cohort[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Cohort</TableHead>
          <TableHead>Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">{initials(user.full_name)}</AvatarFallback>
                </Avatar>
                {user.full_name}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{user.email}</TableCell>
            <TableCell>
              <Badge variant={roleVariant[user.role]} className="capitalize">
                {user.role}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {cohorts.find((c) => c.id === user.cohort_id)?.name ?? '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function AdminUsers() {
  const [users, setUsers] = React.useState<User[]>([])
  const [cohorts, setCohorts] = React.useState<Cohort[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<{ full_name: string; email: string; role: Role; cohort_id: string }>({
    full_name: '',
    email: '',
    role: 'student',
    cohort_id: '',
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([listUsers(), listCohorts()])
      .then(([userData, cohortData]) => {
        if (cancelled) return
        setUsers(userData)
        setCohorts(cohortData)
        setForm((f) => ({ ...f, cohort_id: f.cohort_id || (cohortData[0]?.id ?? '') }))
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load users')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.email) return
    setSubmitting(true)
    setFormError(null)
    try {
      await inviteUser({
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        cohort_id: form.role === 'admin' ? null : form.cohort_id || null,
      })
      const refreshed = await listUsers()
      setUsers(refreshed)
      setForm({ full_name: '', email: '', role: 'student', cohort_id: cohorts[0]?.id ?? '' })
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Invite-only. Only admins can create accounts."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Invite user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a user</DialogTitle>
                <DialogDescription>They'll receive an email invite to set up their account.</DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleInvite}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input
                    id="invite-name"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.role !== 'admin' && (
                  <div className="flex flex-col gap-2">
                    <Label>Cohort</Label>
                    {cohorts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No cohorts exist yet — create one on the Cohorts page first.
                      </p>
                    ) : (
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
                    )}
                  </div>
                )}
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    Send invite
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
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="all">
              <div className="overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="all">All ({users.length})</TabsTrigger>
                  <TabsTrigger value="student">
                    Students ({users.filter((u) => u.role === 'student').length})
                  </TabsTrigger>
                  <TabsTrigger value="mentor">
                    Mentors ({users.filter((u) => u.role === 'mentor').length})
                  </TabsTrigger>
                  <TabsTrigger value="admin">
                    Admins ({users.filter((u) => u.role === 'admin').length})
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all" className="mt-4">
                <UserTable users={users} cohorts={cohorts} />
              </TabsContent>
              <TabsContent value="student" className="mt-4">
                <UserTable users={users.filter((u) => u.role === 'student')} cohorts={cohorts} />
              </TabsContent>
              <TabsContent value="mentor" className="mt-4">
                <UserTable users={users.filter((u) => u.role === 'mentor')} cohorts={cohorts} />
              </TabsContent>
              <TabsContent value="admin" className="mt-4">
                <UserTable users={users.filter((u) => u.role === 'admin')} cohorts={cohorts} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
