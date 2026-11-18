'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

type Params = Record<string, string | number | boolean | null | undefined>

interface Page<R> {
  count: number
  next: string | null
  results: R[]
}

/**
 * Lista com rolagem infinita: busca `pageSize` itens por vez no servidor
 * (DRF `?page=&page_size=`) e acumula. Ao mudar `params`, recomeça da página 1.
 *
 * Use `sentinelRef` num elemento no fim da lista: quando ele entra na tela,
 * a próxima página é carregada.
 */
export function useInfiniteList<T, R = any>(
  endpoint: string,
  params: Params = {},
  options: { pageSize?: number; map?: (raw: R) => T } = {},
) {
  const pageSize = options.pageSize ?? 12
  const mapRef = useRef(options.map)
  mapRef.current = options.map

  const paramsKey = JSON.stringify(params)

  const [items, setItems] = useState<T[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)            // última página carregada
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)    // primeira página
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geracao = useRef(0)       // descarta respostas de filtros antigos
  const carregando = useRef(false)

  const fetchPage = useCallback(async (pagina: number, gen: number) => {
    const qs = new URLSearchParams()
    Object.entries(JSON.parse(paramsKey) as Params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    })
    qs.set('page', String(pagina))
    qs.set('page_size', String(pageSize))
    const sep = endpoint.includes('?') ? '&' : '?'
    const res = await api.get<Page<R>>(`${endpoint}${sep}${qs}`)
    if (gen !== geracao.current) return
    const novos = (res?.results ?? []).map(r => (mapRef.current ? mapRef.current(r) : (r as unknown as T)))
    setItems(prev => (pagina === 1 ? novos : [...prev, ...novos]))
    setCount(res?.count ?? 0)
    setPage(pagina)
    setHasMore(!!res?.next)
  }, [endpoint, paramsKey, pageSize])

  /** Recarrega do zero (filtros novos, ou após criar/excluir). */
  const reset = useCallback(async () => {
    const gen = ++geracao.current
    carregando.current = true
    setLoading(true)
    setError(null)
    setHasMore(true)
    try {
      await fetchPage(1, gen)
    } catch (e: any) {
      if (gen !== geracao.current) return
      setItems([]); setCount(0); setHasMore(false)
      setError(e?.message ?? 'Erro ao carregar dados.')
    } finally {
      if (gen === geracao.current) { setLoading(false); carregando.current = false }
    }
  }, [fetchPage])

  useEffect(() => { reset() }, [reset])

  const loadMore = useCallback(async () => {
    if (carregando.current || !hasMore) return
    const gen = geracao.current
    carregando.current = true
    setLoadingMore(true)
    try {
      await fetchPage(page + 1, gen)
    } catch {
      if (gen === geracao.current) setHasMore(false)
    } finally {
      if (gen === geracao.current) { setLoadingMore(false); carregando.current = false }
    }
  }, [fetchPage, hasMore, page])

  // Observa o "sentinela" no fim da lista
  const observer = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore
  const sentinelNode = useRef<HTMLElement | null>(null)
  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()
    sentinelNode.current = node
    if (!node) return
    observer.current = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadMoreRef.current() },
      { rootMargin: '200px' },  // começa a buscar um pouco antes de chegar ao fim
    )
    observer.current.observe(node)
  }, [])
  useEffect(() => () => observer.current?.disconnect(), [])

  // Se a página carregada não encheu a tela, o sentinela continua visível e o
  // observer não dispara de novo: re-observar força uma nova verificação.
  useEffect(() => {
    const node = sentinelNode.current
    if (!node || !observer.current || loading || loadingMore || !hasMore) return
    observer.current.unobserve(node)
    observer.current.observe(node)
  }, [page, loading, loadingMore, hasMore])

  return { items, setItems, count, hasMore, loading, loadingMore, error, loadMore, reset, sentinelRef }
}
