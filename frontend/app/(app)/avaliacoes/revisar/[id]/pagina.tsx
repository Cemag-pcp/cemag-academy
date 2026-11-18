'use client'

import { AvaliacoesRevisao } from '@/components/avaliacoes/avaliacoes-revisao'
import { useIdDaRota } from '@/lib/use-id-da-rota'

// Destino do link das notificações "Avaliação para revisar"
export default function RevisarAvaliacaoPagina() {
  const id = useIdDaRota()

  if (!id) return null

  return <AvaliacoesRevisao abrirId={id} />
}
