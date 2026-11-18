'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import type { LibraryItem } from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function mapItem(raw: any): LibraryItem {
  return {
    id: String(raw.id),
    titulo: raw.titulo ?? '',
    descricao: raw.descricao ?? '',
    categoria: raw.categoria ?? '',
    arquivo: raw.arquivo ?? '',
    tamanho: raw.tamanho ?? '',
    driveId: raw.drive_id ?? '',
    driveNome: raw.drive_nome ?? '',
    driveWebViewLink: raw.drive_web_view_link ?? '',
    rolesPermitidas: raw.roles_permitidas ?? [],
    departamentosPermitidos: raw.departamentos_permitidos ?? [],
    criadoPor: String(raw.criado_por ?? ''),
    criadoEm: raw.criado_em ?? '',
    downloads: raw.downloads ?? 0,
    favoritos: [],
    tags: raw.tags ?? [],
    isFavorito: raw.is_favorito ?? false,
  }
}

export interface BibliotecaFormData {
  titulo: string
  descricao: string
  categoria: string
  tags: string
  rolesPermitidas: string[]
  arquivo?: File | null
  driveId?: string
  driveNome?: string
  driveWebViewLink?: string
}

export function useBiblioteca() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<any>('/library/')
      const all: any[] = res?.results ?? res ?? []
      setItems(all.map(mapItem))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function createItem(form: BibliotecaFormData) {
    const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    if (form.arquivo) {
      const fd = new FormData()
      fd.append('titulo', form.titulo)
      fd.append('descricao', form.descricao)
      fd.append('categoria', form.categoria)
      fd.append('tags', JSON.stringify(tagsArr))
      fd.append('roles_permitidas', JSON.stringify(form.rolesPermitidas))
      fd.append('arquivo', form.arquivo)
      const raw = await api.upload<any>('/library/', fd, 'POST')
      setItems(prev => [mapItem(raw), ...prev])
      return mapItem(raw)
    } else {
      const raw = await api.post<any>('/library/', {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        tags: tagsArr,
        roles_permitidas: form.rolesPermitidas,
        drive_id: form.driveId ?? '',
        drive_nome: form.driveNome ?? '',
        drive_web_view_link: form.driveWebViewLink ?? '',
      })
      setItems(prev => [mapItem(raw), ...prev])
      return mapItem(raw)
    }
  }

  async function updateItem(id: string, form: BibliotecaFormData) {
    const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    if (form.arquivo) {
      const fd = new FormData()
      fd.append('titulo', form.titulo)
      fd.append('descricao', form.descricao)
      fd.append('categoria', form.categoria)
      fd.append('tags', JSON.stringify(tagsArr))
      fd.append('roles_permitidas', JSON.stringify(form.rolesPermitidas))
      fd.append('arquivo', form.arquivo)
      const raw = await api.upload<any>(`/library/${id}/`, fd, 'PATCH')
      setItems(prev => prev.map(i => i.id === id ? mapItem(raw) : i))
      return mapItem(raw)
    } else {
      const raw = await api.patch<any>(`/library/${id}/`, {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        tags: tagsArr,
        roles_permitidas: form.rolesPermitidas,
        drive_id: form.driveId ?? '',
        drive_nome: form.driveNome ?? '',
        drive_web_view_link: form.driveWebViewLink ?? '',
      })
      setItems(prev => prev.map(i => i.id === id ? mapItem(raw) : i))
      return mapItem(raw)
    }
  }

  async function deleteItem(id: string) {
    await api.delete(`/library/${id}/`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function incrementDownload(id: string) {
    try {
      const res = await api.post<any>(`/library/${id}/download/`)
      setItems(prev => prev.map(i => i.id === id ? { ...i, downloads: res.downloads ?? i.downloads + 1 } : i))
    } catch {}
  }

  async function toggleFavorito(id: string) {
    try {
      const res = await api.post<any>(`/library/${id}/toggle-favorite/`)
      setItems(prev => prev.map(i =>
        i.id === id ? { ...i, isFavorito: res.favorito } : i
      ))
      return res.favorito as boolean
    } catch {
      return false
    }
  }

  function getFileUrl(item: LibraryItem) {
    if (item.driveWebViewLink) return item.driveWebViewLink
    if (!item.arquivo) return null
    if (item.arquivo.startsWith('http')) return item.arquivo
    return `${BASE_URL.replace('/api/v1', '')}${item.arquivo}`
  }

  return { items, loading, createItem, updateItem, deleteItem, incrementDownload, toggleFavorito, getFileUrl, reload: load }
}
