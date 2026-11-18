'use client'

import { useEffect, useState, useRef } from 'react'
import { ExternalLink, Loader2, AlertTriangle, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { tokenStorage } from '@/lib/api'
import type { DriveFile } from '@/lib/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface DriveFileViewerProps {
  file: DriveFile
}

export function DriveFileViewer({ file }: DriveFileViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevBlobUrl = useRef<string | null>(null)

  const isVideo = file.category === 'video'
  const isImage = file.category === 'image'

  useEffect(() => {
    if (isVideo) return

    let cancelled = false
    setBlobUrl(null)
    setError(null)
    setLoading(true)

    const token = tokenStorage.getAccess()
    fetch(`${BASE_URL}/courses/drive-proxy/${file.drive_id}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Erro ${res.status}`)
        }
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
        prevBlobUrl.current = url
        setBlobUrl(url)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Erro ao carregar arquivo')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [file.drive_id, isVideo])

  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
    }
  }, [])

  if (isVideo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-muted/40 border border-dashed border-border py-14">
        <Video className="w-12 h-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Vídeos precisam ser abertos no Google Drive</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique no botão abaixo para assistir
          </p>
        </div>
        <Button size="sm" onClick={() => window.open(file.web_view_link, '_blank')} className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Abrir vídeo no Drive
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl bg-muted/20 border border-border">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Carregando {file.name}…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-destructive/5 border border-destructive/30 py-10">
        <AlertTriangle className="w-10 h-10 text-destructive/70" />
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">Não foi possível carregar o arquivo</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open(file.web_view_link, '_blank')} className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Abrir no Google Drive
        </Button>
      </div>
    )
  }

  if (!blobUrl) return null

  if (isImage) {
    return (
      <div className="rounded-xl overflow-hidden border border-border bg-muted/20 p-6">
        <img
          src={blobUrl}
          alt={file.name}
          className="w-full h-auto max-h-[700px] object-contain mx-auto rounded-lg"
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
      <iframe
        src={blobUrl}
        className="w-full h-[700px]"
        title={file.name}
      />
    </div>
  )
}
