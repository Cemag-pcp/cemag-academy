'use client'

import { useParams } from 'next/navigation'
import { AvaliacoesRevisao } from '@/components/avaliacoes/avaliacoes-revisao'

// Destino do link das notificações "Avaliação para revisar"
export default function RevisarAvaliacaoPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string)

  return <AvaliacoesRevisao abrirId={id} />
}
