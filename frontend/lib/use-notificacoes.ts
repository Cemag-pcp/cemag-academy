import { useState, useEffect } from 'react'
import { api } from './api'

export interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  criada_em: string
  link: string
}

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotificacoes = async () => {
    try {
      console.log('[useNotificacoes] Buscando notificações...')
      const data = await api.get<Notificacao[]>('/notifications/')
      console.log('[useNotificacoes] Data recebido:', data)
      console.log('[useNotificacoes] É array?', Array.isArray(data))
      
      // A API retorna direto o array de notificações
      const notifs = Array.isArray(data) ? data : []
      console.log('[useNotificacoes] Notificações:', notifs)
      console.log('[useNotificacoes] Total:', notifs.length)
      
      setNotificacoes(notifs)
      const count = notifs.filter((n: Notificacao) => !n.lida).length
      console.log('[useNotificacoes] Não lidas:', count)
      setNaoLidas(count)
    } catch (error) {
      console.error('[useNotificacoes] Erro ao buscar notificações:', error)
      setNotificacoes([])
      setNaoLidas(0)
    } finally {
      setLoading(false)
    }
  }

  const marcarComoLida = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/mark-read/`)
      await fetchNotificacoes()
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  const marcarTodasComoLidas = async () => {
    try {
      await api.post('/notifications/mark-all-read/')
      await fetchNotificacoes()
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  useEffect(() => {
    fetchNotificacoes()
    
    // Atualizar notificações a cada 30 segundos
    const interval = setInterval(fetchNotificacoes, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    refresh: fetchNotificacoes,
  }
}
