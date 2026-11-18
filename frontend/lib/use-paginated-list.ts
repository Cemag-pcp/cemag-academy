'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

export const PAGE_SIZE_PADRAO = 20

type Params = Record<string, string | number | boolean | null | undefined>

interface Page<R> {
  count: number
  results: R[]
}

/** Atrasa a atualização de um valor (ex.: texto de busca) para não disparar uma requisição por tecla. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Lista paginada no servidor (DRF PageNumberPagination: `?page=&page_size=`).
 * Busca e filtros vão em `params`; quando eles mudam, volta para a página 1.
 */
export function usePaginatedList<T, R = any>(
  endpoint: string,
  params: Params = {},
  options: { pageSize?: number; map?: (raw: R) => T } = {},
) {
  const pageSize = options.pageSize ?? PAGE_SIZE_PADRAO
  const mapRef = useRef(options.map)
  mapRef.current = options.map

  const paramsKey = JSON.stringify(params)

  // A página fica "presa" aos filtros em que foi escolhida: filtro novo → página 1,
  // sem disparar uma requisição intermediária com a página antiga.
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 })
  const page = pageState.key === paramsKey ? pageState.page : 1
  const setPage = useCallback(
    (p: number) => setPageState({ key: paramsKey, page: Math.max(1, p) }),
    [paramsKey],
  )

  const [items, setItems] = useState<T[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const load = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      Object.entries(JSON.parse(paramsKey) as Params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
      })
      qs.set('page', String(page))
      qs.set('page_size', String(pageSize))
      const sep = endpoint.includes('?') ? '&' : '?'
      const res = await api.get<Page<R>>(`${endpoint}${sep}${qs}`)
      if (id !== reqId.current) return
      const results = res?.results ?? []
      setItems(mapRef.current ? results.map(mapRef.current) : (results as unknown as T[]))
      setCount(res?.count ?? results.length)
    } catch (e: any) {
      if (id !== reqId.current) return
      // Página deixou de existir (ex.: excluiu o último item dela) → volta uma
      if (page > 1) {
        setPageState({ key: paramsKey, page: page - 1 })
        return
      }
      setError(e?.message ?? 'Erro ao carregar dados.')
      setItems([])
      setCount(0)
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [endpoint, paramsKey, page, pageSize])

  useEffect(() => { load() }, [load])

  return {
    items,
    count,
    page,
    setPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    loading,
    error,
    reload: load,
  }
}
