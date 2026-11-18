'use client'

import { BookOpen, Clock, Users, Star, ChevronRight, Lock, MoreVertical, Edit, Ban, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Course, CourseProgress } from '@/lib/types'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  'Segurança': 'bg-red-100 text-red-700 border-red-200',
  'Manutenção': 'bg-blue-100 text-blue-700 border-blue-200',
  'Liderança': 'bg-purple-100 text-purple-700 border-purple-200',
  'Qualidade': 'bg-green-100 text-green-700 border-green-200',
  'default': 'bg-primary/10 text-primary border-primary/20',
}

interface CursoCardProps {
  curso: Course
  progresso?: CourseProgress
  onClick?: () => void
  showActions?: boolean
  isAdmin?: boolean
  onEdit?: (cursoId: string) => void
  onToggleActive?: (cursoId: string) => void
}

export function CursoCard({ 
  curso, 
  progresso, 
  onClick, 
  showActions = true,
  isAdmin = false,
  onEdit,
  onToggleActive
}: CursoCardProps) {
  const catColor = CATEGORY_COLORS[curso.categoria] ?? CATEGORY_COLORS.default
  const status = progresso?.status ?? 'nao_iniciado'

  const statusConfig = {
    nao_iniciado: { label: 'Não Iniciado', class: 'bg-muted text-muted-foreground' },
    em_andamento: { label: 'Em Andamento', class: 'bg-primary/10 text-primary border-primary/20' },
    concluido: { label: 'Concluído', class: 'bg-success/10 text-success border-success/20' },
    reprovado: { label: 'Reprovado', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  }

  const totalAulas = curso.totalAulas ?? curso.modulos.reduce((acc, m) => acc + m.aulas.length, 0)

  return (
    <Card
      className={cn(
        'group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 p-0 gap-0 overflow-hidden',
        status === 'concluido' && 'border-success/20'
      )}
      onClick={onClick}
    >
      {/* Barra colorida no topo */}
      <div className="h-2 bg-primary" />

      <CardContent className="px-4 pt-4 pb-4">
        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge className={cn('text-[10px] border font-medium', catColor)}>{curso.categoria}</Badge>
          {curso.obrigatorio && (
            <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
              Obrigatório
            </Badge>
          )}
          {!curso.publicado && (
            <Badge variant="outline" className="text-[10px]">
              <Lock className="w-2.5 h-2.5 mr-1" /> Rascunho
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] ml-auto',
              curso.temAvaliacao
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-dashed text-muted-foreground'
            )}
          >
            <ClipboardList className="w-2.5 h-2.5 mr-1" />
            {curso.temAvaliacao ? 'Com prova' : 'Sem prova'}
          </Badge>
        </div>

        {/* Título */}
        <h3 className="font-semibold text-sm text-foreground leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {curso.titulo}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {curso.descricao}
        </p>

        {/* Metadados */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {curso.cargaHoraria}h
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {totalAulas} aulas
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {curso.totalInscritos}
          </div>
          {curso.mediaAvaliacao > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span className="font-medium text-foreground">{curso.mediaAvaliacao}</span>
            </div>
          )}
        </div>

        {/* Progresso (se aplicável) */}
        {progresso && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Progresso</span>
              <span className="text-[10px] font-medium">{progresso.percentual}%</span>
            </div>
            <Progress value={progresso.percentual} className="h-1.5" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {progresso ? (
            <Badge className={cn('text-[10px] border', statusConfig[status].class)}>
              {statusConfig[status].label}
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">v{curso.versao}</span>
          )}
          {curso.prazo && (
            <span className="text-[10px] text-muted-foreground">
              Prazo: {new Date(curso.prazo).toLocaleDateString('pt-BR')}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {isAdmin && onEdit && onToggleActive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    onEdit(curso.id)
                  }}>
                    <Edit className="w-3.5 h-3.5 mr-2" />
                    Editar Trilha
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    onToggleActive(curso.id)
                  }}>
                    <Ban className="w-3.5 h-3.5 mr-2" />
                    {curso.publicado ? 'Inativar' : 'Ativar'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {showActions && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
