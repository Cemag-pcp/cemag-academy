/**
 * CEMAG Academy — API Client
 *
 * Wrapper sobre fetch com:
 *  - Injeção automática do Bearer token
 *  - Renovação silenciosa (refresh) ao receber 401
 *  - Tipagem básica das respostas
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

// ── Token helpers ──────────────────────────────────────────────────────────────

const TOKEN_KEY    = '@cemag:access'
const REFRESH_KEY  = '@cemag:refresh'

export const tokenStorage = {
  getAccess:    ()  => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY)   : null),
  getRefresh:   ()  => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null),
  setTokens:    (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY,   access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clearTokens:  ()  => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
}

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) return null

  const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    tokenStorage.clearTokens()
    return null
  }

  const data = await res.json()
  tokenStorage.setTokens(data.access, data.refresh ?? refresh)
  return data.access
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth = false, headers: extraHeaders = {}, ...rest } = options

  const buildHeaders = (token?: string | null): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  })

  const makeRequest = (token?: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: buildHeaders(token),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

  let token = tokenStorage.getAccess()
  let response = await makeRequest(token)

  // Token expirado — tentar refresh
  if (response.status === 401 && !skipAuth) {
    if (isRefreshing) {
      // Aguarda o refresh em curso
      await new Promise<void>(resolve => {
        refreshQueue.push((newToken) => {
          token = newToken
          resolve()
        })
      })
      response = await makeRequest(token)
    } else {
      isRefreshing = true
      const newToken = await refreshAccessToken()
      isRefreshing = false

      if (newToken) {
        refreshQueue.forEach(cb => cb(newToken))
        refreshQueue = []
        response = await makeRequest(newToken)
      } else {
        // Redireciona para login se não conseguir renovar
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new Error('Sessão expirada.')
      }
    }
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`
    try {
      const err = await response.json()
      message = err?.detail ?? err?.non_field_errors?.[0] ?? JSON.stringify(err)
    } catch {
      // sem body JSON
    }
    throw new Error(message)
  }

  // 204 No Content
  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

// ── Métodos de conveniência ────────────────────────────────────────────────────

export const api = {
  get:    <T>(path: string, opts?: RequestOptions)              => request<T>(path, { method: 'GET',    ...opts }),
  post:   <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'POST',   body, ...opts }),
  put:    <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'PUT',    body, ...opts }),
  patch:  <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'PATCH',  body, ...opts }),
  delete: <T>(path: string, opts?: RequestOptions)              => request<T>(path, { method: 'DELETE', ...opts }),

  /** Upload de arquivo via multipart/form-data */
  upload: async <T>(path: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST'): Promise<T> => {
    const token = tokenStorage.getAccess()
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      let message = `Erro ${res.status}`
      try { const err = await res.json(); message = err?.detail ?? JSON.stringify(err) } catch {}
      throw new Error(message)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  },
}

// ── Auth específicos ───────────────────────────────────────────────────────────

export interface LoginResponse {
  access:  string
  refresh: string
  user:    ApiUser
}

export interface ApiUser {
  id:           string
  matricula:    string
  nome:         string
  email:        string
  cargo:        string
  departamento: string
  role:         'rh' | 'gestor' | 'colaborador'
  status:       'ativo' | 'inativo'
  avatar:       string | null
  data_admissao: string | null
  date_joined:  string
  permissions:  {
    usuarios:      boolean
    cursos:        boolean
    relatorios:    boolean
    certificados:  boolean
    avaliacoes:    boolean
    biblioteca:    boolean
    configuracoes: boolean
  }
}

export const authApi = {
  login: (matricula: string, password: string) =>
    api.post<LoginResponse>('/auth/login/', { matricula, password }, { skipAuth: true }),

  logout: (refresh: string) =>
    api.post<void>('/auth/logout/', { refresh }),

  me: () =>
    api.get<ApiUser>('/auth/me/'),

  refreshToken: (refresh: string) =>
    api.post<{ access: string; refresh: string }>(
      '/auth/token/refresh/',
      { refresh },
      { skipAuth: true }
    ),
}
