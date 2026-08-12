import { useLocation } from 'react-router-dom'
import { LayoutDashboard, User, CalendarDays, Briefcase, TrendingUp } from 'lucide-react'
import { AppShell, type NavItem } from '@/layouts/AppShell'

const nav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Profile', to: '/profile', icon: User },
  { label: 'Sessions', to: '/sessions', icon: CalendarDays },
  { label: 'Workspace', to: '/workspace', icon: Briefcase },
  { label: 'Progress', to: '/progress', icon: TrendingUp },
]

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profile': 'Profile',
  '/sessions': 'Sessions',
  '/workspace': 'Workspace',
  '/progress': 'Progress updates',
}

export function StudentLayout() {
  const location = useLocation()
  return <AppShell nav={nav} title={titles[location.pathname] ?? 'Dashboard'} />
}
