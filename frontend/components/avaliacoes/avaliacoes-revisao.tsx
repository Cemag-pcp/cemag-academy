'use client'

import { useAuth } from '@/lib/auth-context'
import { AvaliacoesList } from './avaliacoes-list'

/** Tela de revisão das respostas de avaliação (RH e gestores). */
export function AvaliacoesRevisao({ abrirId }: { abrirId?: string }) {
  const { user } = useAuth()

  if (!user) return null

  if (user.role !== 'rh' && user.role !== 'gestor') {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Acesso restrito a RH e Gestores.</p>
      </div>
    )
  }

  return <AvaliacoesList abrirId={abrirId} />
}
