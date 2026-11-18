'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import type { User, Role } from './types'

export function mapUser(raw: any): User {
  return {
    id: String(raw.id),
    matricula: raw.matricula ?? '',
    nome: raw.nome ?? '',
    email: raw.email ?? '',
    cargo: raw.cargo ?? '',
    departamento: raw.departamento ?? '',
    role: raw.role as Role,
    status: raw.status ?? 'ativo',
    avatar: raw.avatar ?? null,
    dataAdmissao: raw.data_admissao ?? raw.date_joined ?? '',
    cursosAtribuidos: [],
    cursosCompletos: [],
    permissions: raw.permissions ?? {},
  }
}

export interface UsuarioFormData {
  matricula: string
  nome: string
  email: string
  cargo: string
  departamento: string
  role: Role
  password?: string
}

export interface ApiDepartment {
  id: string
  nome: string
}

export interface ResumoUsuarios {
  total: number
  ativos: number
  inativos: number
}

/**
 * Apoio da tela de usuários: setores (para os selects), totais dos cards e ações.
 * A lista em si é paginada no servidor (usePaginatedList em /auth/users/).
 */
export function useUsuarios() {
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [resumo, setResumo] = useState<ResumoUsuarios>({ total: 0, ativos: 0, inativos: 0 })

  const loadResumo = useCallback(async () => {
    try {
      setResumo(await api.get<ResumoUsuarios>('/auth/users/resumo/'))
    } catch {
      // cards ficam zerados; a tabela continua funcionando
    }
  }, [])

  useEffect(() => {
    loadResumo()
    api.get<any>('/auth/departments/?page_size=500&ordering=nome')
      .then(res => {
        const deps: any[] = res?.results ?? res ?? []
        setDepartments(deps.map(d => ({ id: String(d.id), nome: d.nome })))
      })
      .catch(() => setDepartments([]))
  }, [loadResumo])

  async function createUsuario(form: UsuarioFormData) {
    const raw = await api.post<any>('/auth/users/', {
      matricula: form.matricula,
      nome: form.nome,
      email: form.email,
      cargo: form.cargo,
      departamento: form.departamento,
      role: form.role,
      status: 'ativo',
      password: form.password ?? 'cemag2025',
    })
    loadResumo()
    return mapUser(raw)
  }

  async function updateUsuario(id: string, form: Partial<UsuarioFormData>) {
    const raw = await api.patch<any>(`/auth/users/${id}/`, {
      nome: form.nome,
      cargo: form.cargo,
      departamento: form.departamento,
      role: form.role,
    })
    return mapUser(raw)
  }

  async function toggleStatus(id: string) {
    const raw = await api.patch<any>(`/auth/users/${id}/toggle-status/`)
    loadResumo()
    return mapUser(raw)
  }

  return { departments, resumo, createUsuario, updateUsuario, toggleStatus }
}
