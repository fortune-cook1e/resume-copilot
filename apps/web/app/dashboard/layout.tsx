import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { Authentication } from '@/components/authentication'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

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
        <SidebarProvider className="bg-[#faf8f3] [--sidebar:#f4f1e9] [--sidebar-accent:#e5e9de] [--sidebar-accent-foreground:#263c2f] [--sidebar-border:#e6e1d6] [--sidebar-foreground:#242822]">
          <DashboardSidebar />
          <SidebarInset className="min-w-0 bg-[#faf8f3] text-[#242822]">
            <header className="flex h-14 shrink-0 items-center px-4">
              <SidebarTrigger />
            </header>
            <div className="flex-1 px-4 pt-2 pb-10 sm:px-8 lg:px-12">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </Authentication>
  )
}
