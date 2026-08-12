import type { Role } from '@/types'

export const roleHome: Record<Role, string> = {
  student: '/dashboard',
  mentor: '/mentor',
  admin: '/admin',
}
