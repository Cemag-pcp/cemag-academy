'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { User, Role } from './types'
import { authApi, tokenStorage, type ApiUser } from './api'

// ── Conversão ApiUser → User (front) ──────────────────────────────────────────
function toUser(u: ApiUser): User {
  return {
    id:             u.id,
    matricula:      u.matricula,
    nome:           u.nome,
    email:          u.email,
    cargo:          u.cargo,
    departamento:   u.departamento,
    role:           u.role,
    status:         u.status,
    avatar:         u.avatar ?? '',
    dataAdmissao:   u.data_admissao ?? '',
    permissions:    u.permissions,
    cursosAtribuidos: [],
    cursosCompletos:  [],
  }
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (matricula: string, password: string) => Promise<boolean>
  logout: () => void
  switchRole: (role: Role) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_EMAILS: Record<Role, string> = {
  rh:          'ana.ferreira@cemag.com.br',
  gestor:      'carlos.santos@cemag.com.br',
  colaborador: 'marcos.lima@cemag.com.br',
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restaura sessão ao montar (token já salvo no localStorage)
  useEffect(() => {
    const restore = async () => {
      const access = tokenStorage.getAccess()
      if (!access) { setIsLoading(false); return }
      try {
        const apiUser = await authApi.me()
        setUser(toUser(apiUser))
      } catch {
        tokenStorage.clearTokens()
      } finally {
        setIsLoading(false)
      }
    }
    restore()
  }, [])

  const login = useCallback(async (matricula: string, password: string): Promise<boolean> => {
    const data = await authApi.login(matricula, password)
    tokenStorage.setTokens(data.access, data.refresh)
    setUser(toUser(data.user))
    return true
  }, [])

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh()
    if (refresh) {
      try { await authApi.logout(refresh) } catch { /* ignora */ }
    }
    tokenStorage.clearTokens()
    setUser(null)
  }, [])

  // Utilitário demo: faz login direto com a conta do role escolhido
  const switchRole = useCallback(async (role: Role) => {
    try {
      const data = await authApi.login(DEMO_EMAILS[role], 'cemag2025')
      tokenStorage.setTokens(data.access, data.refresh)
      setUser(toUser(data.user))
    } catch {
      // silencioso — só usado em demo
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const apiUser = await authApi.me()
      setUser(toUser(apiUser))
    } catch { /* ignora */ }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, switchRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
