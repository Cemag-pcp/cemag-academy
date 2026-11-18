'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Circle, Play, FileText, Image as ImageIcon,
  FileSpreadsheet, Video, Clock, Users, Award, ChevronDown, ChevronRight,
  Star, MessageSquare, BookOpen, CloudIcon, ExternalLink, File, AlertTriangle,
  X, XCircle, ShieldAlert, ClipboardList, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Lesson, DriveFile } from '@/lib/types'
import { useCursoDetail } from '@/lib/use-cursos'
import { useAuth } from '@/lib/auth-context'
import { usePageTitle } from '@/lib/page-title'
import { DriveSyncPanel } from './drive-sync-panel'
import { DriveFileViewer } from './drive-file-viewer'
import { CursoRespostasPanel } from './curso-respostas-panel'
import { cn } from '@/lib/utils'

function toDriveEmbedUrl(conteudo: string): string {
  if (!conteudo) return ''
  // Já é uma URL completa do Drive
  if (conteudo.startsWith('http')) {
    return conteudo
      .replace(/\/(view|edit|pub)(\?.*)?$/, '/preview')
      .replace(/\/preview\?.*$/, '/preview')
  }
  // É apenas o ID — constrói a URL de embed diretamente
  return `https://drive.google.com/file/d/${conteudo}/preview`
}

function extractDriveId(conteudo: string): string {
  if (!conteudo.startsWith('http')) return conteudo
  const m = conteudo.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : conteudo
}

function DriveProxyViewer({ conteudo, titulo }: { conteudo: string; titulo: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    let objectUrl = ''
    async function load() {
      setLoading(true)
      setError('')
      try {
        const driveId = extractDriveId(conteudo)
        const base    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
        const token   = typeof window !== 'undefined' ? localStorage.getItem('@cemag:access') : ''
        const res     = await fetch(`${base}/acervo/drive-proxy/${driveId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Erro ${res.status}`)
        const blob = await res.blob()
        objectUrl  = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      } catch (e: any) {
        setError(e.message ?? 'Não foi possível carregar o arquivo.')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [conteudo])

  if (loading) return (
    <div className="flex items-center justify-center h-60 rounded-xl border border-border gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando arquivo...</span>
    </div>
  )
  if (error) return (
    <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-destructive/40 text-sm text-destructive gap-2">
      <AlertTriangle className="w-4 h-4" />
      {error}
    </div>
  )
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <iframe src={blobUrl!} className="w-full h-[600px] border-0" title={titulo} />
    </div>
  )
}

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  imagem: ImageIcon,
  excel: FileSpreadsheet,
  texto: BookOpen,
  drive: CloudIcon,
}

const DRIVE_CATEGORY_ICONS: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  sheet: FileSpreadsheet,
  doc: FileText,
  slide: FileText,
  image: ImageIcon,
  other: File,
}

const DRIVE_CATEGORY_COLORS: Record<string, string> = {
  video:  'text-blue-500 bg-blue-500/10',
  pdf:    'text-red-500 bg-red-500/10',
  sheet:  'text-green-500 bg-green-500/10',
  doc:    'text-sky-500 bg-sky-500/10',
  slide:  'text-orange-500 bg-orange-500/10',
  image:  'text-purple-500 bg-purple-500/10',
  other:  'text-muted-foreground bg-muted',
}

