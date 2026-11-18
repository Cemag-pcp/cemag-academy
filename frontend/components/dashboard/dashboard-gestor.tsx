'use client'

import { CheckCircle2, AlertTriangle, Users, ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useDashboardGestor } from '@/lib/use-dashboard'

export function DashboardGestor() {
  const router = useRouter()
  const { data, loading } = useDashboardGestor()

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalEquipe}</p>
                <p className="text-xs text-muted-foreground">Membros na equipe</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.conclusoesEquipe}</p>
                <p className="text-xs text-muted-foreground">Conclusões na equipe</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-warning-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning-foreground">{data.avaliacoesPendentes}</p>
                <p className="text-xs text-muted-foreground">Avaliações para revisar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.prazosVencendo}</p>
                <p className="text-xs text-muted-foreground">Prazos vencendo em 7 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progresso da equipe */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Progresso da Equipe</CardTitle>
              <CardDescription>Acompanhamento individual de treinamentos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.progressoEquipe.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum colaborador encontrado no seu departamento.</p>
          ) : (
            <div className="space-y-4">
              {data.progressoEquipe.map(membro => (
                <div key={membro.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                    {membro.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{membro.nome}</p>
                      <Badge variant={membro.status === 'ativo' ? 'outline' : 'secondary'} className="text-[10px] px-1.5">
                        {membro.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{membro.cargo}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={membro.media} className="flex-1 h-1.5" />
                      <span className="text-xs font-medium w-8 text-right">{membro.media}%</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-primary">{membro.concluidos}/{membro.totalCursos}</p>
                    <p className="text-[10px] text-muted-foreground">concluídos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avaliações pendentes */}
      {data.avaliacoesPendentesDetalhe.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Avaliações Aguardando Revisão</CardTitle>
                <CardDescription>Respostas abertas que precisam de sua avaliação</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => router.push('/avaliacoes')}>
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.avaliacoesPendentesDetalhe.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-warning/20 text-warning-foreground flex items-center justify-center text-sm font-semibold">
                      {p.colaborador.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.colaborador}</p>
                      <p className="text-xs text-muted-foreground">{p.curso}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-warning/20 text-warning-foreground border-warning/30 text-[10px]">
                      Pendente
                    </Badge>
                    <Button size="sm" className="h-7 text-xs" onClick={() => router.push('/avaliacoes')}>
                      Avaliar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
