'use client'

import { useState, useRef } from 'react'
import {
  Library, Download, Heart, Search, Filter, Upload,
  FileText, FileSpreadsheet, Image as ImageIcon, File,
  Pencil, Trash2, Plus, Eye, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { useBiblioteca, type BibliotecaFormData } from '@/lib/use-biblioteca'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { LibraryItem } from '@/lib/types'

const CATEGORIES = ['Manuais Técnicos', 'Normas e Regulamentos', 'Catálogos', 'Desenvolvimento', 'Outros']
const ROLES_OPTIONS = [
  { value: 'colaborador', label: 'Colaboradores' },
  { value: 'gestor', label: 'Gestores' },
  { value: 'rh', label: 'RH' },
]
const EMPTY_FORM: BibliotecaFormData = {
  titulo: '',
  descricao: '',
  categoria: 'Manuais Técnicos',
  tags: '',
  rolesPermitidas: ['colaborador', 'gestor', 'rh'],
  arquivo: null,
  driveId: '',
  driveNome: '',
  driveWebViewLink: '',
}

function FileIcon({ item }: { item: LibraryItem }) {
  if (item.driveId) return <File className="w-6 h-6 text-blue-400" />
  const ext = item.arquivo?.split('?')[0] ?? ''
  if (ext.endsWith('.pdf')) return <FileText className="w-6 h-6 text-red-500" />
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return <FileSpreadsheet className="w-6 h-6 text-green-600" />
  if (/\.(png|jpg|jpeg)$/.test(ext)) return <ImageIcon className="w-6 h-6 text-blue-500" />
  return <File className="w-6 h-6 text-gray-500" />
}

export function BibliotecaList() {
  const { user } = useAuth()
  const { items, loading, createItem, updateItem, deleteItem, incrementDownload, toggleFavorito, getFileUrl } = useBiblioteca()

  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todos')

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LibraryItem | null>(null)
  const [form, setForm] = useState<BibliotecaFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [fonteMode, setFonteMode] = useState<'arquivo' | 'drive'>('arquivo')
  const [driveChecking, setDriveChecking] = useState(false)
  const [driveError, setDriveError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<LibraryItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const isAdmin = user.role === 'rh' || user.role === 'gestor'

  const filtered = items
    .filter(item => categoria === 'Todos' || item.categoria === categoria)
    .filter(item =>
      search === '' ||
      item.titulo.toLowerCase().includes(search.toLowerCase()) ||
      item.descricao.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFonteMode('arquivo')
    setDriveError('')
    setModalOpen(true)
  }

  function openEdit(item: LibraryItem) {
    setEditTarget(item)
    const isDrive = !!item.driveId
    setFonteMode(isDrive ? 'drive' : 'arquivo')
    setDriveError('')
    setForm({
      titulo: item.titulo,
      descricao: item.descricao,
      categoria: item.categoria || CATEGORIES[0],
      tags: item.tags.join(', '),
      rolesPermitidas: item.rolesPermitidas.length ? item.rolesPermitidas : ['colaborador', 'gestor', 'rh'],
      arquivo: null,
      driveId: item.driveId,
      driveNome: item.driveNome,
      driveWebViewLink: item.driveWebViewLink,
    })
    setModalOpen(true)
  }

  async function handleVerifyDrive() {
    const id = (form.driveId ?? '').trim()
    if (!id) return
    setDriveChecking(true)
    setDriveError('')
    try {
      const res = await api.get<any>(`/library/drive-info/?drive_id=${id}`)
      setForm(f => ({
        ...f,
        driveId: res.drive_id ?? id,
        driveNome: res.drive_nome ?? '',
        driveWebViewLink: res.drive_web_view_link ?? '',
      }))
    } catch (e: any) {
      setDriveError(e?.message ?? 'Não foi possível acessar o arquivo no Drive.')
      setForm(f => ({ ...f, driveNome: '', driveWebViewLink: '' }))
    } finally {
      setDriveChecking(false)
    }
  }

  async function handleSave() {
    if (!form.titulo.trim()) { toast.error('Informe o título do material.'); return }
    if (!editTarget) {
      if (fonteMode === 'arquivo' && !form.arquivo) { toast.error('Selecione um arquivo.'); return }
      if (fonteMode === 'drive' && !form.driveWebViewLink) { toast.error('Verifique o ID do Drive antes de salvar.'); return }
    }
    setSaving(true)
    try {
      if (editTarget) {
        await updateItem(editTarget.id, form)
        toast.success('Material atualizado com sucesso.')
      } else {
        await createItem(form)
        toast.success('Material adicionado à biblioteca.')
      }
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar material.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteItem(deleteTarget.id)
      toast.success('Material removido da biblioteca.')
      setDeleteTarget(null)
    } catch {
      toast.error('Erro ao remover material.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDownload(item: LibraryItem) {
    await incrementDownload(item.id)
    const url = getFileUrl(item)
    if (url) window.open(url, '_blank', 'noopener')
    else toast.success(`Download de "${item.titulo}" iniciado.`)
  }

  async function handleFavorite(item: LibraryItem) {
    await toggleFavorito(item.id)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-7 w-52" />
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 max-w-xs" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-end gap-4 flex-wrap">
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Material
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar materiais, tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-52">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Library className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold">Nenhum material encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-all group">
              <CardContent className="p-5 flex flex-col h-full">
                {/* Ícone, título e ações admin */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted flex-shrink-0">
                    <FileIcon item={item} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{item.titulo}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1">{item.categoria}</Badge>
                  </div>
                  {(user.role === 'rh' || (user.role === 'gestor' && item.criadoPor === user.id)) && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1 mb-4">
                  {item.descricao || <span className="italic">Sem descrição.</span>}
                </p>

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3 pt-2 border-t border-border">
                  <span>{item.tamanho || '—'}</span>
                  <span>{item.downloads} download(s)</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => handleDownload(item)}>
                    <Download className="w-3.5 h-3.5" /> Baixar
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className={cn('gap-1.5 text-xs px-3', item.isFavorito && 'text-red-500 border-red-200 bg-red-50 hover:bg-red-100')}
                    onClick={() => handleFavorite(item)}
                  >
                    <Heart className={cn('w-3.5 h-3.5', item.isFavorito && 'fill-current')} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open && !saving) setModalOpen(false) }}>
        {/* Altura limitada à tela: título e botões fixos, só o formulário rola */}
        <DialogContent className="max-w-lg flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{editTarget ? 'Editar Material' : 'Adicionar Material'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Altere os dados do material da biblioteca.' : 'Envie um novo material para a biblioteca digital.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 py-4">
            <div>
              <Label>Título <span className="text-destructive">*</span></Label>
              <Input className="mt-1" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Manual de Operação S800" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea className="mt-1 min-h-[70px]" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o conteúdo do material..." />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags <span className="text-xs text-muted-foreground">(separadas por vírgula)</span></Label>
              <Input className="mt-1" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Ex: NR12, segurança, maquinário" />
            </div>
            <div>
              <Label className="mb-2 block">Visível para</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ROLES_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={form.rolesPermitidas.includes(opt.value)}
                      onCheckedChange={checked => setForm(f => ({
                        ...f,
                        rolesPermitidas: checked
                          ? [...f.rolesPermitidas, opt.value]
                          : f.rolesPermitidas.filter(r => r !== opt.value),
                      }))}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            {/* Toggle fonte */}
            <div>
              <Label className="mb-2 block">Fonte do arquivo {!editTarget && <span className="text-destructive">*</span>}</Label>
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                {(['arquivo', 'drive'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setFonteMode(mode); setDriveError('') }}
                    className={`flex-1 py-1.5 font-medium transition-colors ${
                      fonteMode === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'arquivo' ? 'Upload de arquivo' : 'Google Drive'}
                  </button>
                ))}
              </div>
            </div>

            {fonteMode === 'arquivo' ? (
              <div>
                {editTarget && <p className="text-xs text-muted-foreground mb-1">Deixe vazio para manter o arquivo atual.</p>}
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                  onChange={e => setForm(f => ({ ...f, arquivo: e.target.files?.[0] ?? null }))}
                />
                <div
                  className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {form.arquivo ? (
                    <p className="text-sm font-medium text-primary">{form.arquivo.name}</p>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-1.5" />
                      <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste o arquivo</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOC, XLS, PPT, imagens — máx. 50 MB</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={form.driveId ?? ''}
                    onChange={e => setForm(f => ({ ...f, driveId: e.target.value, driveNome: '', driveWebViewLink: '' }))}
                    placeholder="Ex.: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyDrive}
                    disabled={!(form.driveId ?? '').trim() || driveChecking}
                  >
                    {driveChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    <span className="ml-1.5">Verificar</span>
                  </Button>
                </div>
                {driveError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {driveError}
                  </div>
                )}
                {form.driveWebViewLink && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-300 font-medium truncate">{form.driveNome}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editTarget ? 'Salvar Alterações' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ──────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover material?</AlertDialogTitle>
            <AlertDialogDescription>
              O material <strong>"{deleteTarget?.titulo}"</strong> será removido permanentemente da biblioteca. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
