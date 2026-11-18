'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDepartamentos, type Departamento, type GestorOption } from '@/lib/use-departamentos'
import { usePaginatedList, useDebouncedValue } from '@/lib/use-paginated-list'
import { TablePagination } from '@/components/ui/table-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const EMPTY_FORM = { nome: '', gestor: '' }
const MAX_CARGOS_VISIVEIS = 3

export function SetoresTab() {
  const {
    fetchGestores,
    createDepartamento, updateDepartamento, deleteDepartamento,
  } = useDepartamentos()

  const [search, setSearch] = useState('')
  const busca = useDebouncedValue(search.trim())
  // Tabela paginada no servidor; a busca cobre nome do setor e do gestor
  const {
    items: filtered, count, page, setPage, pageSize, loading, reload,
  } = usePaginatedList<Departamento>('/auth/departments/', { search: busca, ordering: 'nome' })
  const [gestores, setGestores] = useState<GestorOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Departamento | null>(null)
  const [editing, setEditing] = useState<Departamento | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchGestores().then(setGestores).catch(() => {})
  }, [fetchGestores])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(dep: Departamento) {
    setEditing(dep)
    setForm({ nome: dep.nome, gestor: dep.gestor ?? '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast.error('O nome do setor é obrigatório.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        gestor: form.gestor || null,
      }
      if (editing) {
        await updateDepartamento(editing.id, payload)
        toast.success('Setor atualizado com sucesso.')
      } else {
        await createDepartamento(payload)
        toast.success('Setor criado com sucesso.')
      }
      setDialogOpen(false)
      reload()
    } catch (e: any) {
      const msg = e?.body?.nome?.[0] ?? e?.body?.detail ?? e?.message ?? 'Erro ao salvar setor.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDepartamento(deleteTarget.id)
      toast.success(`Setor "${deleteTarget.nome}" removido.`)
      reload()
    } catch {
      toast.error('Erro ao remover setor.')
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
            placeholder="Buscar setor..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Setor
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setor</TableHead>
              <TableHead>Cargos</TableHead>
              <TableHead className="hidden sm:table-cell">Gestor responsável</TableHead>
              <TableHead className="hidden md:table-cell w-24 text-center">Membros</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  {search
                    ? 'Nenhum setor encontrado para esta busca.'
                    : 'Nenhum setor cadastrado ainda.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(dep => (
                <TableRow key={dep.id}>
                  <TableCell className="font-medium">{dep.nome}</TableCell>
                  <TableCell>
                    {dep.cargos.length === 0 ? (
                      <span className="text-xs italic text-muted-foreground opacity-60">Sem cargos</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        {dep.cargos.slice(0, MAX_CARGOS_VISIVEIS).map(c => (
                          <Badge key={c.id} variant="outline" className="text-[10px] font-normal">
                            {c.nome}
                          </Badge>
                        ))}
                        {dep.cargos.length > MAX_CARGOS_VISIVEIS && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-[10px] cursor-default">
                                +{dep.cargos.length - MAX_CARGOS_VISIVEIS}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {dep.cargos.slice(MAX_CARGOS_VISIVEIS).map(c => c.nome).join(', ')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {dep.gestor_nome ?? <span className="italic opacity-50">Sem gestor</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center text-sm text-muted-foreground">
                    {dep.colaboradores.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(dep)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(dep)}
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
            <DialogTitle>{editing ? 'Editar Setor' : 'Novo Setor'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="dep-nome">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dep-nome"
                placeholder="ex.: Manutenção Industrial"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dep-gestor">Gestor responsável</Label>
              <Select
                value={form.gestor}
                onValueChange={v => setForm(f => ({ ...f, gestor: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger id="dep-gestor">
                  <SelectValue placeholder="Sem gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="italic text-muted-foreground">Sem gestor</span>
                  </SelectItem>
                  {gestores.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {gestores.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum usuário com perfil Gestor cadastrado.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar setor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover setor?</AlertDialogTitle>
            <AlertDialogDescription>
              O setor <strong>{deleteTarget?.nome}</strong> será removido permanentemente.
              Os usuários vinculados não serão deletados, apenas desassociados.
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
