import { useState, useCallback } from 'react'
import { api } from './api'

export interface Departamento {
  id: string
  nome: string
  gestor: string | null       // user UUID
  gestor_nome: string | null
  colaboradores: string[]     // user UUIDs
  cargos: { id: string; nome: string }[]
}

export interface GestorOption {
  id: string
  nome: string
}

interface DepartamentosState {
  departamentos: Departamento[]
  total: number
  loading: boolean
  error: string | null
}

export function useDepartamentos() {
  const [state, setState] = useState<DepartamentosState>({
    departamentos: [],
    total: 0,
    loading: false,
    error: null,
  })

  const fetchDepartamentos = useCallback(async (search = '') => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const params = new URLSearchParams({ page_size: '100', ordering: 'nome' })
      if (search) params.set('search', search)
      const data = await api.get<{ count: number; results: Departamento[] }>(
        `/auth/departments/?${params}`
      )
      setState({ departamentos: data.results, total: data.count, loading: false, error: null })
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message ?? 'Erro ao carregar departamentos.' }))
    }
  }, [])

  const fetchGestores = useCallback(async (): Promise<GestorOption[]> => {
    const data = await api.get<{ count: number; results: { id: string; nome: string }[] }>(
      '/auth/users/?role=gestor&page_size=200&ordering=nome'
    )
    return data.results.map(u => ({ id: u.id, nome: u.nome }))
  }, [])

  async function createDepartamento(payload: { nome: string; gestor: string | null }) {
    const created = await api.post<Departamento>('/auth/departments/', payload)
    setState(s => ({
      ...s,
      departamentos: [...s.departamentos, created].sort((a, b) => a.nome.localeCompare(b.nome)),
      total: s.total + 1,
    }))
    return created
  }

  async function updateDepartamento(
    id: string,
    payload: { nome: string; gestor: string | null }
  ) {
    const updated = await api.patch<Departamento>(`/auth/departments/${id}/`, payload)
    setState(s => ({
      ...s,
      departamentos: s.departamentos
        .map(d => (d.id === id ? updated : d))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    }))
    return updated
  }

  async function deleteDepartamento(id: string) {
    await api.delete(`/auth/departments/${id}/`)
    setState(s => ({
      ...s,
      departamentos: s.departamentos.filter(d => d.id !== id),
      total: s.total - 1,
    }))
  }

  return {
    ...state,
    fetchDepartamentos,
    fetchGestores,
    createDepartamento,
    updateDepartamento,
    deleteDepartamento,
  }
}
