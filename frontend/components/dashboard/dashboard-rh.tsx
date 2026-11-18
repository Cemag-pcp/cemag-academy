'use client'

import {
  Users, BookOpen, Award, ClipboardList,
  TrendingUp, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { useDashboardRH } from '@/lib/use-dashboard'

const COLORS = ['#E86A2A', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB']

function StatCard({ icon: Icon, label, value, sub, trend }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string
  trend?: { value: number; label: string }
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-success' : 'text-destructive'}`}>
                <TrendingUp className="w-3 h-3" />
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CardSkeleton() {
  return <Card><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
}

export function DashboardRH() {
  const { data, loading } = useDashboardRH()

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Colaboradores Ativos" value={data.totalColaboradores} sub="em todos os departamentos" trend={{ value: 3, label: 'este mês' }} />
        <StatCard icon={BookOpen} label="Trilhas Ativas" value={data.cursosAtivos} sub={`${data.novosCursosMes} novas este mês`} />
        <StatCard icon={Award} label="Certificados Emitidos" value={data.certificadosEmitidos} sub="total acumulado" trend={{ value: 12, label: 'este mês' }} />
        <StatCard icon={ClipboardList} label="Avaliações Pendentes" value={data.avaliacoesPendentes} sub="aguardando revisão do gestor" />
      </div>

      {/* Segunda linha de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de Conclusão Geral</p>
            <p className="text-3xl font-bold mt-1">{data.taxaConclusaoGeral}%</p>
            <Progress value={data.taxaConclusaoGeral} className="mt-3 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Média de Score</p>
            <p className="text-3xl font-bold mt-1">{data.mediaScore}</p>
            <p className="text-xs text-muted-foreground mt-0.5">pontos nas avaliações</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trilhas Vencidas</p>
            </div>
            <p className="text-3xl font-bold mt-1 text-warning-foreground">{data.cursosVencidos}</p>
            <p className="text-xs text-muted-foreground mt-0.5">colaboradores com prazo vencido</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Engajamento</p>
            </div>
            <p className="text-3xl font-bold mt-1 text-success">Alto</p>
            <p className="text-xs text-muted-foreground mt-0.5">plataforma ativa</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conclusão por departamento */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conclusão por Departamento</CardTitle>
            <CardDescription>Taxa de conclusão de trilhas por área</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.conclusaoPorDepartamento} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="departamento" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`${v}%`, 'Taxa de Conclusão']}
                />
                <Bar dataKey="taxa" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição de cursos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
            <CardDescription>Trilhas por área de conhecimento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.distribuicaoCursos} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="valor" paddingAngle={3}>
                  {data.distribuicaoCursos.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`${v}%`, 'Participação']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {data.distribuicaoCursos.map((item, i) => (
                <div key={item.nome} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-muted-foreground">{item.nome}</span>
                  </div>
                  <span className="font-medium">{item.valor}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progressão mensal + Top cursos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progressão Mensal</CardTitle>
            <CardDescription>Trilhas iniciadas vs. concluídas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.progressoMensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="iniciados" stroke="#9CA3AF" strokeWidth={2} dot={false} name="Iniciados" />
                <Line type="monotone" dataKey="concluidos" stroke="var(--color-primary)" strokeWidth={2} dot={false} name="Concluídos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Cursos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Trilhas</CardTitle>
            <CardDescription>Por taxa de conclusão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.topCursos.map((c) => (
              <div key={c.titulo}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium truncate flex-1">{c.titulo}</p>
                  <span className="text-xs font-bold ml-2 text-primary">{c.taxa}%</span>
                </div>
                <Progress value={c.taxa} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.inscritos} inscritos</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Colaboradores com prazo crítico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Colaboradores com Prazo Crítico</CardTitle>
          <CardDescription>Treinamentos obrigatórios vencendo em 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {data.colaboradoresCriticos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum prazo crítico nos próximos 30 dias.</p>
          ) : (
            <div className="space-y-3">
              {data.colaboradoresCriticos.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/20 text-warning-foreground flex-shrink-0 font-semibold text-sm">
                    {item.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.curso}</p>
                  </div>
                  <div className="hidden md:block text-right">
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{item.departamento}</Badge>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-warning-foreground">
                      <Clock className="w-3 h-3" />
                      {item.prazo}
                    </div>
                    <div className="mt-1 w-20">
                      <Progress value={item.progresso} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{item.progresso}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
