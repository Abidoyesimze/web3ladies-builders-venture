import { useLocation, matchPath } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, MessageSquareText } from 'lucide-react'
import { AppShell, type NavItem } from '@/layouts/AppShell'

const nav: NavItem[] = [
  { label: 'Dashboard', to: '/mentor', icon: LayoutDashboard, end: true },
  { label: 'Students', to: '/mentor/students', icon: Users },
  { label: 'Sessions', to: '/mentor/sessions', icon: CalendarDays },
  { label: 'Reviews', to: '/mentor/reviews', icon: MessageSquareText },
]

const titlePatterns: [string, string][] = [
  ['/mentor', 'Dashboard'],
  ['/mentor/students/:studentId', 'Student review'],
  ['/mentor/students', 'Students'],
  ['/mentor/sessions', 'Sessions'],
  ['/mentor/reviews/:reviewId', 'Review detail'],
  ['/mentor/reviews', 'Reviews'],
]

function resolveTitle(pathname: string) {
  for (const [pattern, title] of titlePatterns) {
    if (matchPath({ path: pattern, end: true }, pathname)) return title
  }
  return 'Dashboard'
}

export function MentorLayout() {
  const location = useLocation()
  return <AppShell nav={nav} title={resolveTitle(location.pathname)} />
}
