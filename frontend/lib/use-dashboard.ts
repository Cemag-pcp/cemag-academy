import { useEffect, useState } from 'react'
import { api } from './api'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface DashboardRH {
  totalColaboradores:      number
  cursosAtivos:            number
  certificadosEmitidos:    number
  taxaConclusaoGeral:      number
  mediaScore:              number
  cursosVencidos:          number
  novosCursosMes:          number
  avaliacoesPendentes:     number
  conclusaoPorDepartamento: { departamento: string; taxa: number }[]
  distribuicaoCursos:       { nome: string; valor: number }[]
  progressoMensal:          { mes: string; iniciados: number; concluidos: number }[]
  topCursos:                { titulo: string; taxa: number; inscritos: number }[]
  colaboradoresCriticos:    { nome: string; curso: string; departamento: string; prazo: string; progresso: number }[]
}

export interface MembroEquipe {
  id: string; nome: string; cargo: string; status: string
  media: number; concluidos: number; totalCursos: number
}

export interface DashboardGestor {
  totalEquipe:         number
  conclusoesEquipe:    number
  avaliacoesPendentes: number
  prazosVencendo:      number
  progressoEquipe:     MembroEquipe[]
  avaliacoesPendentesDetalhe: {
    progressoId: number | string
    colaborador: string
    curso: string
    respostasAbertas: { questao_id: string; resposta: string }[]
  }[]
}

export interface CursoDashboard {
  cursoId: string; titulo: string; cargaHoraria: number
  obrigatorio: boolean; prazo: string | null; categoria: string
  status: string; percentual: number; notaAvaliacao: number | null
  statusAvaliacao: string | null; dataInicio: string | null
  dataConclusao: string | null; certificadoGerado: boolean
}

export interface CertificadoDashboard {
  id: string; titulo: string; cursoTitulo: string
  cargaHoraria: number; dataConclusao: string; emitidoEm: string
}

export interface DashboardColaborador {
  cursos:            CursoDashboard[]
  certificados:      CertificadoDashboard[]
  totalHoras:        number
  totalAtribuidos:   number
  totalConcluidos:   number
  totalCertificados: number
}

// ── Hook genérico ──────────────────────────────────────────────────────────────

function useDashboardData<T>(endpoint: string) {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get<T>(endpoint)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [endpoint])

  return { data, loading, error }
}

// ── Hooks por role ─────────────────────────────────────────────────────────────

export function useDashboardRH() {
  return useDashboardData<DashboardRH>('/dashboard/rh/')
}

export function useDashboardGestor() {
  return useDashboardData<DashboardGestor>('/dashboard/gestor/')
}

export function useDashboardColaborador() {
  return useDashboardData<DashboardColaborador>('/dashboard/colaborador/')
}
