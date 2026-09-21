'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, User, LogOut } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

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
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            RC
          </div>
          <span className="text-base font-semibold">Resume Copilot</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
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
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
