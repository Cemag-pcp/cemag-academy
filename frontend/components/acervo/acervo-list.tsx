'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  FileText, Search,
  Loader2, FolderOpen, X, CheckCircle2, AlertCircle, BookOpen, Check, Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth-context'
import { useAcervo, mapDoc, type ResumoAcervo } from '@/lib/use-acervo'
import { useInfiniteList } from '@/lib/use-infinite-list'
import { SincronizacaoISO } from './sincronizacao-iso'
import { useDebouncedValue } from '@/lib/use-paginated-list'
import type { Documento } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TODOS = 'todos'
type FiltroLeitura = 'todos' | 'nao_lidos' | 'lidos'
type Ordem = 'recentes' | 'antigos' | 'titulo'
const ORDENACAO: Record<Ordem, string> = { recentes: '-criado_em', antigos: 'criado_em', titulo: 'titulo' }


// ─── MIME helpers ────────────────────────────────────────────────────────────

function mimeLabel(mime: string) {
  if (!mime) return 'Arquivo'
  if (mime.includes('pdf'))          return 'PDF'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'Planilha'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'Apresentação'
  if (mime.includes('document') || mime.includes('word')) return 'Documento'
  if (mime.includes('video'))        return 'Vídeo'
  if (mime.includes('image'))        return 'Imagem'
  return 'Arquivo'
}

function mimeColor(mime: string) {
  if (!mime) return 'bg-muted text-muted-foreground'
  if (mime.includes('pdf'))          return 'bg-red-500/15 text-red-400'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'bg-emerald-500/15 text-emerald-400'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'bg-orange-500/15 text-orange-400'
  if (mime.includes('document') || mime.includes('word')) return 'bg-blue-500/15 text-blue-400'
  if (mime.includes('video'))        return 'bg-purple-500/15 text-purple-400'
  if (mime.includes('image'))        return 'bg-pink-500/15 text-pink-400'
  return 'bg-muted text-muted-foreground'
}

// ─── Modal de leitura ─────────────────────────────────────────────────────────

interface ReaderModalProps {
  doc: Documento
  onClose: () => void
}

