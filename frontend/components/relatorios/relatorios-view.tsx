'use client'

import { useState, useEffect } from 'react'
import {
  Download, Users,
  Award, CheckCircle2, BookOpen
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { toast } from 'sonner'
import { useRelatorios, type ColaboradorRelatorio, type TrilhaRelatorio } from '@/lib/use-relatorios'
import { usePaginatedList } from '@/lib/use-paginated-list'
import { TablePagination } from '@/components/ui/table-pagination'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const COLORS = ['#E86A2A', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB']

export function RelatoriosView() {
  const [periodo, setPeriodo] = useState('2025')
  const [departamento, setDepartamento] = useState('todos')
  const { dashboard, loading } = useRelatorios()

  // Tabelas paginadas e agregadas no servidor
  const colab = usePaginatedList<ColaboradorRelatorio>(
    '/dashboard/relatorios/colaboradores/',
    { departamento: departamento === 'todos' ? undefined : departamento },
  )
  const trilhas = usePaginatedList<TrilhaRelatorio>('/dashboard/relatorios/trilhas/')

  // Setores para o filtro (lista leve, sem paginação de tela)
  const [departamentos, setDepartamentos] = useState<string[]>([])
  useEffect(() => {
    api.get<any>('/auth/departments/?page_size=500&ordering=nome')
      .then(res => setDepartamentos((res?.results ?? []).map((d: any) => d.nome)))
      .catch(() => setDepartamentos([]))
  }, [])

  function handleExport(tipo: string) {
    toast.success(`Relatório "${tipo}" exportado com sucesso.`)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="pt-5"><Skeleton className="h-56" /></CardContent></Card>
          <Card><CardContent className="pt-5"><Skeleton className="h-56" /></CardContent></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => handleExport('Geral')}>
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Colaboradores', value: dashboard?.totalColaboradores ?? '—', sub: `${departamentos.length} departamentos`, color: 'primary' },
          { icon: BookOpen, label: 'Trilhas Ativas', value: dashboard?.cursosAtivos ?? '—', sub: 'publicadas', color: 'primary' },
          { icon: CheckCircle2, label: 'Taxa de Conclusão', value: `${dashboard?.taxaConclusaoGeral ?? 0}%`, sub: 'média geral', color: 'success' },
          { icon: Award, label: 'Certificados Emitidos', value: dashboard?.certificadosEmitidos ?? '—', sub: 'acumulado', color: 'primary' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{item.label}</p>
                  <p className="text-3xl font-bold mt-1">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  item.color === 'success' ? 'bg-success/10' : 'bg-primary/10'
                )}>
                  <item.icon className={cn('w-5 h-5', item.color === 'success' ? 'text-success' : 'text-primary')} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="colaboradores">Por Colaborador</TabsTrigger>
          <TabsTrigger value="cursos">Por Trilha</TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Conclusão por Departamento</CardTitle>
                <CardDescription>Taxa de conclusão de trilhas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dashboard?.conclusaoPorDepartamento ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="departamento" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v: number) => [`${v}%`, 'Taxa']}
                    />
                    <Bar dataKey="taxa" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Trilhas por Categoria</CardTitle>
                <CardDescription>Distribuição do portfólio</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={dashboard?.distribuicaoCursos ?? []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="valor" paddingAngle={3}>
                      {(dashboard?.distribuicaoCursos ?? []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v: number) => [`${v}%`]}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução Mensal — {periodo}</CardTitle>
              <CardDescription>Trilhas iniciadas vs. concluídas ao longo do ano</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dashboard?.progressoMensal ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{v === 'iniciados' ? 'Iniciados' : 'Concluídos'}</span>} />
                  <Line type="monotone" dataKey="iniciados" stroke="#9CA3AF" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="concluidos" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba por Colaborador */}
        <TabsContent value="colaboradores" className="mt-4">
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Desempenho Individual</p>
                <SearchableSelect
                  className="h-7 w-48 text-xs"
                  value={departamento}
                  onValueChange={setDepartamento}
                  options={[
                    { value: 'todos', label: 'Todos os setores' },
                    ...departamentos.map(d => ({ value: d, label: d })),
                  ]}
                  placeholder="Setor"
                  searchPlaceholder="Buscar setor..."
                  emptyText="Nenhum setor encontrado."
                />
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport('Colaboradores')}>
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Trilhas Concluídas</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Média de Nota</TableHead>
                    <TableHead>Tempo (min)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colab.loading ? (
                    <LinhasCarregando colunas={6} />
                  ) : colab.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum colaborador encontrado</TableCell>
                    </TableRow>
                  ) : colab.items.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {u.nome.split(' ').map(n => n[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.nome}</p>
                            <p className="text-xs text-muted-foreground">{u.cargo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.departamento}</TableCell>
                      <TableCell>
                        <span className="font-medium text-success">{u.concluidos}</span>
                        <span className="text-muted-foreground">/{u.total}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-24">
                          <Progress value={u.taxa} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium w-8">{u.taxa}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <NotaMedia valor={u.media} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.tempo_total}min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination page={colab.page} pageSize={colab.pageSize} count={colab.count} onPageChange={colab.setPage} loading={colab.loading} />
          </Card>
        </TabsContent>

        {/* Aba por Curso */}
        <TabsContent value="cursos" className="mt-4">
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-semibold text-sm">Desempenho por Trilha</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport('Trilhas')}>
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trilha</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Inscritos</TableHead>
                    <TableHead>Concluídos</TableHead>
                    <TableHead>Taxa de Conclusão</TableHead>
                    <TableHead>Média de Nota</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trilhas.loading ? (
                    <LinhasCarregando colunas={7} />
                  ) : trilhas.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma trilha encontrada</TableCell>
                    </TableRow>
                  ) : trilhas.items.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="text-sm font-medium line-clamp-1">{c.titulo}</p>
                        <p className="text-xs text-muted-foreground">{c.carga_horaria}h</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{c.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.inscritos}</TableCell>
                      <TableCell className="text-sm font-medium text-success">{c.concluidos}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-24">
                          <Progress value={c.taxa} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium w-8">{c.taxa}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <NotaMedia valor={c.media_nota} />
                      </TableCell>
                      <TableCell>
                        <Badge className={c.obrigatorio
                          ? 'bg-destructive/10 text-destructive border-destructive/20 text-[10px] border'
                          : 'bg-secondary text-secondary-foreground text-[10px] border'
                        }>
                          {c.obrigatorio ? 'Obrigatório' : 'Opcional'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination page={trilhas.page} pageSize={trilhas.pageSize} count={trilhas.count} onPageChange={trilhas.setPage} loading={trilhas.loading} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Média de nota na escala 0–10 (aprovação de referência: 7). */
function NotaMedia({ valor }: { valor: number | null }) {
  if (valor == null) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span className={cn('text-sm font-medium', valor >= 7 ? 'text-success' : 'text-warning-foreground')}>
      {valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
    </span>
  )
}

function LinhasCarregando({ colunas, linhas = 6 }: { colunas: number; linhas?: number }) {
  return (
    <>
      {Array.from({ length: linhas }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: colunas }).map((__, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full max-w-32" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
