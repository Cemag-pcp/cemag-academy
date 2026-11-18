'use client'

import { useAuth } from '@/lib/auth-context'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { PageTitleProvider } from '@/lib/page-title'

interface AppShellProps {
  children: React.ReactNode
  title?: string
}

export function AppShell({ children, title }: AppShellProps) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return null

  return (
    <PageTitleProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar title={title} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </PageTitleProvider>
  )
}
