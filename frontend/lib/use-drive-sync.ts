import { useState, useCallback } from 'react'
import { api } from './api'
import type { DriveSyncState } from './types'

export function useDriveSync(courseId: string) {
  const [state, setState] = useState<DriveSyncState | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSync = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<DriveSyncState>(`/courses/${courseId}/drive-sync/`)
      setState(data)
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar dados do Drive.')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  async function triggerSync(folderId: string): Promise<DriveSyncState> {
    setSyncing(true)
    setError(null)
    try {
      const data = await api.post<DriveSyncState>(`/courses/${courseId}/drive-sync/`, {
        folder_id: folderId,
      })
      setState(data)
      return data
    } catch (e: any) {
      const msg =
        e?.message?.includes('folder_id') ? 'ID de pasta inválido.' :
        e?.message?.includes('Google Drive não configurado') ? e.message :
        e?.message ?? 'Erro ao sincronizar com o Google Drive.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setSyncing(false)
    }
  }

  return { state, loading, syncing, error, fetchSync, triggerSync }
}
