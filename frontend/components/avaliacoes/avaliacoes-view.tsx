'use client'

import { useAuth } from '@/lib/auth-context'
import { AssessmentsList } from './assessments-list'

export function AvaliacoesView() {
  const { user } = useAuth()

  if (!user || (user.role !== 'rh' && user.role !== 'gestor')) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Acesso restrito a RH e Gestores.</p>
      </div>
    )
  }

  return <AssessmentsList />
}
