'use client'

import React, { useState } from 'react'
import { Plus, Search, Edit, Trash2, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { useAssessments, type Assessment } from '@/lib/use-assessments'
import { AssessmentForm } from '.'

export function AssessmentsList() {
  const { user } = useAuth()
  const { assessments, loading, deleteAssessment, getCourses } = useAssessments()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cursos, setCursos] = useState<Record<string, string>>({})

  if (!user || (user.role !== 'rh' && user.role !== 'gestor')) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Acesso restrito a RH e Gestores.</p>
      </div>
    )
  }

  React.useEffect(() => {
    loadCursos()
  }, [])

  async function loadCursos() {
    try {
      const data = await getCourses()
      const cursosMap: Record<string, string> = {}
      data.forEach(c => {
        cursosMap[c.id] = c.titulo
      })
      setCursos(cursosMap)
    } catch {
      // Ignore
    }
  }

  if (showForm) {
    return (
      <AssessmentForm
        assessmentId={selectedId}
        onBack={() => {
          setShowForm(false)
          setSelectedId(null)
        }}
      />
    )
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteAssessment(deleteId)
      toast.success('Avaliação excluída com sucesso!')
      setDeleteId(null)
    } catch {
      toast.error('Erro ao excluir avaliação.')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = assessments.filter(a =>
    a.titulo.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar avaliações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'avaliação' : 'avaliações'}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma avaliação encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? 'Tente alterar os filtros de busca' : 'Crie sua primeira avaliação'}
            </p>
            {!search && (
              <Button
                onClick={() => { setSelectedId(null); setShowForm(true) }}
                className="mt-4 gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" /> Criar Avaliação
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((assessment) => (
            <Card key={assessment.id} className="hover:border-primary/40 transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                      {assessment.titulo}
                    </h3>
                    {assessment.curso_id && cursos[assessment.curso_id] && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        📚 {cursos[assessment.curso_id]}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {assessment.questoes.length} {assessment.questoes.length === 1 ? 'questão' : 'questões'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Nota mínima: {assessment.nota_minima_aprovacao}
                      </Badge>
                    </div>
                  </div>
                  {(user.role === 'rh' || (user.role === 'gestor' && assessment.criado_por_id === user.id)) && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedId(assessment.id)
                          setShowForm(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(assessment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{assessment.tentativas_permitidas} {assessment.tentativas_permitidas === 1 ? 'tentativa' : 'tentativas'} permitida(s)</span>
                  </div>
                  {assessment.questoes.length > 0 && (
                    <div className="pt-2 border-t border-border mt-3">
                      <p className="font-medium text-foreground mb-1">Tipos de questões:</p>
                      {assessment.questoes.filter(q => q.tipo === 'multipla_escolha').length > 0 && (
                        <span className="text-xs">
                          • {assessment.questoes.filter(q => q.tipo === 'multipla_escolha').length} múltipla escolha
                        </span>
                      )}
                      {assessment.questoes.filter(q => q.tipo === 'aberta').length > 0 && (
                        <span className="text-xs block">
                          • {assessment.questoes.filter(q => q.tipo === 'aberta').length} aberta(s)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
              Trilhas que usam esta avaliação perderão a associação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
