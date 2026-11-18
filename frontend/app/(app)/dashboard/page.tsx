'use client'

import { useAuth } from '@/lib/auth-context'
import { DashboardRH } from '@/components/dashboard/dashboard-rh'
import { DashboardGestor } from '@/components/dashboard/dashboard-gestor'
import { DashboardColaborador } from '@/components/dashboard/dashboard-colaborador'

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  if (user.role === 'rh') return <DashboardRH />
  if (user.role === 'gestor') return <DashboardGestor />
  return <DashboardColaborador />
}