const DRIVE_CATEGORY_LABELS: Record<string, string> = {
  video: 'Vídeo', pdf: 'PDF', sheet: 'Planilha',
  doc: 'Documento', slide: 'Apresentação', image: 'Imagem', other: 'Arquivo',
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  // Se foi hoje, mostra apenas o horário
  if (days === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  
  // Se foi ontem
  if (days === 1) {
    return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // Se foi nos últimos 7 dias
  if (days < 7) {
    return `${days} dias atrás`
  }
  
  // Caso contrário, mostra data completa com horário
  return date.toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

interface CursoDetailProps {
  cursoId: string
  onBack?: () => void
}

export function CursoDetail({ cursoId, onBack }: CursoDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { curso, progresso, discussions, loading, completeLesson, uncompleteLesson, completeDriveFile, uncompleteDriveFile, submitAssessment, postDiscussion } = useCursoDetail(cursoId)
  usePageTitle(curso?.titulo)

  const [driveMode, setDriveMode] = useState(false)
  const [respostasMode, setRespostasMode] = useState(false)

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [completedDriveFiles, setCompletedDriveFiles] = useState<Set<string>>(new Set())
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [openMateriais, setOpenMateriais] = useState(true)
  const [discussao, setDiscussao] = useState('')
  const [avaliando, setAvaliando] = useState(false)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [viewingFile, setViewingFile] = useState<DriveFile | null>(null)
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null)
  const [showConfirmAvaliacao, setShowConfirmAvaliacao] = useState(false)
  const [showConfirmAbandonar, setShowConfirmAbandonar] = useState(false)

  const isAdmin = user?.role === 'rh' || user?.role === 'gestor'

  // Bloqueia saída da página durante avaliação
  useEffect(() => {
    if (!avaliando) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [avaliando])

  async function handleExitAvaliacao() {
    // Saída sem finalizar → conta como tentativa com nota 0
    try {
      await submitAssessment([])
      toast.error('Avaliação abandonada. Contabilizada como tentativa com nota 0.')
    } catch {
      // ignora erro silencioso
    }
    setAvaliando(false)
    setRespostas({})
    setSelectedOptions({})
  }

  function openConfirmAvaliacao() {
    setShowConfirmAvaliacao(true)
  }

  function startAvaliacao() {
    setShowConfirmAvaliacao(false)
    setRespostas({})
    setSelectedOptions({})
    setAvaliando(true)
    setDriveMode(false)
    setSelectedDriveFile(null)
    setSelectedLesson(null)
  }

  // Sync completed lessons and initial state when data loads
  useEffect(() => {
    if (curso && curso.modulos.length > 0) {
      setSelectedLesson(curso.modulos[0]?.aulas[0] ?? null)
      setOpenModules(new Set([curso.modulos[0]?.id]))
    } else if (curso && curso.driveFiles && curso.driveFiles.length > 0) {
      // Se não há módulos mas há arquivos Drive, seleciona o primeiro arquivo
      setSelectedDriveFile(curso.driveFiles[0])
    }
  }, [curso?.id])

  useEffect(() => {
    if (progresso) {
      setCompletedLessons(new Set(progresso.aulasCompletas))
      setCompletedDriveFiles(new Set(progresso.arquivosDriveCompletos))
    }
  }, [progresso?.aulasCompletas?.length, progresso?.arquivosDriveCompletos?.length])

  if (loading || !curso) {
    return (
      <div className="flex flex-col h-full p-6 space-y-4">
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="flex gap-4 flex-1">
          <Skeleton className="w-72 h-96 rounded-xl" />
          <Skeleton className="flex-1 h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  const totalAulas = curso.modulos.reduce((acc, m) => acc + m.aulas.length, 0)
  const totalDriveFiles = curso.driveFiles?.length ?? 0
  const totalItens = totalAulas + totalDriveFiles
  const percentual = totalItens > 0
    ? Math.round(((completedLessons.size + completedDriveFiles.size) / totalItens) * 100)
    : 0

  async function toggleLesson(id: string) {
    const wasCompleted = completedLessons.has(id)
    
    try {
      if (!wasCompleted) {
        // Marcar como concluída
        const result = await completeLesson(id, 0)
        if (result) {
          setCompletedLessons(new Set(result.aulasCompletas))
          toast.success('Aula marcada como concluída!')
        } else {
          toast.error('Erro ao marcar aula como concluída')
        }
      } else {
        // Desmarcar
        const result = await uncompleteLesson(id)
        if (result) {
          setCompletedLessons(new Set(result.aulasCompletas))
          toast.info('Aula desmarcada.')
        } else {
          toast.error('Erro ao desmarcar aula')
        }
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro ao atualizar progresso')
    }
  }

  async function toggleDriveFile(driveId: string) {
    const wasDone = completedDriveFiles.has(driveId)
    try {
      if (!wasDone) {
        const result = await completeDriveFile(driveId)
        if (result) {
          setCompletedDriveFiles(new Set(result.arquivosDriveCompletos))
          toast.success('Material marcado como concluído!')
        }
      } else {
        const result = await uncompleteDriveFile(driveId)
        if (result) {
          setCompletedDriveFiles(new Set(result.arquivosDriveCompletos))
          toast.info('Material desmarcado.')
        }
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro ao atualizar progresso')
    }
  }

  function toggleModule(id: string) {
    setOpenModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function submitDiscussao() {
    if (!discussao.trim()) return
    try {
      await postDiscussion(discussao.trim())
      toast.success('Comentário enviado com sucesso!')
      setDiscussao('')
    } catch {
      toast.error('Erro ao enviar comentário.')
    }
  }

  async function handleSubmitAvaliacao() {
    setSubmitting(true)
    try {
      const respostasPayload = Object.entries(respostas).map(([questao_id, resposta]) => ({
        questao_id, resposta,
      }))
      const opcoesPayload = Object.entries(selectedOptions).map(([questao_id, opcoes_ids]) => ({
        questao_id, opcoes_ids,
      }))
      const all = [...respostasPayload, ...opcoesPayload.filter(o => !respostasPayload.find(r => r.questao_id === o.questao_id))]
      const result = await submitAssessment(all)
      if (result) {
        const nota = result.nota_avaliacao ?? result.notaAvaliacao
        const status = result.status_avaliacao ?? result.statusAvaliacao
        if (status === 'aprovado') {
          toast.success(`Avaliação aprovada! Nota: ${nota}`)
        } else if (status === 'reprovado') {
          toast.error(`Avaliação reprovada. Nota: ${nota}. Mínimo: ${curso?.avaliacao?.notaMinimaAprovacao ?? 0}`)
        } else {
          toast.success('Avaliação enviada! Aguarde a revisão do gestor.')
        }
      }
      setAvaliando(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao enviar avaliação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
        <Button variant="ghost" size="sm" onClick={onBack ?? (() => router.back())} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm truncate">{curso.titulo}</h2>
            {curso.obrigatorio && (
              <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive flex-shrink-0">
                Obrigatório
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Progress value={percentual} className="w-32 h-1.5" />
            <span className="text-xs text-muted-foreground">{percentual}% concluído</span>
          </div>
        </div>
        {percentual === 100 && !avaliando && curso.avaliacao && (() => {
          const st = progresso?.statusAvaliacao
          const tentativasUsadas = progresso?.tentativasRealizadas ?? 0
          const tentativasMax = curso.avaliacao.tentativasPermitidas ?? 3

          if (st === 'aprovado') {
            return (
              <Badge variant="outline" className="flex-shrink-0 gap-1 border-green-500 text-green-600 text-xs px-2 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
              </Badge>
            )
          }
          if (st === 'pendente') {
            return (
              <Badge variant="outline" className="flex-shrink-0 gap-1 border-yellow-500 text-yellow-600 text-xs px-2 py-1">
                <Clock className="w-3.5 h-3.5" /> Aguardando revisão
              </Badge>
            )
          }
          if (tentativasUsadas >= tentativasMax) {
            return (
              <Badge variant="outline" className="flex-shrink-0 gap-1 border-destructive/50 text-destructive text-xs px-2 py-1">
                <XCircle className="w-3.5 h-3.5" /> Sem tentativas restantes
              </Badge>
            )
          }
          return (
            <Button size="sm" onClick={openConfirmAvaliacao} className="flex-shrink-0">
              {st === 'reprovado' ? 'Tentar Novamente' : 'Fazer Avaliação'}
              {tentativasUsadas > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({tentativasUsadas}/{tentativasMax})
                </span>
              )}
            </Button>
          )
        })()}
        {percentual === 100 && !avaliando && !curso.avaliacao && (
          <Badge variant="outline" className="flex-shrink-0 gap-1 border-green-500 text-green-600 text-xs px-2 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
          </Badge>
        )}
        {(user?.role === 'rh' || user?.role === 'gestor') && curso.avaliacao && (
          <Button
            size="sm"
            variant={respostasMode ? 'default' : 'outline'}
            className="flex-shrink-0 gap-1.5"
            onClick={() => { setRespostasMode(m => !m); setDriveMode(false); setAvaliando(false) }}
          >
            <ClipboardList className="h-4 w-4" />
            {respostasMode ? 'Fechar Respostas' : 'Respostas'}
          </Button>
        )}
        {(user?.role === 'rh' || user?.role === 'gestor') && (
          <Button
            size="sm"
            variant={driveMode ? 'default' : 'outline'}
            className="flex-shrink-0 gap-1.5"
            onClick={() => { setDriveMode(m => !m); setRespostasMode(false); setAvaliando(false) }}
          >
            <CloudIcon className="h-4 w-4" />
            {driveMode ? 'Fechar Drive' : 'Arquivos Drive'}
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar do curso — módulos/aulas + materiais */}
        <div className="w-72 flex-shrink-0 border-r border-border overflow-y-auto bg-muted/20">
          <div className="p-3 space-y-1">
            {curso.modulos.map((modulo) => (
              <Collapsible key={modulo.id} open={openModules.has(modulo.id)}>
                <CollapsibleTrigger
                  onClick={() => toggleModule(modulo.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  {openModules.has(modulo.id)
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  }
                  <span className="text-xs font-semibold flex-1 truncate">{modulo.titulo}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {modulo.aulas.filter(a => completedLessons.has(a.id)).length}/{modulo.aulas.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-2 space-y-0.5">
                    {modulo.aulas.map(aula => {
                      const Icon = LESSON_ICONS[aula.tipo] ?? BookOpen
                      const done = completedLessons.has(aula.id)
                      const isSelected = selectedLesson?.id === aula.id
                      return (
                        <div key={aula.id}>
                          <button
                            onClick={() => { setSelectedLesson(aula); setSelectedDriveFile(null) }}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs',
                              isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60 text-foreground/80'
                            )}
                          >
                            {done
                              ? <CheckCircle2 className={cn('w-3.5 h-3.5 flex-shrink-0', isSelected ? 'text-primary-foreground' : 'text-success')} />
                              : <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')} />
                            }
                            <span className="truncate flex-1">{aula.titulo}</span>
                            <span className={cn('flex-shrink-0 text-[10px]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                              {aula.duracao}min
                            </span>
                            {isAdmin && (aula as any).arquivos && (aula as any).arquivos.length > 0 && (
                              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                {(aula as any).arquivos.length}
                              </Badge>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Seção Materiais */}
            {curso.driveFiles && curso.driveFiles.length > 0 && (
              <Collapsible open={openMateriais} className="mt-1">
                <CollapsibleTrigger
                  onClick={() => setOpenMateriais(prev => !prev)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  {openMateriais
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  }
                  <File className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-semibold flex-1 truncate">Materiais</span>
                  <span className="text-[10px] text-muted-foreground">
                    {curso.driveFiles.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-2 space-y-0.5">
                    {curso.driveFiles.map((f: DriveFile) => {
                      const Icon = DRIVE_CATEGORY_ICONS[f.category] ?? File
                      const colorClass = DRIVE_CATEGORY_COLORS[f.category] ?? DRIVE_CATEGORY_COLORS.other
                      const label = DRIVE_CATEGORY_LABELS[f.category] ?? 'Arquivo'
                      const isSelected = selectedDriveFile?.id === f.id
                      const canPreview = ['video', 'pdf', 'image', 'sheet', 'doc', 'slide'].includes(f.category)
                      return (
                        <button
                          key={f.id}
                          onClick={() => { setSelectedDriveFile(f); setSelectedLesson(null) }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs',
                            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60 text-foreground/80'
                          )}
                        >
                          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                            isSelected ? 'bg-primary-foreground/20' : colorClass)}>
                            {completedDriveFiles.has(f.drive_id)
                              ? <CheckCircle2 className={cn('w-3 h-3', isSelected ? 'text-primary-foreground' : 'text-success')} />
                              : <Icon className={cn('w-3 h-3', isSelected ? 'text-primary-foreground' : '')} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs truncate', isSelected ? 'text-primary-foreground' : '')}>
                              {f.name}
                            </p>
                            <p className={cn('text-[10px] mt-0.5', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                              {label}{f.size ? ` · ${formatBytes(f.size)}` : ''}
                            </p>
                          </div>
                          {canPreview && (
                            <Play className={cn('w-3 h-3 flex-shrink-0', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Avaliação */}
            {curso.avaliacao && (() => {
              const st = progresso?.statusAvaliacao
              const tentativasUsadas = progresso?.tentativasRealizadas ?? 0
              const tentativasMax = curso.avaliacao!.tentativasPermitidas ?? 3
              const podeRefazer = percentual === 100 && !st && tentativasUsadas < tentativasMax
              const podeRetry = percentual === 100 && st === 'reprovado' && tentativasUsadas < tentativasMax
              const canOpen = podeRefazer || podeRetry

              return (
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium',
                    canOpen ? 'text-primary cursor-pointer hover:bg-primary/10' : 'text-muted-foreground'
                  )}
                  onClick={() => { if (canOpen) openConfirmAvaliacao() }}
                >
                  <Award className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Avaliação Final</span>
                  {percentual < 100 && <span className="ml-auto text-[10px]">Bloqueado</span>}
                  {percentual === 100 && st === 'aprovado' && <CheckCircle2 className="ml-auto w-3 h-3 text-green-500" />}
                  {percentual === 100 && st === 'pendente' && <span className="ml-auto text-[10px] text-yellow-600">Revisão</span>}
                  {percentual === 100 && tentativasUsadas >= tentativasMax && !st && <span className="ml-auto text-[10px] text-destructive">Esgotado</span>}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-y-auto">
          {respostasMode ? (
            <div className="p-6 max-w-3xl mx-auto">
              <CursoRespostasPanel cursoId={cursoId} />
            </div>
          ) : driveMode ? (
            <div className="p-6 max-w-6xl mx-auto">
              <div className="mb-5">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <CloudIcon className="h-5 w-5 text-primary" />
                  Arquivos do Google Drive
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sincronize uma pasta do Google Drive para disponibilizar materiais como vídeos, PDFs, planilhas e apresentações.
                </p>
              </div>
              <DriveSyncPanel courseId={cursoId} />
            </div>
          ) : selectedDriveFile ? (
            <div className="p-6 max-w-6xl mx-auto">
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = DRIVE_CATEGORY_ICONS[selectedDriveFile.category] ?? File
                    const colorClass = DRIVE_CATEGORY_COLORS[selectedDriveFile.category] ?? DRIVE_CATEGORY_COLORS.other
                    return (
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                    )
                  })()}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{selectedDriveFile.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {DRIVE_CATEGORY_LABELS[selectedDriveFile.category] ?? 'Arquivo'}
                      {selectedDriveFile.size ? ` · ${formatBytes(selectedDriveFile.size)}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedDriveFile.web_view_link, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no Drive
                  </Button>
                </div>
              </div>

              {/* Player/Viewer for Drive File — served via backend proxy (no Google cookie needed) */}
              {['video', 'pdf', 'image', 'sheet', 'doc', 'slide'].includes(selectedDriveFile.category) && (
                <DriveFileViewer file={selectedDriveFile} />
              )}

              {/* Botão concluir material */}
              <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className={cn('w-4 h-4', completedDriveFiles.has(selectedDriveFile.drive_id) ? 'text-success' : 'text-muted-foreground')} />
                  {completedDriveFiles.has(selectedDriveFile.drive_id) ? 'Material concluído' : 'Marque como concluído ao terminar'}
                </div>
                <Button
                  onClick={() => toggleDriveFile(selectedDriveFile.drive_id)}
                  variant={completedDriveFiles.has(selectedDriveFile.drive_id) ? 'outline' : 'default'}
                  className="gap-2"
                >
                  {completedDriveFiles.has(selectedDriveFile.drive_id) ? (
                    <><CheckCircle2 className="w-4 h-4" /> Concluído</>
                  ) : (
                    <><Circle className="w-4 h-4" /> Marcar como Concluído</>
                  )}
                </Button>
              </div>

              {!['video', 'pdf', 'image', 'sheet', 'doc', 'slide'].includes(selectedDriveFile.category) && (
                <div className="flex items-center justify-center h-64 rounded-xl bg-muted/40 border border-dashed border-border">
                  <div className="text-center">
                    <File className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Visualização não disponível</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Este tipo de arquivo não pode ser visualizado no navegador</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(selectedDriveFile.web_view_link, '_blank')}
                    >
                      Abrir no Google Drive
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : selectedLesson ? (
            <div className="p-6 max-w-6xl mx-auto">
              <Tabs defaultValue="conteudo">
                <TabsList className="mb-4">
                  <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                  <TabsTrigger value="discussao">
                    Discussão
                    {discussions.length > 0 && (
                      <span className="ml-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {discussions.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="conteudo" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{selectedLesson.titulo}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{selectedLesson.descricao}</p>
                  </div>

                  {/* Renderização do conteúdo */}
                  {selectedLesson.tipo === 'video' && (
                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={selectedLesson.conteudo}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {selectedLesson.tipo === 'pdf' && (
                    <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                      <iframe
                        src={selectedLesson.conteudo}
                        className="w-full h-[600px]"
                        title={selectedLesson.titulo}
                      />
                    </div>
                  )}
                  {selectedLesson.tipo === 'imagem' && (
                    <div className="rounded-xl overflow-hidden border border-border bg-muted/20 p-4">
                      <img
                        src={selectedLesson.conteudo}
                        alt={selectedLesson.titulo}
                        className="w-full h-auto max-h-[600px] object-contain mx-auto"
                      />
                    </div>
                  )}
                  {selectedLesson.tipo === 'texto' && (
                    <div className="prose prose-sm max-w-none bg-muted/20 rounded-xl p-6 text-sm leading-relaxed text-foreground">
                      {selectedLesson.conteudo}
                    </div>
                  )}
                  {selectedLesson.tipo === 'drive' && (
                    selectedLesson.conteudo
                      ? <DriveProxyViewer conteudo={selectedLesson.conteudo} titulo={selectedLesson.titulo} />
                      : (
                        <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-border text-sm text-muted-foreground gap-2">
                          <CloudIcon className="w-4 h-4" />
                          Nenhum link do Drive informado para esta aula.
                        </div>
                      )
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {selectedLesson.duracao} minutos
                    </div>
                    <Button
                      onClick={() => toggleLesson(selectedLesson.id)}
                      variant={completedLessons.has(selectedLesson.id) ? 'outline' : 'default'}
                      className="gap-2"
                    >
                      {completedLessons.has(selectedLesson.id) ? (
                        <><CheckCircle2 className="w-4 h-4" /> Concluída</>
                      ) : (
                        <><Circle className="w-4 h-4" /> Marcar como Concluída</>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="discussao" className="space-y-4">
                  {discussions.map(d => (
                    <Card key={d.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {d.autorNome.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{d.autorNome}</p>
                              <span className="text-xs text-muted-foreground">{formatDateTime(d.criadaEm)}</span>
                            </div>
                            <p className="text-sm mt-1 leading-relaxed">{d.mensagem}</p>
                            {d.respostas.map(r => (
                              <div key={r.id} className="mt-3 ml-4 pl-4 border-l-2 border-primary/20">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-medium">{r.autorNome}</p>
                                  <span className="text-[10px] text-muted-foreground">{formatDateTime(r.criadaEm)}</span>
                                </div>
                                <p className="text-sm mt-0.5 leading-relaxed">{r.mensagem}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Faça uma pergunta ou contribuição..."
                      value={discussao}
                      onChange={e => setDiscussao(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                  <Button onClick={submitDiscussao} disabled={!discussao.trim()} className="gap-2">
                    <MessageSquare className="w-4 h-4" /> Enviar Comentário
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Selecione uma aula ou material para começar</p>
                {curso.driveFiles && curso.driveFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {curso.driveFiles.length} material(is) disponível(is) na seção Materiais
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Avaliação em tela cheia ──────────────────────────────────────────── */}
      {avaliando && curso.avaliacao && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header da avaliação */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 text-primary">
              <Award className="w-5 h-5" />
              <h2 className="font-bold text-base">{curso.avaliacao.titulo}</h2>
            </div>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              Nota mínima: <strong>{curso.avaliacao.notaMinimaAprovacao}</strong> de 10
              &nbsp;·&nbsp;
              {curso.avaliacao.tentativasPermitidas} tentativa(s) permitida(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowConfirmAbandonar(true)}
            >
              <X className="w-4 h-4" />
              Sair (conta como tentativa)
            </Button>
          </div>

          {/* Alerta fixo */}
          <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Atenção:</strong> Não saia desta tela sem finalizar. Se fechar ou navegar para outra página, a tentativa será registrada com nota 0.
            </p>
          </div>

          {/* Questões */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="space-y-6">
                {curso.avaliacao.questoes.map((q, qi) => (
                  <Card key={q.id}>
                    <CardContent className="pt-5">
                      <p className="text-sm font-semibold mb-3">
                        {qi + 1}. {q.texto}
                        <span className="text-xs text-muted-foreground ml-2 font-normal">({q.peso} pts)</span>
                      </p>
                      {q.tipo === 'multipla_escolha' && q.opcoes && (
                        <div className="space-y-2">
                          {q.opcoes.map(op => {
                            const sel = (selectedOptions[q.id] ?? []).includes(op.id)
                            return (
                              <label key={op.id} className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm',
                                sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                              )}>
                                <input
                                  type="checkbox"
                                  checked={sel}
                                  onChange={() => {
                                    setSelectedOptions(prev => {
                                      const arr = prev[q.id] ?? []
                                      const next = sel ? arr.filter(x => x !== op.id) : [...arr, op.id]
                                      return { ...prev, [q.id]: next }
                                    })
                                  }}
                                  className="accent-primary"
                                />
                                {op.texto}
                              </label>
                            )
                          })}
                        </div>
                      )}
                      {q.tipo === 'aberta' && (
                        <Textarea
                          placeholder="Digite sua resposta aqui..."
                          value={respostas[q.id] ?? ''}
                          onChange={e => setRespostas(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="min-h-[100px] text-sm"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 pb-8">
                <Button
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowConfirmAbandonar(true)}
                >
                  <X className="w-4 h-4" /> Abandonar
                </Button>
                <Button onClick={handleSubmitAvaliacao} disabled={submitting} className="flex-1">
                  {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação para ABANDONAR avaliação ───────────────────── */}
      <Dialog open={showConfirmAbandonar} onOpenChange={setShowConfirmAbandonar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Tem certeza que deseja abandonar?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">Atenção: esta ação não pode ser desfeita.</p>
              <ul className="text-sm text-destructive/80 space-y-1.5 list-disc list-inside">
                <li>Suas respostas serão <strong>descartadas</strong>.</li>
                <li>A tentativa será registrada com <strong>nota 0</strong>.</li>
                <li>Isso contará para o limite de tentativas permitidas.</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfirmAbandonar(false)}>
              Continuar avaliação
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { setShowConfirmAbandonar(false); handleExitAvaliacao() }}
            >
              Abandonar mesmo assim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de confirmação para iniciar avaliação ─────────────────────── */}
      <Dialog open={showConfirmAvaliacao} onOpenChange={setShowConfirmAvaliacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Antes de começar a avaliação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Leia com atenção:</p>
              <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5 list-disc list-inside">
                <li>Você <strong>não poderá sair</strong> da avaliação sem finalizá-la.</li>
                <li>Se fechar a página, navegar para outro local ou clicar em <em>Abandonar</em>, a tentativa será registrada com <strong>nota 0</strong>.</li>
                <li>Responda todas as questões com calma antes de enviar.</li>
              </ul>
            </div>
            {curso?.avaliacao && (
              <p className="text-sm text-muted-foreground">
                Nota mínima para aprovação: <strong>{curso.avaliacao.notaMinimaAprovacao}</strong> de 10 &nbsp;·&nbsp;
                Tentativas permitidas: <strong>{curso.avaliacao.tentativasPermitidas}</strong>
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfirmAvaliacao(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={startAvaliacao}>
              Entendi, iniciar avaliação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Viewer Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-7xl w-[95vw] h-[92vh] p-0">
          <DialogHeader className="px-6 py-3 border-b border-border">
            <DialogTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {viewingFile && (
                  <>
                    {(() => {
                      const Icon = DRIVE_CATEGORY_ICONS[viewingFile.category] ?? File
                      const colorClass = DRIVE_CATEGORY_COLORS[viewingFile.category] ?? DRIVE_CATEGORY_COLORS.other
                      return (
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                      )
                    })()}
                    <span className="truncate">{viewingFile.name}</span>
                  </>
                )}
              </div>
              {viewingFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(viewingFile.web_view_link, '_blank')}
                  className="gap-2 flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir no Drive
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-black">
            {viewingFile && (
              <>
                {viewingFile.category === 'video' && viewingFile.embed_url && (
                  <iframe
                    src={viewingFile.embed_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {viewingFile.category === 'pdf' && (
                  <iframe
                    src={viewingFile.embed_url || `https://drive.google.com/file/d/${viewingFile.id}/preview`}
                    className="w-full h-full bg-white"
                  />
                )}
                {viewingFile.category === 'image' && (
                  <div className="w-full h-full flex items-center justify-center bg-muted/20 p-6">
                    <img
                      src={`https://drive.google.com/thumbnail?id=${viewingFile.id}&sz=w2000`}
                      alt={viewingFile.name}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      onError={(e) => {
                        // Fallback para link de visualização
                        e.currentTarget.src = viewingFile.web_view_link
                      }}
                    />
                  </div>
                )}
                {viewingFile.category === 'sheet' && (
                  <iframe
                    src={viewingFile.embed_url || `https://docs.google.com/spreadsheets/d/${viewingFile.id}/preview`}
                    className="w-full h-full bg-white"
                  />
                )}
                {viewingFile.category === 'doc' && (
                  <iframe
                    src={viewingFile.embed_url || `https://docs.google.com/document/d/${viewingFile.id}/preview`}
                    className="w-full h-full bg-white"
                  />
                )}
                {viewingFile.category === 'slide' && (
                  <iframe
                    src={viewingFile.embed_url || `https://docs.google.com/presentation/d/${viewingFile.id}/preview`}
                    className="w-full h-full bg-white"
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
