import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { Authentication } from '@/components/authentication'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { Separator } from '@/components/ui/separator'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, failure } = await getCurrentUser()
  if (failure?.status === 401) redirect('/login')
  if (failure)
    return (
      <main role="alert">Authentication temporarily unavailable. Refresh the page to retry.</main>
    )

  return (
    <Authentication key={user.id} expectedUserId={user.id}>
      <TooltipProvider>
        <SidebarProvider>
          <DashboardSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 !h-4" />
              <span className="text-sm font-medium text-muted-foreground">Dashboard</span>
            </header>
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </Authentication>
  )
}
