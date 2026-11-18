'use client'

import { BookOpen, Award, Clock, TrendingUp, Play, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useDashboardColaborador } from '@/lib/use-dashboard'

export function DashboardColaborador() {
  const { user } = useAuth()
  const router = useRouter()
  const { data, loading } = useDashboardColaborador()

  if (!user) return null

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const proximoPrazo = data.cursos
    .filter(c => c.prazo && c.status !== 'concluido')
    .sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())[0]

  const statusColor: Record<string, string> = {
    nao_iniciado: 'bg-muted text-muted-foreground',
    em_andamento: 'bg-primary/10 text-primary border-primary/20',
    concluido: 'bg-success/10 text-success border-success/20',
    reprovado: 'bg-destructive/10 text-destructive border-destructive/20',
  }
  const statusLabel: Record<string, string> = {
    nao_iniciado: 'Não iniciado',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    reprovado: 'Reprovado',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Boas-vindas */}
      <div className="rounded-2xl bg-sidebar p-6 flex items-center justify-between overflow-hidden relative">
        <div>
          <p className="text-sidebar-foreground/70 text-sm">Bem-vindo de volta,</p>
          <h2 className="text-xl font-bold text-sidebar-foreground mt-0.5">{user.nome.split(' ')[0]} {user.nome.split(' ')[1]}</h2>
          <p className="text-sidebar-foreground/60 text-sm mt-1">{user.cargo} · {user.departamento}</p>
          {proximoPrazo && (
            <div className="flex items-center gap-2 mt-3 bg-warning/20 text-warning-foreground text-xs px-3 py-1.5 rounded-full w-fit">
              <AlertCircle className="w-3 h-3" />
              Prazo se aproximando: {proximoPrazo.titulo}
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 text-primary text-3xl font-bold">
          {user.nome.split(' ').map(n => n[0]).join('').slice(0,2)}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalAtribuidos}</p>
                <p className="text-xs text-muted-foreground">Trilhas atribuídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalConcluidos}</p>
                <p className="text-xs text-muted-foreground">Trilhas concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalCertificados}</p>
                <p className="text-xs text-muted-foreground">Certificados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalHoras}h</p>
                <p className="text-xs text-muted-foreground">Horas de treinamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meus cursos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Meus Treinamentos</CardTitle>
              <CardDescription>Acompanhe seu progresso em cada trilha</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/cursos')}>
              Ver todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.cursos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma trilha atribuída ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.cursos.map(curso => {
                const status = curso.status
                const percentual = curso.percentual
                return (
                  <div key={curso.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/3 transition-all group cursor-pointer"
                    onClick={() => router.push(`/cursos/${curso.id}`)}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{curso.titulo}</p>
                        {curso.obrigatorio && (
                          <Badge variant="outline" className="text-[9px] px-1.5 border-destructive/30 text-destructive flex-shrink-0">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={percentual} className="flex-1 h-1.5" />
                        <span className="text-xs font-medium text-muted-foreground w-8 text-right">{percentual}%</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">{curso.cargaHoraria}h</span>
                        {curso.prazo && (
                          <span className="text-[10px] text-muted-foreground">Prazo: {new Date(curso.prazo).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`text-[10px] border ${statusColor[status]}`}>{statusLabel[status]}</Badge>
                      {status !== 'concluido' && (
                        <Button size="sm" className="h-7 w-7 p-0" variant="ghost">
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificados recentes */}
      {data.certificados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Meus Certificados</CardTitle>
                <CardDescription>Certificados obtidos na plataforma</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/certificados')}>
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.certificados.map(cert => (
                <div key={cert.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cert.cursoTitulo}</p>
                    <p className="text-xs text-muted-foreground">{cert.dataConclusao} · {cert.cargaHoraria}h</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0" onClick={() => router.push('/certificados')}>
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