function ReaderModal({ doc, onClose }: ReaderModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(true)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    let objectUrl = ''
    async function load() {
      setLoadingFile(true)
      setFileError('')
      try {
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
        const { tokenStorage } = await import('@/lib/api')
        const token = tokenStorage.getAccess()
        const res = await fetch(`${base}/acervo/${doc.id}/proxy/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Erro ${res.status}`)
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      } catch (e: any) {
        setFileError(e.message ?? 'Não foi possível carregar o arquivo.')
      } finally {
        setLoadingFile(false)
      }
    }
    load()
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [doc.id])

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="!max-w-[100vw] !w-screen !h-screen flex flex-col p-0 gap-0 !rounded-none">
        <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <DialogTitle className="text-sm font-medium truncate">{doc.titulo}</DialogTitle>
            <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${mimeColor(doc.driveMimeType)}`}>
              {mimeLabel(doc.driveMimeType)}
            </span>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {loadingFile ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Carregando arquivo...</p>
            </div>
          ) : fileError ? (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm">{fileError}</p>
            </div>
          ) : (
            <iframe
              src={blobUrl!}
              className="w-full h-full border-0"
              title={doc.titulo}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de documento ────────────────────────────────────────────────────────

interface DocCardProps {
  doc: Documento
  isRH: boolean
  onRead: (doc: Documento) => void
  onToggleVisto: (doc: Documento) => void
  onFrequencia: (doc: Documento) => void
}

function DocCard({ doc, isRH, onRead, onToggleVisto, onFrequencia }: DocCardProps) {
  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border bg-card hover:border-primary/30 transition-colors ${doc.isVisto ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug line-clamp-2">{doc.titulo}</p>
          {doc.driveNome && (
            <p className="text-xs text-muted-foreground truncate">{doc.driveNome}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mimeColor(doc.driveMimeType)}`}>
            {mimeLabel(doc.driveMimeType)}
          </span>
          {doc.isVisto && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Lido
            </span>
          )}
        </div>
      </div>

      {doc.descricao && (
        <p className="text-xs text-muted-foreground line-clamp-2">{doc.descricao}</p>
      )}

      <div className="flex items-center gap-1">
        {doc.cargos.length === 0 ? (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground border-dashed">
            Todos os setores
          </Badge>
        ) : (
          <>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 truncate max-w-[160px]">
              {doc.cargos[0].nome}
            </Badge>
            {doc.cargos.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 cursor-default shrink-0">
                    +{doc.cargos.length - 1}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  <p className="font-medium mb-1">Cargos com acesso:</p>
                  <ul className="space-y-0.5">
                    {doc.cargos.map(c => (
                      <li key={c.id}>• {c.nome}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => onRead(doc)}>
          <BookOpen className="w-3.5 h-3.5" />
          Ler
        </Button>
        <Button
          variant={doc.isVisto ? 'default' : 'outline'}
          size="sm"
          className={`px-2.5 gap-1 text-xs ${doc.isVisto ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : ''}`}
          onClick={() => onToggleVisto(doc)}
          title={doc.isVisto ? 'Marcar como não lido' : 'Marcar como lido'}
        >
          <Check className="w-3.5 h-3.5" />
        </Button>
        {isRH && (
          <Button variant="ghost" size="sm" onClick={() => onFrequencia(doc)} className="px-2 text-muted-foreground hover:text-foreground" title="Baixar lista de frequência">
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AcervoList() {
  const { user } = useAuth()
  const { fetchResumo, marcarVisto } = useAcervo()

  const [search,     setSearch]     = useState('')
  const [readDoc,    setReadDoc]    = useState<Documento | null>(null)

  const isRH = user?.role === 'rh'
  const canManage = user?.role === 'rh' || user?.role === 'gestor'

  // ── Filtros (aplicados no servidor) ──
  const [leitura, setLeitura] = useState<FiltroLeitura>('todos')
  const [tipo,    setTipo]    = useState(TODOS)
  const [setor,   setSetor]   = useState(TODOS)
  const [cargo,   setCargo]   = useState(TODOS)
  const [ordem,   setOrdem]   = useState<Ordem>('recentes')
  const busca = useDebouncedValue(search.trim())

  // Totais e opções dos filtros (só o que o usuário pode ver)
  const [resumo, setResumo] = useState<ResumoAcervo | null>(null)
  const carregarResumo = useCallback(() => {
    fetchResumo().then(setResumo).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { carregarResumo() }, [carregarResumo])

  // Rolagem infinita: 12 documentos por vez
  const {
    items: documentos, setItems: setDocumentos, count, loading, loadingMore, hasMore, reset, sentinelRef,
  } = useInfiniteList<Documento>('/acervo/', {
    search: busca,
    leitura: leitura === 'todos' ? undefined : leitura,
    tipo: tipo === TODOS ? undefined : tipo,
    setor: setor === TODOS ? undefined : setor,
    cargo: cargo === TODOS ? undefined : cargo,
    ordering: ORDENACAO[ordem],
  }, { pageSize: 12, map: mapDoc })

  // Sincronização em segundo plano (disparada ao abrir a tela): acompanha a cada
  // 10 s e, quando termina, recarrega a lista com o que veio das planilhas
  const sincronizando = !!resumo?.sincronizacao?.em_andamento
  const estavaSincronizando = useRef(false)
  useEffect(() => {
    if (sincronizando) {
      estavaSincronizando.current = true
      const t = setInterval(carregarResumo, 10000)
      return () => clearInterval(t)
    }
    if (estavaSincronizando.current) {
      estavaSincronizando.current = false
      reset()
    }
  }, [sincronizando, carregarResumo, reset])

  const naoLidos = resumo?.nao_lidos ?? 0
  const total = resumo?.total ?? 0

  const setoresDoCargo = useMemo(
    () => new Map((resumo?.cargos ?? []).map(c => [c.id, c.setores])),
    [resumo],
  )
  const tipoOptions = resumo?.tipos ?? []
  const setorOptions = (resumo?.setores ?? []).map(s => ({ value: s, label: s }))
  const cargoOptions = (resumo?.cargos ?? [])
    .filter(c => setor === TODOS || c.setores.includes(setor))
    .map(c => ({ value: c.id, label: c.nome }))

  const filtrosAtivos =
    (search ? 1 : 0) + (leitura !== 'todos' ? 1 : 0) + (tipo !== TODOS ? 1 : 0) +
    (setor !== TODOS ? 1 : 0) + (cargo !== TODOS ? 1 : 0)

  function limparFiltros() {
    setSearch(''); setLeitura('todos'); setTipo(TODOS); setSetor(TODOS); setCargo(TODOS)
  }

  function alterarSetor(v: string) {
    setSetor(v)
    // cargo escolhido que não pertence ao novo setor deixa de valer
    if (v !== TODOS && cargo !== TODOS && !(setoresDoCargo.get(cargo) ?? []).includes(v)) setCargo(TODOS)
  }

  async function handleToggleVisto(doc: Documento) {
    const visto = await marcarVisto(doc.id)
    setDocumentos(prev => prev.map(d => (d.id === doc.id ? { ...d, isVisto: visto } : d)))
    carregarResumo()
  }

  async function handleFrequencia(doc: Documento) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    const { tokenStorage } = await import('@/lib/api')
    const token = tokenStorage.getAccess()
    const res = await fetch(`${base}/acervo/${doc.id}/frequencia-pdf/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `frequencia_${doc.titulo}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Big number — pendentes de leitura */}
          {naoLidos > 0 && (
            <button
              type="button"
              onClick={() => setLeitura(leitura === 'nao_lidos' ? 'todos' : 'nao_lidos')}
              title={leitura === 'nao_lidos' ? 'Mostrar todos' : 'Mostrar só os não lidos'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 transition-colors hover:bg-amber-500/20',
                leitura === 'nao_lidos' && 'ring-2 ring-amber-400/60',
              )}
            >
              <span className="text-2xl font-bold text-amber-400 leading-none">{naoLidos}</span>
              <span className="text-xs text-amber-400/80 leading-tight max-w-[72px] text-left">
                {naoLidos === 1 ? 'documento\npara ler' : 'documentos\npara ler'}
              </span>
            </button>
          )}
          {naoLidos === 0 && total > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Tudo lido!</span>
            </div>
          )}
          <SincronizacaoISO
            status={resumo?.sincronizacao}
            isRH={isRH}
            onSincronizado={() => { reset(); carregarResumo() }}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border bg-card p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição ou arquivo..."
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={leitura} onValueChange={v => setLeitura(v as FiltroLeitura)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="nao_lidos">Não lidos</SelectItem>
              <SelectItem value="lidos">Lidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os tipos</SelectItem>
              {tipoOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          {canManage && (
            <>
              <SearchableSelect
                className="w-48"
                value={setor}
                onValueChange={alterarSetor}
                options={[{ value: TODOS, label: 'Todos os setores' }, ...setorOptions]}
                placeholder="Setor"
                searchPlaceholder="Buscar setor..."
                emptyText="Nenhum setor encontrado."
              />
              <SearchableSelect
                className="w-56"
                value={cargo}
                onValueChange={setCargo}
                options={[{ value: TODOS, label: setor === TODOS ? 'Todos os cargos' : 'Todos os cargos do setor' }, ...cargoOptions]}
                placeholder="Cargo"
                searchPlaceholder="Buscar cargo..."
                emptyText="Nenhum cargo encontrado."
              />
            </>
          )}

          <Select value={ordem} onValueChange={v => setOrdem(v as Ordem)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="antigos">Mais antigos</SelectItem>
              <SelectItem value="titulo">Título (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {loading
              ? 'Carregando...'
              : filtrosAtivos > 0
                ? `${count} de ${total} documento(s)`
                : `${total} documento(s)`}
          </span>
          {filtrosAtivos > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={limparFiltros}>
              <X className="w-3.5 h-3.5" />
              Limpar filtros ({filtrosAtivos})
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : documentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Nenhum documento encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filtrosAtivos > 0 ? 'Tente ajustar ou limpar os filtros.' : 'Nenhum documento disponível para o seu cargo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documentos.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              isRH={isRH}
              onRead={d => setReadDoc(d)}
              onToggleVisto={handleToggleVisto}
              onFrequencia={handleFrequencia}
            />
          ))}
        </div>
      )}

      {/* Rolagem infinita: ao chegar aqui, busca os próximos 12 */}
      {!loading && hasMore && <div ref={sentinelRef} className="h-1" />}
      {loadingMore && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando mais documentos...
        </div>
      )}
      {!loading && !hasMore && documentos.length > 12 && (
        <p className="py-2 text-center text-xs text-muted-foreground">Todos os {count} documentos foram carregados.</p>
      )}

      {/* Modal de leitura */}
      {readDoc && <ReaderModal doc={readDoc} onClose={() => setReadDoc(null)} />}

    </div>
  )
}
