import { useState, useCallback } from 'react'
import { api } from './api'

export interface Cargo {
  id: string
  nome: string
  descricao: string
  ativo: boolean
  setores: string[]        // ids dos setores
  setores_nomes: string[]
}

export interface CargoPayload {
  nome: string
  descricao: string
  ativo: boolean
  setores: string[]
}

interface CargosState {
  cargos: Cargo[]
  total: number
  loading: boolean
  error: string | null
}

export function useCargos() {
  const [state, setState] = useState<CargosState>({
    cargos: [],
    total: 0,
    loading: false,
    error: null,
  })

  const fetchCargos = useCallback(async (search = '') => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const params = new URLSearchParams({ page_size: '500', ordering: 'nome' })
      if (search) params.set('search', search)
      const data = await api.get<{ count: number; results: Cargo[] }>(
        `/auth/cargos/?${params}`
      )
      setState({ cargos: data.results, total: data.count, loading: false, error: null })
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message ?? 'Erro ao carregar cargos.' }))
    }
  }, [])

  async function createCargo(payload: CargoPayload) {
    const created = await api.post<Cargo>('/auth/cargos/', payload)
    setState(s => ({
      ...s,
      cargos: [...s.cargos, created].sort((a, b) => a.nome.localeCompare(b.nome)),
      total: s.total + 1,
    }))
    return created
  }

  async function updateCargo(
    id: string,
    payload: Partial<CargoPayload>
  ) {
    const updated = await api.patch<Cargo>(`/auth/cargos/${id}/`, payload)
    setState(s => ({
      ...s,
      cargos: s.cargos
        .map(c => (c.id === id ? updated : c))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    }))
    return updated
  }

  async function deleteCargo(id: string) {
    await api.delete(`/auth/cargos/${id}/`)
    setState(s => ({
      ...s,
      cargos: s.cargos.filter(c => c.id !== id),
      total: s.total - 1,
    }))
  }

  return {
    ...state,
    fetchCargos,
    createCargo,
    updateCargo,
    deleteCargo,
  }
}
