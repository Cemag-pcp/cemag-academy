'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, MessageSquare, Clock, Users, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAvaliacoes, type AvaliacaoItem } from '@/lib/use-avaliacoes'

const statusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning-foreground border-warning/20' },
  aprovado: { label: 'Aprovado', color: 'bg-success/10 text-success border-success/20' },
  reprovado: { label: 'Reprovado', color: 'bg-destructive/10 text-destructive border-destructive/20' },
}

interface Props {
  cursoId: string
}

export function CursoRespostasPanel({ cursoId }: Props) {
  const { avaliacoes, loading, reviewAvaliacao, reload } = useAvaliacoes()
  const [selected, setSelected] = useState<AvaliacaoItem | null>(null)
  const [nota, setNota] = useState('0')
  const [feedback, setFeedback] = useState('')
  const [processing, setProcessing] = useState(false)

  // Filter to only this course
  const items = avaliacoes.filter(a => a.cursoId === cursoId)

  const pendentes = items.filter(a => !a.statusAvaliacao || a.statusAvaliacao === 'pendente').length
  const aprovados = items.filter(a => a.statusAvaliacao === 'aprovado').length
  const reprovados = items.filter(a => a.statusAvaliacao === 'reprovado').length

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

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Cabeçalho do painel */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Respostas da Avaliação</h3>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {pendentes > 0 && (
            <Badge className="text-[11px] border bg-warning/10 text-warning-foreground border-warning/20">
              {pendentes} pendente{pendentes > 1 ? 's' : ''}
            </Badge>
          )}
          {aprovados > 0 && (
            <Badge className="text-[11px] border bg-success/10 text-success border-success/20">
              {aprovados} aprovado{aprovados > 1 ? 's' : ''}
            </Badge>
          )}
          {reprovados > 0 && (
            <Badge className="text-[11px] border bg-destructive/10 text-destructive border-destructive/20">
              {reprovados} reprovado{reprovados > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">Nenhuma resposta ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Quando alunos responderem a avaliação com questões abertas, aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(av => {
            const st = av.statusAvaliacao ?? 'pendente'
            const cfg = statusConfig[st] ?? statusConfig.pendente
            const isPendente = !av.statusAvaliacao || av.statusAvaliacao === 'pendente'

            return (
              <Card key={av.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {av.colaboradorNome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{av.colaboradorNome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`text-[10px] border ${cfg.color}`}>{cfg.label}</Badge>
                          {av.notaAvaliacao != null && (
                            <span className="text-xs text-muted-foreground">
                              Nota: <span className="font-medium text-foreground">{av.notaAvaliacao}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {av.respostasComTexto.length} resp. aberta(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isPendente ? 'default' : 'outline'}
                      className="flex-shrink-0 gap-1.5 h-8 text-xs"
                      onClick={() => {
                        setSelected(av)
                        setNota(String(av.notaAvaliacao ?? 0))
                        setFeedback(av.feedbackGestor)
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isPendente ? 'Avaliar' : 'Ver detalhes'}
                    </Button>
                  </div>

                  {/* Preview da primeira resposta */}
                  {av.respostasComTexto[0] && (
                    <div className="mt-2.5 pl-11 border-l-2 border-muted ml-0">
                      <p className="text-[11px] font-medium text-muted-foreground mb-0.5 truncate">
                        {av.respostasComTexto[0].questaoTexto}
                      </p>
                      <p className="text-xs text-foreground line-clamp-1">{av.respostasComTexto[0].resposta}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de avaliação */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliar Resposta</DialogTitle>
            <DialogDescription>{selected?.colaboradorNome}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {selected?.respostasComTexto.map((r, i) => (
              <div key={r.questaoId} className="space-y-2">
                <p className="text-sm font-semibold">{i + 1}. {r.questaoTexto}</p>
                <div className="bg-muted/40 rounded-lg p-4 text-sm leading-relaxed">{r.resposta}</div>
              </div>
            ))}

            {(!selected?.statusAvaliacao || selected?.statusAvaliacao === 'pendente') && (
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

            {selected?.feedbackGestor && selected.statusAvaliacao !== 'pendente' && (
              <div className="p-3 rounded-lg bg-muted/40 text-xs">
                <span className="font-medium text-muted-foreground">Feedback registrado: </span>
                {selected.feedbackGestor}
              </div>
            )}
          </div>

          {(!selected?.statusAvaliacao || selected?.statusAvaliacao === 'pendente') && (
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
    </>
  )
}
