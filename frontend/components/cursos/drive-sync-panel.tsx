'use client'

import { useEffect, useState } from 'react'
import {
  RefreshCw, FolderOpen, ExternalLink, Eye,
  Video, FileText, FileSpreadsheet, BookOpen, MonitorPlay,
  Image as ImageIcon, File, HelpCircle, CloudOff, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDriveSync } from '@/lib/use-drive-sync'
import type { DriveFile, DriveCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ─── Icons & labels per category ────────────────────────────────────────────

const CATEGORY_META: Record<DriveCategory, {
  Icon: React.ElementType
  label: string
  color: string
  badgeClass: string
}> = {
  video: {
    Icon: Video,
    label: 'Vídeo',
    color: 'text-rose-500',
    badgeClass: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-300',
  },
  pdf: {
    Icon: FileText,
    label: 'PDF',
    color: 'text-orange-500',
    badgeClass: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  },
  sheet: {
    Icon: FileSpreadsheet,
    label: 'Planilha',
    color: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  },
  doc: {
    Icon: BookOpen,
    label: 'Documento',
    color: 'text-blue-500',
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  },
  slide: {
    Icon: MonitorPlay,
    label: 'Apresentação',
    color: 'text-yellow-500',
    badgeClass: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300',
  },
  image: {
    Icon: ImageIcon,
    label: 'Imagem',
    color: 'text-purple-500',
    badgeClass: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
  },
  other: {
    Icon: File,
    label: 'Arquivo',
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── File Card ───────────────────────────────────────────────────────────────

function FileCard({
  file,
  onPreview,
}: {
  file: DriveFile
  onPreview: (f: DriveFile) => void
}) {
  const meta = CATEGORY_META[file.category] ?? CATEGORY_META.other
  const { Icon, color, badgeClass } = meta

  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all">
      {/* Thumbnail or icon */}
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg bg-muted/60', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0.5', badgeClass)}>
          {meta.label}
        </Badge>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatBytes(file.size)} · {formatDate(file.modified_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs gap-1"
          onClick={() => onPreview(file)}
        >
          <Eye className="h-3 w-3" /> Visualizar
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          asChild
        >
          <a href={file.web_view_link} target="_blank" rel="noopener noreferrer" title="Abrir no Drive">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface DriveSyncPanelProps {
  courseId: string
}

export function DriveSyncPanel({ courseId }: DriveSyncPanelProps) {
  const { state, loading, syncing, error, fetchSync, triggerSync } = useDriveSync(courseId)
  const [folderInput, setFolderInput] = useState('')
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)
  const [filterCat, setFilterCat] = useState<DriveCategory | 'all'>('all')

  useEffect(() => {
    fetchSync()
  }, [fetchSync])

  // Sync folder input with loaded state
  useEffect(() => {
    if (state?.folder_id) setFolderInput(state.folder_id)
  }, [state?.folder_id])

  async function handleSync() {
    const id = folderInput.trim()
    if (!id) { toast.error('Informe o ID da pasta do Google Drive.'); return }
    try {
      const result = await triggerSync(id)
      toast.success(`Sincronização concluída! ${result.file_count} arquivo(s) importado(s).`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const files = state?.files ?? []

  // Unique categories present in file list
  const presentCats = Array.from(new Set(files.map(f => f.category))) as DriveCategory[]

  const filtered = filterCat === 'all' ? files : files.filter(f => f.category === filterCat)

  return (
    <div className="space-y-5">
      {/* Config row */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <div>
          <Label htmlFor="drive-folder-id" className="text-sm font-medium">
            ID da pasta do Google Drive
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acesse a pasta no Drive, copie o ID da URL:{' '}
            <code className="bg-muted px-1 rounded text-xs">
              drive.google.com/drive/folders/<strong>{'<ID_AQUI>'}</strong>
            </code>
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            id="drive-folder-id"
            placeholder="ex.: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74"
            value={folderInput}
            onChange={e => setFolderInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSync()}
            className="font-mono text-sm"
          />
          <Button onClick={handleSync} disabled={syncing || !folderInput.trim()} className="gap-2 flex-shrink-0">
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>

        {/* Status bar */}
        {state && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {state.file_count} arquivo(s) sincronizado(s)
            </span>
            {state.last_sync && (
              <>
                <span>·</span>
                <span>Última sincronização: {formatDate(state.last_sync)}</span>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <CloudOff className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* How to share tip */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Como configurar:</strong> Compartilhe a pasta do Google Drive com o e-mail da Service Account
          configurada no servidor (ex.: <code>cemag@cemag-lms.iam.gserviceaccount.com</code>). Arquivos suportados:
          vídeos, PDFs, documentos, planilhas, apresentações e imagens.
        </div>
      </div>

      <Separator />

      {/* File grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <FolderOpen className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum arquivo sincronizado.</p>
          <p className="text-xs mt-1">Informe o ID da pasta e clique em Sincronizar.</p>
        </div>
      ) : (
        <>
          {/* Category filter */}
          {presentCats.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={filterCat === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilterCat('all')}
              >
                Todos ({files.length})
              </Button>
              {presentCats.map(cat => {
                const meta = CATEGORY_META[cat]
                const count = files.filter(f => f.category === cat).length
                return (
                  <Button
                    key={cat}
                    variant={filterCat === cat ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setFilterCat(cat)}
                  >
                    <meta.Icon className="h-3.5 w-3.5" />
                    {meta.label} ({count})
                  </Button>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(file => (
              <FileCard key={file.id} file={file} onPreview={setPreviewFile} />
            ))}
          </div>
        </>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={open => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-sm font-semibold truncate flex-1">
                {previewFile?.name}
              </DialogTitle>
              <a
                href={previewFile?.web_view_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir no Drive
              </a>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewFile && (
              <iframe
                src={previewFile.embed_url}
                className="w-full h-full border-0"
                allow="autoplay"
                allowFullScreen
                title={previewFile.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
