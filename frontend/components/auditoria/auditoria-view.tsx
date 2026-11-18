'use client'

import { useState } from 'react'
import { Search, Download, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import { toast } from 'sonner'
import { mapLog, type AuditLog, type AuditLogRaw } from '@/lib/use-auditoria'
import { usePaginatedList, useDebouncedValue } from '@/lib/use-paginated-list'

// O middleware grava o prefixo da API como módulo; aqui vira um nome legível
const MODULOS: { valor: string; label: string; cor: string }[] = [
  { valor: 'courses',       label: 'Trilhas',          cor: 'bg-primary/10 text-primary border-primary/20' },
  { valor: 'auth',          label: 'Usuários',         cor: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { valor: 'progress',      label: 'Avaliações',       cor: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { valor: 'library',       label: 'Biblioteca',       cor: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { valor: 'acervo',        label: 'Documentação ISO', cor: 'bg-teal-500/10 text-teal-600 border-teal-200' },
  { valor: 'certificates',  label: 'Certificados',     cor: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { valor: 'notifications', label: 'Notificações',     cor: 'bg-slate-500/10 text-slate-600 border-slate-200' },
]
const MODULO_POR_VALOR = Object.fromEntries(MODULOS.map(m => [m.valor, m]))
const TODOS = 'todos'

export function AuditoriaView() {
  const [search, setSearch] = useState('')
  const [modulo, setModulo] = useState(TODOS)
  const busca = useDebouncedValue(search.trim())

  const { items: logs, count, page, setPage, pageSize, loading } = usePaginatedList<AuditLog, AuditLogRaw>(
    '/audit/logs/',
    { search: busca, modulo: modulo === TODOS ? undefined : modulo },
    { map: mapLog, pageSize: 50 },
  )

  function formatTimestamp(ts: string) {
    const d = new Date(ts)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário, ação ou detalhe..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={modulo} onValueChange={setModulo}>
          <SelectTrigger className="w-48">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os módulos</SelectItem>
            {MODULOS.map(m => <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2 ml-auto" onClick={() => toast.success('Logs exportados com sucesso.')}>
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      <Card className="py-0 gap-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => {
                  const mod = MODULO_POR_VALOR[log.modulo]
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                            {log.usuarioNome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium whitespace-nowrap">{log.usuarioNome}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border ${mod?.cor ?? 'bg-muted text-muted-foreground border-border'}`}>
                          {mod?.label ?? log.modulo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.acao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.detalhes}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{log.ip}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination page={page} pageSize={pageSize} count={count} onPageChange={setPage} loading={loading} />
      </Card>
    </div>
  )
}
