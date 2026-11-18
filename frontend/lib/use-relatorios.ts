'use client'

import { useState, useEffect } from 'react'
import { api } from './api'

// ─── Raw shapes from API ───────────────────────────────────────────────────

interface DashboardRHRaw {
  totalColaboradores: number
  cursosAtivos: number
  certificadosEmitidos: number
  taxaConclusaoGeral: number
  mediaScore: number
  cursosVencidos: number
  novosCursosMes: number
  avaliacoesPendentes: number
  conclusaoPorDepartamento: { departamento: string; taxa: number }[]
  distribuicaoCursos: { nome: string; valor: number }[]
  progressoMensal: { mes: string; iniciados: number; concluidos: number }[]
  topCursos: { titulo: string; taxa: number; inscritos: number }[]
  colaboradoresCriticos: {
    nome: string; curso: string; departamento: string; prazo: string; progresso: number
  }[]
}

// ─── Public types ──────────────────────────────────────────────────────────

export interface DashboardRH {
  totalColaboradores: number
  cursosAtivos: number
  certificadosEmitidos: number
  taxaConclusaoGeral: number
  mediaScore: number
  cursosVencidos: number
  novosCursosMes: number
  avaliacoesPendentes: number
  conclusaoPorDepartamento: { departamento: string; taxa: number }[]
  distribuicaoCursos: { name: string; valor: number }[]   // nome→name for Recharts Legend
  progressoMensal: { mes: string; iniciados: number; concluidos: number }[]
  topCursos: { titulo: string; taxa: number; inscritos: number }[]
  colaboradoresCriticos: {
    nome: string; curso: string; departamento: string; prazo: string; progresso: number
  }[]
}

export interface ColaboradorRelatorio {
  id: string
  nome: string
  matricula: string
  cargo: string
  departamento: string
  concluidos: number
  total: number
  taxa: number
  tempo_total: number
  media: number | null   // 0–10
}

export interface TrilhaRelatorio {
  id: string
  titulo: string
  categoria: string
  carga_horaria: number
  obrigatorio: boolean
  publicado: boolean
  inscritos: number
  concluidos: number
  taxa: number
  media_nota: number | null   // 0–10
}

// ─── Hook ──────────────────────────────────────────────────────────────────
// Só os indicadores/gráficos. As tabelas são paginadas no servidor em
// /dashboard/relatorios/colaboradores/ e /dashboard/relatorios/trilhas/.

export function useRelatorios() {
  const [dashboard, setDashboard] = useState<DashboardRH | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const dashRaw = await api.get<DashboardRHRaw>('/dashboard/rh/')
      // nome→name para o <Legend> do Recharts
      setDashboard({
        ...dashRaw,
        distribuicaoCursos: (dashRaw.distribuicaoCursos ?? []).map(d => ({ name: d.nome, valor: d.valor })),
      })
    } catch {
      setError('Erro ao carregar relatórios.')
    } finally {
      setLoading(false)
    }
  }

  return { dashboard, loading, error, reload: load }
}
