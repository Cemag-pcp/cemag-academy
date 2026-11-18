'use client'

import { useState } from 'react'
import { Upload, X, File, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface LessonFile {
  id: string
  arquivo: string
  url: string
  nome: string
  tipo: string
  tamanho: number
}

interface LessonFilesManagerProps {
  lessonId: string
  lessonTitle: string
  files: LessonFile[]
  onUpdate: () => void
  open: boolean
  onClose: () => void
}

export function LessonFilesManager({ 
  lessonId, 
  lessonTitle, 
  files, 
  onUpdate, 
  open, 
  onClose 
}: LessonFilesManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('lesson_id', lessonId)
      
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i])
      }

      await api.upload('/courses/upload-lesson-files/', formData)

      toast.success(`${selectedFiles.length} arquivo(s) enviado(s) com sucesso!`)
      onUpdate()
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro ao fazer upload dos arquivos')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  async function handleDelete(fileId: string) {
    setDeleting(fileId)
    try {
      await api.delete(`/courses/delete-lesson-file/${fileId}/`)
      toast.success('Arquivo removido com sucesso')
      onUpdate()
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro ao remover arquivo')
    } finally {
      setDeleting(null)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Arquivos da Aula: {lessonTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <Card>
            <CardContent className="pt-6">
              <label htmlFor={`file-upload-${lessonId}`} className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Enviando arquivos...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium">Clique ou arraste arquivos aqui</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Imagens, PDFs, vídeos, documentos, etc.
                      </p>
                    </>
                  )}
                </div>
                <input
                  id={`file-upload-${lessonId}`}
                  type="file"
                  multiple
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                  accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
              </label>
            </CardContent>
          </Card>

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Arquivos ({files.length})</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <Card key={file.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-3 flex items-center gap-3">
                      <File className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.tipo} • {formatFileSize(file.tamanho)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                          className="h-8"
                        >
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.id)}
                          disabled={deleting === file.id}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          {deleting === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && !uploading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum arquivo adicionado ainda
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
