import * as React from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { Role } from '@/types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const roleLabels: Record<Role, string> = {
  student: 'Student',
  mentor: 'Mentor',
  admin: 'Admin',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function SidebarContent({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          W3
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Web3Ladies</span>
          <span className="text-xs text-muted-foreground">Builder Venture</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <a
          href="https://discord.gg/web3ladies"
          target="_blank"
          rel="noreferrer"
          className="block rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-accent"
        >
          Open Discord community →
        </a>
        <a
          href="https://notion.so/web3ladies-cohort-3"
          target="_blank"
          rel="noreferrer"
          className="block rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-accent"
        >
          Open Notion curriculum →
        </a>
      </div>
    </>
  )
}

export function AppShell({ nav, title }: { nav: NavItem[]; title: string }) {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  React.useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <SidebarContent nav={nav} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 md:hidden">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Web3Ladies LMS navigation menu</SheetDescription>
          <SidebarContent nav={nav} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
            <h1 className="truncate text-sm font-semibold md:text-base">{title}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="outline">{roleLabels[role]}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 outline-none hover:bg-accent">
                <Avatar className="size-7">
                  <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{user.full_name}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.full_name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 bg-muted/30 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
