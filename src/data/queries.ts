import { supabase } from '@/lib/supabaseClient'
import type {
  AttendanceRecord,
  Cohort,
  IntakeForm,
  MentorComment,
  Project,
  ProjectStage,
  ProgressUpdate,
  Role,
  Session,
  Settings,
  User,
} from '@/types'

export async function listCohorts(): Promise<Cohort[]> {
  const [{ data: cohortRows, error: cohortErr }, { data: userRows, error: userErr }] =
    await Promise.all([
      supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
      supabase.from('users').select('cohort_id, role'),
    ])

  if (cohortErr) throw cohortErr
  if (userErr) throw userErr

  const counts = new Map<string, { student_count: number; mentor_count: number }>()
  for (const row of userRows ?? []) {
    if (!row.cohort_id) continue
    const entry = counts.get(row.cohort_id) ?? { student_count: 0, mentor_count: 0 }
    if (row.role === 'student') entry.student_count += 1
    if (row.role === 'mentor') entry.mentor_count += 1
    counts.set(row.cohort_id, entry)
  }

  return (cohortRows ?? []).map((row) => ({
    ...row,
    student_count: counts.get(row.id)?.student_count ?? 0,
    mentor_count: counts.get(row.id)?.mentor_count ?? 0,
  }))
}

export async function createCohort(input: {
  name: string
  start_date: string
  end_date: string
}): Promise<Cohort> {
  const { data, error } = await supabase
    .from('cohorts')
    .insert({ name: input.name, start_date: input.start_date, end_date: input.end_date })
    .select()
    .single()

  if (error) throw error
  return { ...data, student_count: 0, mentor_count: 0 }
}

export async function listSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('start_time', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createSession(input: {
  cohort_id: string
  title: string
  type: Session['type']
  start_time: string
  end_time: string
  facilitator: string
  location: Session['location']
}): Promise<Session> {
  const { data, error } = await supabase.from('sessions').insert(input).select().single()
  if (error) throw error
  return data
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', true).single()
  if (error) throw error
  return data
}

export async function updateSettings(
  input: Partial<Omit<Settings, 'id' | 'updated_at'>>,
): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', true)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function inviteUser(input: {
  email: string
  full_name: string
  role: Role
  cohort_id?: string | null
}): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-user', { body: input })
  if (error) throw error
}

export async function getUser(id: string): Promise<User> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getProjectByStudentId(studentId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateOwnProfile(
  userId: string,
  input: Partial<Pick<User, 'full_name' | 'bio' | 'timezone' | 'discord_handle' | 'wallet_address'>>,
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(input)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getIntakeForm(studentId: string): Promise<IntakeForm | null> {
  const { data, error } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listStudentsByCohort(cohortId?: string): Promise<User[]> {
  let query = supabase.from('users').select('*').eq('role', 'student')
  if (cohortId) query = query.eq('cohort_id', cohortId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listProgressUpdatesForStudents(studentIds: string[]): Promise<ProgressUpdate[]> {
  if (studentIds.length === 0) return []
  const { data, error } = await supabase
    .from('progress_updates')
    .select('*')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function listProgressUpdatesByStudent(studentId: string): Promise<ProgressUpdate[]> {
  const { data, error } = await supabase
    .from('progress_updates')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createProgressUpdate(input: {
  project_id: string
  student_id: string
  summary: string
  blockers?: string
}): Promise<ProgressUpdate> {
  const { data, error } = await supabase.from('progress_updates').insert(input).select().single()
  if (error) throw error
  return data
}

export async function listMentorComments(filter?: {
  mentorId?: string
  studentId?: string
  projectId?: string
}): Promise<MentorComment[]> {
  let query = supabase.from('mentor_comments').select('*').order('created_at', { ascending: false })
  if (filter?.mentorId) query = query.eq('mentor_id', filter.mentorId)
  if (filter?.studentId) query = query.eq('student_id', filter.studentId)
  if (filter?.projectId) query = query.eq('project_id', filter.projectId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createMentorComment(input: {
  project_id: string
  mentor_id: string
  student_id: string
  comment: string
  rating?: MentorComment['rating']
}): Promise<MentorComment> {
  const { data, error } = await supabase.from('mentor_comments').insert(input).select().single()
  if (error) throw error
  return data
}

export async function listAttendanceForStudents(studentIds: string[]): Promise<AttendanceRecord[]> {
  if (studentIds.length === 0) return []
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .in('student_id', studentIds)

  if (error) throw error
  return data ?? []
}

export async function listAttendanceForSession(sessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', sessionId)

  if (error) throw error
  return data ?? []
}

export async function upsertAttendance(
  records: {
    session_id: string
    student_id: string
    status: AttendanceRecord['status']
    marked_by: string
  }[],
): Promise<void> {
  const { error } = await supabase
    .from('attendance_records')
    .upsert(records, { onConflict: 'session_id,student_id' })

  if (error) throw error
}

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*')
  if (error) throw error
  return data ?? []
}

export async function createProject(input: {
  student_id: string
  cohort_id: string
  name: string
  problem_statement?: string
  solution?: string
}): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateProjectDetails(
  projectId: string,
  input: Partial<
    Pick<
      Project,
      'name' | 'problem_statement' | 'solution' | 'description' | 'demo_url' | 'repo_url' | 'pitch_deck_url'
    >
  >,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProjectStage(
  projectId: string,
  stage: ProjectStage,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ current_stage: stage })
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data
}
