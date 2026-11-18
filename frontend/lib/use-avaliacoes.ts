'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from './api'

export interface AvaliacaoResposta {
  questaoId: string
  questaoTexto: string
  resposta: string
}

export interface AvaliacaoItem {
  id: string
  colaboradorId: string
  colaboradorNome: string
  cursoId: string
  cursoTitulo: string
  statusAvaliacao: 'pendente' | 'aprovado' | 'reprovado' | null
  notaAvaliacao: number | null
  feedbackGestor: string
  respostasComTexto: AvaliacaoResposta[]
  atualizadoEm: string
}

function mapAvaliacao(raw: any): AvaliacaoItem {
  return {
    id: String(raw.id),
    colaboradorId: String(raw.colaborador),
    colaboradorNome: raw.colaborador_nome ?? 'Colaborador',
    cursoId: String(raw.curso),
    cursoTitulo: raw.curso_titulo ?? 'Trilha',
    statusAvaliacao: raw.status_avaliacao ?? null,
    notaAvaliacao: raw.nota_avaliacao ?? null,
    feedbackGestor: raw.feedback_gestor ?? '',
    respostasComTexto: (raw.respostas_com_texto ?? []).map((r: any) => ({
      questaoId: String(r.questao_id),
      questaoTexto: r.questao_texto ?? 'Questão',
      resposta: r.resposta ?? '',
    })),
    atualizadoEm: raw.atualizado_em ?? '',
  }
}

export function useAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<any>('/progress/?page_size=1000')
      const all: any[] = res?.results ?? res ?? []
      // Only entries that have open answers awaiting reviewer
      const withAnswers = all.filter(
        (p: any) => (p.respostas_com_texto?.length ?? p.respostas_abertas?.length ?? 0) > 0
      )
      setAvaliacoes(withAnswers.map(mapAvaliacao))
    } catch {
      setAvaliacoes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function reviewAvaliacao(
    id: string,
    opts: { status: 'aprovado' | 'reprovado'; nota: number; feedback: string }
  ) {
    await api.patch(`/progress/${id}/feedback/`, {
      status_avaliacao: opts.status,
      nota_avaliacao: opts.nota,
      feedback: opts.feedback,
    })
    await load()
  }

  return { avaliacoes, loading, reviewAvaliacao, reload: load }
}
