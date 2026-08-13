export type Role = 'student' | 'mentor' | 'admin'

export type ProjectStage =
  | 'ideation'
  | 'validation'
  | 'building'
  | 'testing'
  | 'launch'

export interface User {
  id: string
  full_name: string
  email: string
  role: Role
  avatar_url?: string
  cohort_id?: string
  bio?: string
  timezone?: string
  discord_handle?: string
  wallet_address?: string
  created_at: string
}

export interface Cohort {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'completed'
  student_count: number
  mentor_count: number
  discord_invite_url?: string
  notion_url?: string
}

export interface Session {
  id: string
  cohort_id: string
  title: string
  description?: string
  type: 'live-class' | 'workshop' | 'office-hours' | 'demo-day'
  start_time: string
  end_time: string
  facilitator: string
  location: 'discord' | 'zoom' | 'in-person'
  link?: string
}

export interface AttendanceRecord {
  id: string
  session_id: string
  student_id: string
  status: 'present' | 'absent' | 'excused'
  marked_by: string
  marked_at: string
}

export interface IntakeForm {
  id: string
  student_id: string
  motivation: string
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  goals: string
  submitted_at: string
}

export interface Project {
  id: string
  student_id: string
  cohort_id: string
  name: string
  problem_statement: string
  solution: string
  description: string
  current_stage: ProjectStage
  demo_url?: string
  repo_url?: string
  pitch_deck_url?: string
  updated_at: string
}

export interface ProgressUpdate {
  id: string
  project_id: string
  student_id: string
  summary: string
  blockers?: string
  created_at: string
}

export interface Settings {
  id: true
  programme_name: string
  programme_description?: string
  discord_invite_url?: string
  notion_url?: string
  default_stage: ProjectStage
  progress_update_required: boolean
  updated_at: string
}

export interface CohortInviteLink {
  id: string
  cohort_id: string
  token: string
  expires_at: string
  max_uses?: number
  use_count: number
  revoked: boolean
  created_by: string
  created_at: string
}

export interface MentorComment {
  id: string
  project_id: string
  mentor_id: string
  student_id: string
  comment: string
  rating?: 1 | 2 | 3 | 4 | 5
  created_at: string
}
