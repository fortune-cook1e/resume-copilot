'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileText, User } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { WorkspaceBrand } from '@/components/WorkspaceBrand'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

const navItems = [
  {
    title: 'Resumes',
    href: '/dashboard/resumes',
    icon: FileText,
  },
  {
    title: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-6">
        <WorkspaceBrand href="/dashboard" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    className="rounded-xl px-3"
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link
                      href={item.href}
                      aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.email || ''}</p>
          </div>
          <SignOutButton />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
