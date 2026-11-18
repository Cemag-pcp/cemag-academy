'use client'

import { useState, useEffect } from 'react'
import {
  Users, UserPlus, Search, Filter, Edit2, Power,
  Mail, Building2, Shield, ChevronDown, MoreHorizontal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useUsuarios, mapUser, type UsuarioFormData } from '@/lib/use-usuarios'
import { usePaginatedList, useDebouncedValue } from '@/lib/use-paginated-list'
import { TablePagination } from '@/components/ui/table-pagination'
import { useCargos } from '@/lib/use-cargos'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { User, Role } from '@/lib/types'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<Role, string> = {
  rh: 'RH',
  gestor: 'Gestor',
  colaborador: 'Colaborador',
}

const ROLE_COLORS: Record<Role, string> = {
  rh: 'bg-primary/10 text-primary border-primary/20',
  gestor: 'bg-blue-500/10 text-blue-600 border-blue-200',
  colaborador: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
}

type FilterRole = Role | 'todos'

const EMPTY_NEW: UsuarioFormData = { matricula: '', nome: '', email: '', cargo: '', departamento: '', role: 'colaborador', password: 'cemag2025' }

export function UsuariosList() {
  const { departments, resumo, createUsuario, updateUsuario, toggleStatus } = useUsuarios()
  const { cargos: cargoOpts, fetchCargos: loadCargos } = useCargos()

  useEffect(() => { loadCargos() }, [loadCargos])

  // Cargos ativos do setor escolhido; `cargoAtual` mantém o cargo já gravado no usuário
  // visível mesmo que ainda não esteja vinculado ao setor
  function cargosDoSetor(setor: string, cargoAtual?: string) {
    return cargoOpts.filter(c =>
      (c.ativo && c.setores_nomes.includes(setor)) || (!!cargoAtual && c.nome === cargoAtual)
    )
  }

  function cargoPertenceAoSetor(cargo: string, setor: string) {
    return cargoOpts.some(c => c.nome === cargo && c.setores_nomes.includes(setor))
  }

  const setorOptions = departments.map(d => ({ value: d.nome, label: d.nome }))

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<FilterRole>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  const [addOpen, setAddOpen] = useState(false)
  const [newUser, setNewUser] = useState<UsuarioFormData>(EMPTY_NEW)
  const [saving, setSaving] = useState(false)

  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<Partial<UsuarioFormData>>({})
  const [editSaving, setEditSaving] = useState(false)

  // Lista paginada no servidor: busca e filtros também são aplicados lá
  const busca = useDebouncedValue(search.trim())
  const {
    items: filtered, count, page, setPage, pageSize, loading, reload,
  } = usePaginatedList<User>('/auth/users/', {
    search: busca,
    role: roleFilter === 'todos' ? undefined : roleFilter,
    status: statusFilter === 'todos' ? undefined : statusFilter,
    ordering: 'nome',
  }, { map: mapUser })

  async function handleStatusToggle(user: User) {
    try {
      const updated = await toggleStatus(user.id)
      reload()
      toast.success(`Usuário ${user.nome} ${updated.status === 'ativo' ? 'reativado' : 'desativado'} com sucesso.`)
    } catch {
      toast.error('Erro ao alterar status do usuário.')
    }
  }

  async function handleSaveUser() {
    if (!newUser.matricula || !newUser.nome) { toast.error('Preencha matrícula e nome.'); return }
    setSaving(true)
    try {
      await createUsuario(newUser)
      reload()
      toast.success(`Usuário ${newUser.nome} criado com sucesso.`)
      setAddOpen(false)
      setNewUser(EMPTY_NEW)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar usuário.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSave() {
    if (!editUser) return
    setEditSaving(true)
    try {
      await updateUsuario(editUser.id, editForm)
      reload()
      toast.success('Dados do usuário atualizados com sucesso.')
      setEditUser(null)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar usuário.')
    } finally {
      setEditSaving(false)
    }
  }

  function openEdit(u: User) {
    setEditUser(u)
    setEditForm({ nome: u.nome, cargo: u.cargo, departamento: u.departamento, role: u.role })
  }

  return (
    <div className="p-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumo.total}</p>
                <p className="text-xs text-muted-foreground">Total de usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Power className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumo.ativos}</p>
                <p className="text-xs text-muted-foreground">Usuários ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumo.inativos}</p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e ação */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por matrícula, nome, cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={v => setRoleFilter(v as FilterRole)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            <SelectItem value="rh">RH</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="colaborador">Colaborador</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setAddOpen(true)} className="gap-2 ml-auto">
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Tabela */}
      <Card className="py-0 gap-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Trilhas</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-9 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(u => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                          {u.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.nome}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {u.matricula}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        {u.departamento}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.cargo}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] border', ROLE_COLORS[u.role])}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        'text-[10px] border',
                        u.status === 'ativo'
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-muted text-muted-foreground border-border'
                      )}>
                        {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.dataAdmissao ? new Date(u.dataAdmissao).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium text-success">{u.cursosCompletos.length}</span>
                        <span className="text-muted-foreground">/{u.cursosAtribuidos.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)} className="gap-2">
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusToggle(u)}
                            className={cn('gap-2', u.status === 'ativo' ? 'text-destructive' : 'text-success')}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {u.status === 'ativo' ? 'Desativar' : 'Reativar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination page={page} pageSize={pageSize} count={count} onPageChange={setPage} loading={loading} />
      </Card>

      {/* Modal adicionar usuário */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados para criar a conta. Um e-mail de boas-vindas será enviado automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Matrícula <span className="text-destructive">*</span></Label>
                <Input className="mt-1" value={newUser.matricula} onChange={e => setNewUser(f => ({ ...f, matricula: e.target.value }))} placeholder="Ex: 00123" />
              </div>
              <div>
                <Label>E-mail do supervisor</Label>
                <Input className="mt-1" type="email" value={newUser.email} onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} placeholder="supervisor@cemag.com.br" />
              </div>
              <div className="col-span-2">
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input className="mt-1" value={newUser.nome} onChange={e => setNewUser(f => ({ ...f, nome: e.target.value }))} placeholder="João da Silva" />
              </div>
              <div className="col-span-2">
                <Label>Senha inicial <span className="text-xs text-muted-foreground">(mín. 8 caracteres)</span></Label>
                <Input className="mt-1" type="password" value={newUser.password ?? ''} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} placeholder="cemag2025" />
              </div>
              <div className="col-span-2">
                <Label>Setor</Label>
                <SearchableSelect
                  className="mt-1"
                  value={newUser.departamento}
                  onValueChange={v => setNewUser(f => ({ ...f, departamento: v, cargo: cargoPertenceAoSetor(f.cargo, v) ? f.cargo : '' }))}
                  options={setorOptions}
                  placeholder="Selecione"
                  searchPlaceholder="Buscar setor..."
                  emptyText="Nenhum setor encontrado."
                />
              </div>
              <div className="col-span-2">
                <Label>Cargo</Label>
                <SearchableSelect
                  className="mt-1"
                  value={newUser.cargo}
                  onValueChange={v => setNewUser(f => ({ ...f, cargo: v }))}
                  disabled={!newUser.departamento}
                  options={cargosDoSetor(newUser.departamento).map(c => ({ value: c.nome, label: c.nome }))}
                  placeholder={newUser.departamento ? 'Selecione um cargo' : 'Selecione o setor primeiro'}
                  searchPlaceholder="Buscar cargo..."
                  emptyText="Nenhum cargo encontrado."
                />
              </div>
              <div>
                <Label>Perfil de acesso</Label>
                <Select value={newUser.role} onValueChange={v => setNewUser(f => ({ ...f, role: v as Role }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="rh">RH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveUser} disabled={saving}>{saving ? 'Criando...' : 'Criar Usuário'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar usuário */}
      <Dialog open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>{editUser?.nome}{editUser?.email ? ` — Supervisor: ${editUser.email}` : ''}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome completo</Label>
                  <Input className="mt-1" value={editForm.nome ?? ''} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Setor</Label>
                  <SearchableSelect
                    className="mt-1"
                    value={editForm.departamento ?? ''}
                    onValueChange={v => setEditForm(f => ({ ...f, departamento: v, cargo: cargoPertenceAoSetor(f.cargo ?? '', v) ? f.cargo : '' }))}
                    options={setorOptions}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar setor..."
                    emptyText="Nenhum setor encontrado."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Cargo</Label>
                  <SearchableSelect
                    className="mt-1"
                    value={editForm.cargo ?? ''}
                    onValueChange={v => setEditForm(f => ({ ...f, cargo: v }))}
                    disabled={!editForm.departamento}
                    options={cargosDoSetor(editForm.departamento ?? '', editUser?.cargo).map(c => ({ value: c.nome, label: c.nome }))}
                    placeholder={editForm.departamento ? 'Selecione um cargo' : 'Selecione o setor primeiro'}
                    searchPlaceholder="Buscar cargo..."
                    emptyText="Nenhum cargo encontrado."
                  />
                </div>
                <div>
                  <Label>Perfil de acesso</Label>
                  <Select value={editForm.role ?? 'colaborador'} onValueChange={v => setEditForm(f => ({ ...f, role: v as Role }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar Alterações'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
