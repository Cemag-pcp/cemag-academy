'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, MessageSquare, Clock, Filter, BookOpen, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { useAvaliacoes, type AvaliacaoItem } from '@/lib/use-avaliacoes'

const statusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning-foreground border-warning/20' },
  aprovado: { label: 'Aprovado', color: 'bg-success/10 text-success border-success/20' },
  reprovado: { label: 'Reprovado', color: 'bg-destructive/10 text-destructive border-destructive/20' },
}

function getStatus(av: AvaliacaoItem) {
  return av.statusAvaliacao ?? 'pendente'
}

function CollaboratorRow({
  av,
  isReviewer,
  onSelect,
}: {
  av: AvaliacaoItem
  isReviewer: boolean
  onSelect: (av: AvaliacaoItem, nota: string, feedback: string) => void
}) {
  const st = getStatus(av)
  const cfg = statusConfig[st] ?? statusConfig.pendente
  const isPendente = !av.statusAvaliacao || av.statusAvaliacao === 'pendente'

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-lg hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
          {av.colaboradorNome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{av.colaboradorNome}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`text-[10px] border ${cfg.color}`}>{cfg.label}</Badge>
            {av.notaAvaliacao != null && (
              <span className="text-xs text-muted-foreground">Nota: <span className="font-medium text-foreground">{av.notaAvaliacao}</span></span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {av.respostasComTexto.length} resp. aberta(s)
            </span>
          </div>
        </div>
      </div>

      {isReviewer && (
        <Button
          size="sm"
          variant={isPendente ? 'default' : 'outline'}
          className="flex-shrink-0 gap-1.5 h-8 text-xs"
          onClick={() => onSelect(av, String(av.notaAvaliacao ?? 0), av.feedbackGestor)}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {isPendente ? 'Avaliar' : 'Ver detalhes'}
        </Button>
      )}
    </div>
  )
}

interface CourseGroup {
  cursoId: string
  cursoTitulo: string
  items: AvaliacaoItem[]
}

function CourseCard({
  group,
  isReviewer,
  onSelect,
}: {
  group: CourseGroup
  isReviewer: boolean
  onSelect: (av: AvaliacaoItem, nota: string, feedback: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const pendentes = group.items.filter(a => !a.statusAvaliacao || a.statusAvaliacao === 'pendente').length
  const aprovados = group.items.filter(a => a.statusAvaliacao === 'aprovado').length
  const reprovados = group.items.filter(a => a.statusAvaliacao === 'reprovado').length

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="py-3 px-4 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{group.cursoTitulo}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {group.items.length} resposta(s)
                </span>
                {pendentes > 0 && (
                  <Badge className="text-[10px] border bg-warning/10 text-warning-foreground border-warning/20">
                    {pendentes} pendente{pendentes > 1 ? 's' : ''}
                  </Badge>
                )}
                {aprovados > 0 && (
                  <Badge className="text-[10px] border bg-success/10 text-success border-success/20">
                    {aprovados} aprovado{aprovados > 1 ? 's' : ''}
                  </Badge>
                )}
                {reprovados > 0 && (
                  <Badge className="text-[10px] border bg-destructive/10 text-destructive border-destructive/20">
                    {reprovados} reprovado{reprovados > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 text-muted-foreground">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-2 pb-2 pt-0">
          <div className="divide-y divide-border/50">
            {group.items.map(av => (
              <CollaboratorRow
                key={av.id}
                av={av}
                isReviewer={isReviewer}
                onSelect={onSelect}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function AvaliacoesList({ abrirId }: { abrirId?: string } = {}) {
  const { user } = useAuth()
  const { avaliacoes, loading, reviewAvaliacao } = useAvaliacoes()
  const [filter, setFilter] = useState('pendente')
  const [selected, setSelected] = useState<AvaliacaoItem | null>(null)
  const [nota, setNota] = useState('0')
  const [feedback, setFeedback] = useState('')
  const [processing, setProcessing] = useState(false)
  const [abertoViaLink, setAbertoViaLink] = useState(false)

  // Link da notificação (/avaliacoes/revisar/<id>): abre direto a avaliação do colaborador
  useEffect(() => {
    if (!abrirId || abertoViaLink || loading) return
    setAbertoViaLink(true)
    const alvo = avaliacoes.find(a => a.id === abrirId)
    if (!alvo) {
      toast.error('Avaliação não encontrada ou sem permissão para revisá-la.')
      return
    }
    const pendente = !alvo.statusAvaliacao || alvo.statusAvaliacao === 'pendente'
    if (!pendente) setFilter('todos')
    setSelected(alvo)
    setNota(String(alvo.notaAvaliacao ?? 0))
    setFeedback(alvo.feedbackGestor ?? '')
  }, [abrirId, abertoViaLink, loading, avaliacoes])

  if (!user) return null

  const isReviewer = user.role === 'rh' || user.role === 'gestor'

  const filtered = avaliacoes.filter(av => {
    if (filter === 'todos') return true
    if (filter === 'pendente') return !av.statusAvaliacao || av.statusAvaliacao === 'pendente'
    return av.statusAvaliacao === filter
  })

  // Group by course
  const courseGroups: CourseGroup[] = Object.values(
    filtered.reduce<Record<string, CourseGroup>>((acc, av) => {
      if (!acc[av.cursoId]) {
        acc[av.cursoId] = { cursoId: av.cursoId, cursoTitulo: av.cursoTitulo, items: [] }
      }
      acc[av.cursoId].items.push(av)
      return acc
    }, {})
  )

  function handleSelect(av: AvaliacaoItem, n: string, f: string) {
    setSelected(av)
    setNota(n)
    setFeedback(f)
  }

  async function handleAction(aprovar: boolean) {
    if (!selected) return
    setProcessing(true)
    try {
      await reviewAvaliacao(selected.id, {
        status: aprovar ? 'aprovado' : 'reprovado',
        nota: Number(nota),
        feedback,
      })
      toast.success(aprovar
        ? `Avaliação aprovada! Nota ${nota} atribuída.`
        : 'Avaliação reprovada. Feedback enviado ao colaborador.'
      )
      setSelected(null)
      setFeedback('')
      setNota('0')
    } catch {
      toast.error('Erro ao salvar avaliação. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  const pendentes = avaliacoes.filter(a => !a.statusAvaliacao || a.statusAvaliacao === 'pendente').length

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-7 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-end">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovadas</SelectItem>
            <SelectItem value="reprovado">Reprovadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {courseGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium">Nenhuma avaliação encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'pendente' ? 'Todas as avaliações foram revisadas.' : 'Ajuste o filtro para ver outras avaliações.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {courseGroups.map(group => (
            <CourseCard
              key={group.cursoId}
              group={group}
              isReviewer={isReviewer}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Modal de avaliação */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliar Resposta</DialogTitle>
            <DialogDescription>
              {selected?.colaboradorNome} · {selected?.cursoTitulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {selected?.respostasComTexto.map((r, i) => (
              <div key={r.questaoId} className="space-y-2">
                <p className="text-sm font-semibold">{i + 1}. {r.questaoTexto}</p>
                <div className="bg-muted/40 rounded-lg p-4 text-sm leading-relaxed">{r.resposta}</div>
              </div>
            ))}

            {isReviewer && (!selected?.statusAvaliacao || selected?.statusAvaliacao === 'pendente') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nota (0–10)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={nota}
                      onChange={e => setNota(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Feedback para o colaborador (opcional)</Label>
                  <Textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Comentários sobre a resposta..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </>
            )}

            {selected?.feedbackGestor && (selected.statusAvaliacao === 'aprovado' || selected.statusAvaliacao === 'reprovado') && (
              <div className="p-3 rounded-lg bg-muted/40 text-xs">
                <span className="font-medium text-muted-foreground">Feedback registrado: </span>
                {selected.feedbackGestor}
              </div>
            )}
          </div>

          {isReviewer && (!selected?.statusAvaliacao || selected?.statusAvaliacao === 'pendente') && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button
                variant="outline"
                onClick={() => handleAction(false)}
                disabled={processing}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Reprovar
              </Button>
              <Button onClick={() => handleAction(true)} disabled={processing}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprovar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
