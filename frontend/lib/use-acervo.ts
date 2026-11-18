'use client'

import { api } from './api'
import type { Documento } from './types'

export function mapDoc(raw: any): Documento {
  return {
    id:               String(raw.id),
    titulo:           raw.titulo ?? '',
    descricao:        raw.descricao ?? '',
    driveId:          raw.drive_id ?? '',
    driveNome:        raw.drive_nome ?? '',
    driveMimeType:    raw.drive_mime_type ?? '',
    driveWebViewLink: raw.drive_web_view_link ?? '',
    driveThumbnail:   raw.drive_thumbnail ?? '',
    cargos:           (raw.cargos ?? []).map((c: any) => ({ id: String(c.id), nome: c.nome, descricao: '', ativo: true })),
    criadoPor:        String(raw.criado_por ?? ''),
    criadoPorNome:    raw.criado_por_nome ?? '',
    criadoEm:         raw.criado_em ?? '',
    ativo:            raw.ativo ?? true,
    isVisto:          raw.is_visto ?? false,
  }
}

export interface DriveFileInfo {
  drive_id: string
  drive_nome: string
  drive_mime_type: string
  drive_web_view_link: string
  drive_thumbnail: string
  size?: string
}

export interface StatusSincronizacao {
  em_andamento: boolean
  ultima_ok_em: string | null
  ultima_status: 'ok' | 'erro' | 'executando' | null
  ultima_erro: string
  /** Só para o RH: totais e pendências da última sincronização bem-sucedida */
  resumo?: {
    documentos_publicados: number
    criados: number
    atualizados: number
    desativados: number
    pendencias: Record<string, any[]>
  }
}

export interface ResumoAcervo {
  total: number
  nao_lidos: number
  tipos: string[]
  setores: string[]
  cargos: { id: string; nome: string; setores: string[] }[]
  sincronizacao?: StatusSincronizacao
}

/**
 * Ações da Documentação ISO (espelho das planilhas: sem criar/editar/excluir). A listagem é feita com rolagem infinita
 * (useInfiniteList em /acervo/), com filtros aplicados no servidor.
 */
export function useAcervo() {
  async function fetchResumo(): Promise<ResumoAcervo> {
    return api.get<ResumoAcervo>('/acervo/resumo/')
  }

  async function fetchDriveInfo(driveId: string): Promise<DriveFileInfo> {
    return api.get<DriveFileInfo>(`/acervo/drive-info/?drive_id=${encodeURIComponent(driveId)}`)
  }

  async function marcarVisto(id: string): Promise<boolean> {
    const res = await api.post<{ is_visto: boolean }>(`/acervo/${id}/marcar-visto/`)
    return res.is_visto
  }

  function getProxyUrl(id: string) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    return `${base}/acervo/${id}/proxy/`
  }

  return { fetchResumo, fetchDriveInfo, marcarVisto, getProxyUrl }
}
