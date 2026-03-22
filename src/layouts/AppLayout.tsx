import { Outlet, Link, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  Building2,
  Cloud,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const navItems = [
  { to: '/orgs',          icon: Building2, label: 'Organisations' },
  { to: '/cloud-accounts', icon: Cloud,     label: 'Cloud Accounts' },
  { to: '/incidents',     icon: Activity,  label: 'Incidents' },
]

function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.success('Logged out')
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border/60 flex flex-col shrink-0 bg-sidebar">
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <Activity size={12} className="text-primary" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">SRE Platform</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200 [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-medium [&.active]:shadow-[inset_0_0_0_1px_oklch(0.60_0.19_264_/_0.15)]"
            >
              <Icon size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-2 border-t border-border/60">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="w-full justify-start gap-2 h-10 px-2 hover:bg-accent/60" />
              }
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-xs bg-primary/15 text-primary font-medium">
                  {initials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left text-sm truncate text-foreground">{user?.fullName ?? 'Account'}</span>
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                render={<Link to="/profile" />}
                className="flex items-center gap-2"
              >
                <User size={13} /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive flex items-center gap-2"
                onSelect={handleLogout}
              >
                <LogOut size={13} /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
