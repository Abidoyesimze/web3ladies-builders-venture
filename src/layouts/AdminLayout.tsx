import { useLocation, matchPath } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, Users, CalendarDays, FolderKanban, Settings } from 'lucide-react'
import { AppShell, type NavItem } from '@/layouts/AppShell'

const nav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Cohorts', to: '/admin/cohorts', icon: GraduationCap },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Sessions', to: '/admin/sessions', icon: CalendarDays },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]

const titlePatterns: [string, string][] = [
  ['/admin', 'Dashboard'],
  ['/admin/cohorts', 'Cohorts'],
  ['/admin/users', 'Users'],
  ['/admin/sessions', 'Sessions'],
  ['/admin/projects', 'Projects'],
  ['/admin/settings', 'Settings'],
]

function resolveTitle(pathname: string) {
  for (const [pattern, title] of titlePatterns) {
    if (matchPath({ path: pattern, end: true }, pathname)) return title
  }
  return 'Dashboard'
}

export function AdminLayout() {
  const location = useLocation()
  return <AppShell nav={nav} title={resolveTitle(location.pathname)} />
}
