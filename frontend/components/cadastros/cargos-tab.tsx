'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { useCargos, type Cargo } from '@/lib/use-cargos'
import { useDepartamentos } from '@/lib/use-departamentos'
import { usePaginatedList, useDebouncedValue } from '@/lib/use-paginated-list'
import { TablePagination } from '@/components/ui/table-pagination'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const EMPTY_FORM = { nome: '', descricao: '', ativo: true, setores: [] as string[] }
const TODOS_SETORES = 'todos'

export function CargosTab() {
  const { createCargo, updateCargo, deleteCargo } = useCargos()
  const { departamentos: setores, fetchDepartamentos: fetchSetores } = useDepartamentos()

  const [search, setSearch] = useState('')
  const [setorFiltro, setSetorFiltro] = useState(TODOS_SETORES)
  const [setorBusca, setSetorBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null)
  const [editing, setEditing] = useState<Cargo | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const busca = useDebouncedValue(search.trim())
  // Tabela paginada no servidor (busca e filtro de setor também no servidor)
  const {
    items: filtered, count, page, setPage, pageSize, loading, reload,
  } = usePaginatedList<Cargo>('/auth/cargos/', {
    search: busca,
    setor: setorFiltro === TODOS_SETORES ? undefined : setorFiltro,
    ordering: 'nome',
  })

  useEffect(() => {
    fetchSetores()
  }, [fetchSetores])

  const setoresVisiveis = setores.filter(s =>
    s.nome.toLowerCase().includes(setorBusca.toLowerCase())
  )

  function toggleSetor(id: string, checked: boolean) {
    setForm(f => ({
      ...f,
      setores: checked ? [...f.setores, id] : f.setores.filter(s => s !== id),
    }))
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, setores: setorFiltro === TODOS_SETORES ? [] : [setorFiltro] })
    setSetorBusca('')
    setDialogOpen(true)
  }

  function openEdit(cargo: Cargo) {
    setEditing(cargo)
    setForm({ nome: cargo.nome, descricao: cargo.descricao, ativo: cargo.ativo, setores: cargo.setores })
    setSetorBusca('')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast.error('O nome do cargo é obrigatório.')
      return
    }
    if (form.setores.length === 0) {
      toast.error('Selecione ao menos um setor.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateCargo(editing.id, form)
        toast.success('Cargo atualizado com sucesso.')
      } else {
        await createCargo(form)
        toast.success('Cargo criado com sucesso.')
      }
      setDialogOpen(false)
      reload()
    } catch (e: any) {
      const msg = e?.body?.nome?.[0] ?? e?.body?.setores?.[0] ?? e?.body?.detail ?? 'Erro ao salvar cargo.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteCargo(deleteTarget.id)
      toast.success(`Cargo "${deleteTarget.nome}" removido.`)
      reload()
    } catch {
      toast.error('Erro ao remover cargo.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cargo..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <SearchableSelect
          className="w-56"
          value={setorFiltro}
          onValueChange={setSetorFiltro}
          options={[
            { value: TODOS_SETORES, label: 'Todos os setores' },
            ...setores.map(s => ({ value: s.id, label: s.nome })),
          ]}
          placeholder="Filtrar por setor"
          searchPlaceholder="Buscar setor..."
          emptyText="Nenhum setor encontrado."
        />
        <div className="flex-1" />
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cargo
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Setores</TableHead>
              <TableHead className="hidden lg:table-cell">Descrição</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-52" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <Briefcase className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  {search || setorFiltro !== TODOS_SETORES
                    ? 'Nenhum cargo encontrado para este filtro.'
                    : 'Nenhum cargo cadastrado ainda.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(cargo => (
                <TableRow key={cargo.id}>
                  <TableCell className="font-medium">{cargo.nome}</TableCell>
                  <TableCell>
                    {cargo.setores_nomes.length === 0 ? (
                      <span className="text-xs italic text-muted-foreground opacity-60">Sem setor</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {cargo.setores_nomes.map(nome => (
                          <Badge key={nome} variant="outline" className="text-[10px] font-normal">
                            {nome}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-xs">
                    {cargo.descricao || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cargo.ativo ? 'default' : 'secondary'}>
                      {cargo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(cargo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cargo)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination page={page} pageSize={pageSize} count={count} onPageChange={setPage} loading={loading} />
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="cargo-nome">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cargo-nome"
                placeholder="ex.: Analista de RH"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="space-y-1">
              <Label>
                Setores <span className="text-destructive">*</span>
                {form.setores.length > 0 && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({form.setores.length} selecionado{form.setores.length !== 1 ? 's' : ''})
                  </span>
                )}
              </Label>
              <Input
                placeholder="Buscar setor..."
                className="h-8"
                value={setorBusca}
                onChange={e => setSetorBusca(e.target.value)}
              />
              <div className="max-h-44 overflow-y-auto rounded-md border p-2 space-y-1">
                {setoresVisiveis.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">Nenhum setor encontrado.</p>
                ) : (
                  setoresVisiveis.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 rounded px-1 py-1 text-sm cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={form.setores.includes(s.id)}
                        onCheckedChange={checked => toggleSetor(s.id, checked === true)}
                      />
                      {s.nome}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cargo-descricao">Descrição</Label>
              <Textarea
                id="cargo-descricao"
                placeholder="Descreva as responsabilidades do cargo..."
                rows={3}
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="cargo-ativo"
                checked={form.ativo}
                onCheckedChange={checked => setForm(f => ({ ...f, ativo: checked }))}
              />
              <Label htmlFor="cargo-ativo" className="cursor-pointer">
                Cargo ativo
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar cargo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              O cargo <strong>{deleteTarget?.nome}</strong> será removido permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
