'use client'

import { useState } from 'react'
import { Plus, Search, BookOpen, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { CursoCard } from './curso-card'
import { CursoDetail } from './curso-detail'
import { CursoForm } from './curso-form'
import { useCursos } from '@/lib/use-cursos'
import { useAuth } from '@/lib/auth-context'
import type { Course } from '@/lib/types'

export function CursosList() {
  const { user } = useAuth()
  const { cursos, getProgress, loading, togglePublicado, reload } = useCursos()
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [criadoPorFiltro, setCriadoPorFiltro] = useState('todos')
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null)
  const [editingCursoId, setEditingCursoId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [recemCriado, setRecemCriado] = useState(false)

  if (!user) return null

  const isAdmin = user.role === 'rh' || user.role === 'gestor'

  function handleEdit(cursoId: string) {
    setEditingCursoId(cursoId)
    setShowForm(true)
  }

  async function handleToggleActive(cursoId: string) {
    try {
      await togglePublicado(cursoId)
      const curso = cursos.find(c => c.id === cursoId)
      toast.success(curso?.publicado ? 'Trilha inativada com sucesso' : 'Trilha ativada com sucesso')
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro ao alterar status da trilha')
    }
  }

  if (showForm) {
    return (
      <CursoForm
        // key força remontar o formulário em modo edição quando o curso é criado
        key={editingCursoId ?? 'novo'}
        cursoId={editingCursoId}
        recemCriado={recemCriado}
        onCreated={id => {
          setEditingCursoId(id)
          setRecemCriado(true)
        }}
        onBack={() => {
          setShowForm(false)
          setEditingCursoId(null)
          setRecemCriado(false)
          reload()
        }}
      />
    )
  }

  if (selectedCursoId) {
    return (
      <CursoDetail
        cursoId={selectedCursoId}
        onBack={() => setSelectedCursoId(null)}
      />
    )
  }

  // Filtragem (aplicada sobre dados da API)
  let filtered = [...cursos]

  if (search) {
    filtered = filtered.filter(c =>
      c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      c.descricao.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
  }
  if (categoria !== 'todos') {
    filtered = filtered.filter(c => c.categoria === categoria)
  }
  if (status !== 'todos') {
    if (status === 'publicado') filtered = filtered.filter(c => c.publicado)
    if (status === 'rascunho') filtered = filtered.filter(c => !c.publicado)
    if (status === 'obrigatorio') filtered = filtered.filter(c => c.obrigatorio)
  }
  if (criadoPorFiltro === '__me__') {
    filtered = filtered.filter(c => c.criadoPor === user.id)
  } else if (criadoPorFiltro !== 'todos') {
    filtered = filtered.filter(c => c.criadoPor === criadoPorFiltro)
  }

  const categorias = Array.from(new Set(cursos.map(c => c.categoria)))

  const criadores = Array.from(
    new Map(
      cursos
        .filter(c => c.criadoPor && c.criadoPorNome)
        .map(c => [c.criadoPor, c.criadoPorNome])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <div className="p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Nova Trilha
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar trilhas, tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="publicado">Publicados</SelectItem>
              <SelectItem value="rascunho">Rascunhos</SelectItem>
              <SelectItem value="obrigatorio">Obrigatórios</SelectItem>
            </SelectContent>
          </Select>
        )}
        {isAdmin && (
          <Select value={criadoPorFiltro} onValueChange={setCriadoPorFiltro}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Criado por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os criadores</SelectItem>
              <SelectItem value="__me__">Criados por mim</SelectItem>
              {criadores
                .filter(([id]) => id !== user.id)
                .map(([id, nome]) => (
                  <SelectItem key={id} value={id}>
                    {nome.split(' ').slice(0, 2).join(' ')}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhuma trilha encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou buscar outro termo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(curso => (
            <CursoCard
              key={curso.id}
              curso={curso}
              progresso={getProgress(curso.id)}
              onClick={() => setSelectedCursoId(curso.id)}
              isAdmin={user.role === 'rh' || (user.role === 'gestor' && curso.criadoPor === user.id)}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  )
}
