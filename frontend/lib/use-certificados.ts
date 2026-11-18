'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, tokenStorage } from './api'
import type { Certificate } from './types'

function mapCertificate(raw: any): Certificate {
  return {
    id: String(raw.id),
    colaboradorId: String(raw.colaborador),
    cursoId: String(raw.curso),
    titulo: raw.titulo ?? raw.curso_titulo ?? '',
    colaboradorNome: raw.colaborador_nome ?? 'Colaborador',
    cursoTitulo: raw.curso_titulo ?? '',
    cargaHoraria: raw.carga_horaria ?? 0,
    dataConclusao: raw.data_conclusao
      ? new Date(raw.data_conclusao).toLocaleDateString('pt-BR')
      : '—',
    gestorNome: raw.gestor_nome ?? 'CEMAG Academy',
    gestorCargo: raw.gestor_cargo ?? 'Recursos Humanos',
    emitidoEm: raw.emitido_em ?? '',
  }
}

export function useCertificados() {
  const [certificados, setCertificados] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<any>('/certificates/')
      const items: any[] = res?.results ?? res ?? []
      setCertificados(items.map(mapCertificate))
    } catch {
      setCertificados([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function downloadCertificate(certificateId: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/certificates/${certificateId}/download/`, {
        headers: {
          'Authorization': `Bearer ${tokenStorage.getAccess()}`,
        },
      })
      
      if (!response.ok) throw new Error('Erro ao baixar certificado')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificado_${certificateId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      throw error
    }
  }

  return { certificados, loading, reload: load, downloadCertificate }
}
