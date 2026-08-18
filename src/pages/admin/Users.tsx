import * as React from 'react'
import { Loader2, Pencil, Plus, Search, Shield, UserCheck, UserCog, Users as UsersIcon, UserX } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { inviteUser, listCohorts, listUsers, setUserActive, updateUser } from '@/data/queries'
import { formatDate } from '@/lib/format'
import type { Cohort, Role, User } from '@/types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

type UserStatus = 'active' | 'pending' | 'inactive'

function getUserStatus(user: User): UserStatus {
  if (!user.is_active) return 'inactive'
  return user.invite_accepted_at ? 'active' : 'pending'
}

const statusBadgeVariant: Record<UserStatus, 'success' | 'warning' | 'outline'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'outline',
}

const statusLabel: Record<UserStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
}

const roleVariant: Record<Role, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  mentor: 'secondary',
  student: 'outline',
}

function EditUserDialog({
  user,
  cohorts,
  onSaved,
}: {
  user: User
  cohorts: Cohort[]
  onSaved: (updated: User) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [role, setRole] = React.useState<Role>(user.role)
  const [cohortId, setCohortId] = React.useState(user.cohort_id ?? '')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setRole(user.role)
      setCohortId(user.cohort_id ?? '')
      setError(null)
    }
  }, [open, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const updated = await updateUser(user.id, {
        role,
        cohort_id: role === 'admin' ? null : cohortId || null,
      })
      onSaved(updated)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit {user.full_name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.full_name}</DialogTitle>
          <DialogDescription>Change their role or cohort assignment.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
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
          {role !== 'admin' && (
            <div className="flex flex-col gap-2">
              <Label>Cohort</Label>
              {cohorts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No cohorts exist yet — create one on the Cohorts page first.
                </p>
              ) : (
                <Select value={cohortId} onValueChange={setCohortId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cohort" />
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeactivateButton({
  user,
  onChanged,
}: {
  user: User
  onChanged: (updated: User) => void
}) {
  const [busy, setBusy] = React.useState(false)

  async function handleToggle() {
    setBusy(true)
    try {
      const updated = await setUserActive(user.id, !user.is_active)
      onChanged(updated)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to update account status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={
        user.is_active
          ? 'size-7 text-muted-foreground hover:text-destructive'
          : 'size-7 text-muted-foreground hover:text-success'
      }
      onClick={handleToggle}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : user.is_active ? (
        <UserX className="size-3.5" />
      ) : (
        <UserCheck className="size-3.5" />
      )}
      <span className="sr-only">{user.is_active ? 'Deactivate' : 'Activate'} {user.full_name}</span>
    </Button>
  )
}

function UserTable({
  users,
  cohorts,
  currentUserId,
  onUserSaved,
}: {
  users: User[]
  cohorts: Cohort[]
  currentUserId: string
  onUserSaved: (updated: User) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Cohort</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} className={user.is_active ? undefined : 'opacity-60'}>
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
            <TableCell>
              <Badge variant={statusBadgeVariant[getUserStatus(user)]}>
                {statusLabel[getUserStatus(user)]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
            <TableCell>
              {user.id !== currentUserId && (
                <div className="flex items-center">
                  <EditUserDialog user={user} cohorts={cohorts} onSaved={onUserSaved} />
                  <DeactivateButton user={user} onChanged={onUserSaved} />
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = React.useState<User[]>([])
  const [cohorts, setCohorts] = React.useState<Cohort[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<Role | 'all'>('all')
  const [statusFilter, setStatusFilter] = React.useState<'all' | UserStatus>('all')

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

  function handleUserSaved(updated: User) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
  }

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

  const counts = {
    total: users.length,
    student: users.filter((u) => u.role === 'student').length,
    mentor: users.filter((u) => u.role === 'mentor').length,
    admin: users.filter((u) => u.role === 'admin').length,
  }

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter !== 'all' && getUserStatus(u) !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    return true
  })

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
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Users" value={counts.total} icon={UsersIcon} hint="All roles" />
            <StatCard label="Students" value={counts.student} icon={UserCog} hint="Enrolled learners" />
            <StatCard label="Mentors" value={counts.mentor} icon={UserCheck} hint="All mentors" />
            <StatCard label="Administrators" value={counts.admin} icon={Shield} hint="Programme admins" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | 'all')}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="student">Students</TabsTrigger>
                  <TabsTrigger value="mentor">Mentors</TabsTrigger>
                  <TabsTrigger value="admin">Admins</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users match.</p>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <UserTable
                    users={filtered}
                    cohorts={cohorts}
                    currentUserId={currentUser.id}
                    onUserSaved={handleUserSaved}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
