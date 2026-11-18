'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Eye, X, File, ClipboardList, PencilLine, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useCargos } from '@/lib/use-cargos'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { AssessmentForm } from '@/components/avaliacoes'

interface CursoFormProps {
  cursoId?: string | null
  onBack: () => void
  /** Chamado após criar um curso novo, para reabrir o formulário já em modo edição */
  onCreated?: (cursoId: string) => void
  /** Curso acabou de ser criado: mostra os próximos passos (avaliação etc.) */
  recemCriado?: boolean
}

export function CursoForm({ cursoId, onBack, onCreated, recemCriado }: CursoFormProps) {
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    cargaHoraria: 8,
    categoria: 'Segurança',
    obrigatorio: false,
    prazo: '',
    publicado: false,
    driveFolderId: '',
    modalidade: 'interno',
  })
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [apiDepartamentos, setApiDepartamentos] = useState<{ id: string; nome: string }[]>([])
  const [cargosAlvo, setCargosAlvo] = useState<string[]>([])
  const { cargos: apiCargos, fetchCargos } = useCargos()
  const [modulos, setModulos] = useState([
    { id: '1', titulo: 'Módulo 1', aulas: [{ id: '1a', titulo: '', tipo: 'video', conteudo: '', duracao: 15, arquivo: null as File | null }] }
  ])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!cursoId)
  const [existingAssessmentId, setExistingAssessmentId] = useState<string | null>(null)
  const [showAssessmentForm, setShowAssessmentForm] = useState(false)
  const avaliacaoRef = useRef<HTMLDivElement>(null)

  // Recém-criado: rola até o card da avaliação, próximo passo natural
  useEffect(() => {
    if (recemCriado && !loading) {
      avaliacaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [recemCriado, loading])

  useEffect(() => {
    api.get<any>('/auth/departments/?page_size=500&ordering=nome').then((res: any) => {
      const items = res?.results ?? res ?? []
      setApiDepartamentos(items.map((d: any) => ({ id: d.id, nome: d.nome })))
    }).catch(() => {})
    fetchCargos()
  }, [fetchCargos])

  const nomeDoSetor = new Map(apiDepartamentos.map(d => [d.id, d.nome]))

  // Com setores marcados, só os cargos desses setores fazem sentido no público-alvo
  const cargosDisponiveis = apiCargos.filter(c =>
    (c.ativo || cargosAlvo.includes(c.id)) &&
    (departamentos.length === 0 || c.setores.some(s => departamentos.includes(s)))
  )

  // Lista de cargos agrupada por setor: um cargo de vários setores aparece em cada grupo
  const cargoOptions = cargosDisponiveis
    .flatMap(c => {
      const setoresDoCargo = departamentos.length > 0
        ? c.setores.filter(s => departamentos.includes(s))
        : c.setores
      if (setoresDoCargo.length === 0) return [{ value: c.id, label: c.nome, group: 'Sem setor' }]
      return setoresDoCargo.map(s => ({ value: c.id, label: c.nome, group: nomeDoSetor.get(s) ?? 'Sem setor' }))
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))

  const setoresSelecionados = apiDepartamentos.filter(d => departamentos.includes(d.id))
  const cargosSelecionados = apiCargos.filter(c => cargosAlvo.includes(c.id))

  function resumoPublico() {
    const nomesSetores = setoresSelecionados.map(s => s.nome).join(', ')
    if (departamentos.length === 0 && cargosAlvo.length === 0) {
      return 'Nenhum setor ou cargo selecionado: a trilha só aparece para quem for atribuído diretamente.'
    }
    if (cargosAlvo.length === 0) return `Todos os colaboradores de ${nomesSetores}.`
    if (departamentos.length === 0) return 'Colaboradores com os cargos abaixo, em qualquer setor.'
    return `Colaboradores de ${nomesSetores} que tenham um dos cargos abaixo.`
  }

  function alterarSetoresAlvo(novos: string[]) {
    setDepartamentos(novos)
    // Remove cargos que ficaram fora dos setores escolhidos
    if (novos.length > 0) {
      setCargosAlvo(prev => prev.filter(cid => {
        const cargo = apiCargos.find(c => c.id === cid)
        return !cargo || cargo.setores.some(s => novos.includes(s))
      }))
    }
  }

  useEffect(() => {
    if (cursoId) {
      loadCurso()
    }
  }, [cursoId])

  async function loadCurso() {
    if (!cursoId) return
    setLoading(true)
    try {
      const data = await api.get<any>(`/courses/${cursoId}/`)
      setForm({
        titulo: data.titulo ?? '',
        descricao: data.descricao ?? '',
        cargaHoraria: data.carga_horaria ?? 8,
        categoria: data.categoria ?? 'Segurança',
        obrigatorio: data.obrigatorio ?? false,
        prazo: data.prazo ?? '',
        publicado: data.publicado ?? false,
        driveFolderId: data.drive_folder_id ?? '',
        modalidade: data.modalidade ?? 'interno',
      })
      setExistingAssessmentId(data.avaliacao?.id ? String(data.avaliacao.id) : null)
      setDepartamentos(data.departamentos_alvo ?? [])
      setCargosAlvo(data.cargos_alvo ?? [])
      if (data.modulos && data.modulos.length > 0) {
        setModulos(data.modulos.map((m: any) => ({
          id: m.id,
          titulo: m.titulo,
          aulas: m.aulas.map((a: any) => ({
            id: a.id,
            titulo: a.titulo,
            tipo: a.tipo,
            conteudo: a.conteudo ?? '',
            duracao: a.duracao ?? 15,
          }))
        })))
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro ao carregar trilha')
      onBack()
    } finally {
      setLoading(false)
    }
  }

  function addModulo() {
    setModulos(prev => [...prev, { id: Date.now().toString(), titulo: `Módulo ${prev.length + 1}`, aulas: [] }])
  }

  function addAula(moduloId: string) {
    setModulos(prev => prev.map(m => m.id === moduloId
      ? { ...m, aulas: [...m.aulas, { id: Date.now().toString(), titulo: '', tipo: 'video', conteudo: '', duracao: 15, arquivo: null as File | null }] }
      : m
    ))
  }

  function removeModulo(id: string) {
    setModulos(prev => prev.filter(m => m.id !== id))
  }

  async function handleSave(publish = false) {
    if (!form.titulo.trim()) {
      toast.error('O título da trilha é obrigatório.')
      return
    }
    setSaving(true)
    try {
      // Upload arquivos e obter URLs
      const modulosComUrls = await Promise.all(modulos.map(async (m, mi) => {
        const aulasComUrls = await Promise.all(m.aulas.map(async (a, ai) => {
          let conteudoFinal = a.conteudo

          // Normaliza link do Drive: se for só ID, constrói URL completa
          if (a.tipo === 'drive' && conteudoFinal && !conteudoFinal.startsWith('http')) {
            conteudoFinal = `https://drive.google.com/file/d/${conteudoFinal.trim()}/view`
          }

          // Se tem arquivo, fazer upload
          if (a.arquivo && ['video', 'pdf', 'imagem', 'excel'].includes(a.tipo)) {
            try {
              const formData = new FormData()
              formData.append('files', a.arquivo)
              formData.append('tipo', a.tipo)
              
              const uploadRes = await api.upload<{ url: string; arquivo: string; nome: string; tipo: string; tamanho: number }>('/courses/upload-lesson-file/', formData)
              
              conteudoFinal = uploadRes.url || uploadRes.arquivo
            } catch (uploadErr: any) {
              toast.error(`Erro ao fazer upload do arquivo da aula "${a.titulo}": ${uploadErr.message}`)
              throw uploadErr
            }
          }
          
          return {
            titulo: a.titulo,
            descricao: '',
            tipo: a.tipo,
            conteudo: conteudoFinal,
            duracao: a.duracao,
            ordem: ai,
          }
        }))
        
        return {
          titulo: m.titulo,
          descricao: '',
          ordem: mi,
          aulas: aulasComUrls,
        }
      }))
      
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        carga_horaria: form.cargaHoraria,
        categoria: form.categoria,
        obrigatorio: form.obrigatorio,
        prazo: form.prazo || null,
        publicado: publish,
        drive_folder_id: form.driveFolderId || null,
        modalidade: form.modalidade,
        departamentos_alvo: departamentos,
        cargos_alvo: cargosAlvo,
        tags: [],
        modulos: modulosComUrls,
      }
      
      if (cursoId) {
        await api.patch(`/courses/${cursoId}/`, payload)
        toast.success('Trilha atualizada com sucesso!')
      } else {
        const criado = await api.post<any>('/courses/', payload)
        toast.success(publish ? 'Trilha publicada com sucesso!' : 'Trilha salva como rascunho!')
        // Leva quem criou para dentro do curso, para concluir avaliação e demais etapas
        if (onCreated && criado?.id) {
          onCreated(String(criado.id))
          return
        }
      }
      onBack()
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar trilha.')
    } finally {
      setSaving(false)
    }
  }

  if (showAssessmentForm) {
    return (
      <AssessmentForm
        assessmentId={existingAssessmentId}
        prefilledCursoId={cursoId}
        onBack={() => { setShowAssessmentForm(false); loadCurso() }}
      />
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Carregando trilha...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{cursoId ? 'Editar Trilha' : 'Criar Nova Trilha'}</h2>
          <p className="text-sm text-muted-foreground">Preencha as informações do treinamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" /> Salvar Rascunho
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <Eye className="w-4 h-4 mr-1.5" /> Publicar
          </Button>
        </div>
      </div>

      {/* Próximos passos logo após criar o curso */}
      {recemCriado && cursoId && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Trilha criada! Agora conclua a configuração.</p>
            <p className="mt-0.5 text-muted-foreground">
              {existingAssessmentId
                ? 'A avaliação já foi cadastrada. Revise as aulas e salve quando terminar.'
                : 'Crie a avaliação final da trilha e revise as aulas antes de liberar para os colaboradores.'}
            </p>
          </div>
          {!existingAssessmentId && (
            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setShowAssessmentForm(true)}>
              <ClipboardList className="w-3.5 h-3.5" /> Criar avaliação
            </Button>
          )}
        </div>
      )}

      {/* Informações gerais */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Título da Trilha *</Label>
              <Input
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: Segurança em Operações de Campo"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Descreva os objetivos e conteúdo da trilha..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Carga Horária (h)</Label>
              <Input
                type="number"
                value={form.cargaHoraria}
                onChange={e => setForm(p => ({ ...p, cargaHoraria: Number(e.target.value) }))}
                className="mt-1"
                min={1}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Segurança', 'Manutenção', 'Liderança', 'Qualidade', 'Técnico', 'Compliance'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.prazo}
                onChange={e => setForm(p => ({ ...p, prazo: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={form.obrigatorio} onCheckedChange={v => setForm(p => ({ ...p, obrigatorio: v }))} id="obrigatorio" />
              <Label htmlFor="obrigatorio" className="cursor-pointer">Trilha Obrigatória</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Modalidade</Label>
              <Select value={form.modalidade} onValueChange={v => setForm(p => ({ ...p, modalidade: v }))}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Público-alvo: setores e cargos */}
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Setores Alvo</Label>
                <SearchableMultiSelect
                  values={departamentos}
                  onValuesChange={alterarSetoresAlvo}
                  options={apiDepartamentos.map(d => ({ value: d.id, label: d.nome }))}
                  placeholder="Selecionar setores"
                  searchPlaceholder="Buscar setor..."
                  emptyText="Nenhum setor encontrado."
                  selectedText={n => `${n} setor${n !== 1 ? 'es' : ''} selecionado${n !== 1 ? 's' : ''}`}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Cargos Alvo</Label>
                <SearchableMultiSelect
                  values={cargosAlvo}
                  onValuesChange={setCargosAlvo}
                  options={cargoOptions}
                  placeholder={departamentos.length > 0 ? 'Todos os cargos dos setores' : 'Selecionar cargos'}
                  searchPlaceholder="Buscar cargo ou setor..."
                  emptyText="Nenhum cargo encontrado."
                  selectedText={n => `${n} cargo${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}`}
                />
              </div>
            </div>

            {/* Resumo de quem recebe o curso */}
            <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quem recebe esta trilha
              </p>
              <p className="mt-1">{resumoPublico()}</p>

              {(setoresSelecionados.length > 0 || cargosSelecionados.length > 0) && (
                <ul className="mt-2 divide-y divide-border/60 border-t border-border/60">
                  {setoresSelecionados.map(s => (
                    <li key={s.id} className="flex items-center gap-2 py-1.5">
                      <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">Setor</span>
                      <span className="flex-1 truncate font-medium">{s.nome}</span>
                      <button
                        type="button"
                        onClick={() => alterarSetoresAlvo(departamentos.filter(id => id !== s.id))}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remover setor ${s.nome}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                  {cargosSelecionados.map(c => {
                    const setoresDoCargo = departamentos.length > 0
                      ? c.setores.filter(s => departamentos.includes(s)).map(s => nomeDoSetor.get(s) ?? '')
                      : c.setores_nomes
                    return (
                      <li key={c.id} className="flex items-center gap-2 py-1.5">
                        <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">Cargo</span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{c.nome}</span>
                          <span className="text-muted-foreground">
                            {' — '}{setoresDoCargo.length > 0 ? setoresDoCargo.join(', ') : 'sem setor'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setCargosAlvo(prev => prev.filter(id => id !== c.id))}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remover cargo ${c.nome}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Google Drive */}
          <div>
            <Label>ID da Pasta do Google Drive</Label>
            <Input
              value={form.driveFolderId}
              onChange={e => setForm(p => ({ ...p, driveFolderId: e.target.value }))}
              placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="mt-1 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Você pode sincronizar arquivos do Drive
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Avaliação — só em modo edição */}
      {cursoId && (
        <Card
          ref={avaliacaoRef}
          className={recemCriado && !existingAssessmentId ? 'border-primary/50 ring-2 ring-primary/20' : undefined}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Avaliação Final</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {existingAssessmentId ? 'Esta trilha já possui uma avaliação.' : 'Nenhuma avaliação cadastrada para esta trilha.'}
                </p>
              </div>
              <Button
                variant={existingAssessmentId ? 'outline' : 'default'}
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAssessmentForm(true)}
              >
                {existingAssessmentId
                  ? <><PencilLine className="w-3.5 h-3.5" /> Editar Avaliação</>
                  : <><ClipboardList className="w-3.5 h-3.5" /> Nova Avaliação</>
                }
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Módulos */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Módulos e Aulas</CardTitle>
            <Button variant="outline" size="sm" onClick={addModulo} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Adicionar Módulo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {modulos.map((modulo, mi) => (
            <div key={modulo.id} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                  Módulo {mi + 1}
                </Badge>
                <Input
                  value={modulo.titulo}
                  onChange={e => setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, titulo: e.target.value } : m))}
                  placeholder="Título do módulo"
                  className="flex-1 h-8 text-sm"
                />
                <Button variant="ghost" size="sm" onClick={() => removeModulo(modulo.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {modulo.aulas.map((aula, ai) => (
                <div key={aula.id} className="pl-4 space-y-1">
                  {/* Row 1: index · título · tipo · duração · remover */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{ai + 1}.</span>
                    <Input
                      value={aula.titulo}
                      onChange={e => setModulos(prev => prev.map(m =>
                        m.id === modulo.id
                          ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, titulo: e.target.value } : a) }
                          : m
                      ))}
                      placeholder="Título da aula"
                      className="flex-1 h-8 text-xs"
                    />
                    <Select
                      value={aula.tipo}
                      onValueChange={v => setModulos(prev => prev.map(m =>
                        m.id === modulo.id
                          ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, tipo: v } : a) }
                          : m
                      ))}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="texto">Texto</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="drive">Drive</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={aula.duracao}
                      onChange={e => setModulos(prev => prev.map(m =>
                        m.id === modulo.id
                          ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, duracao: Number(e.target.value) } : a) }
                          : m
                      ))}
                      className="w-20 h-8 text-xs"
                      placeholder="min"
                      min={1}
                    />
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setModulos(prev => prev.map(m =>
                        m.id === modulo.id ? { ...m, aulas: m.aulas.filter(a => a.id !== aula.id) } : m
                      ))}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {/* Row 2: conteúdo (arquivo/URL / texto / drive) */}
                  {aula.tipo === 'texto' ? (
                    <Textarea
                      value={aula.conteudo}
                      onChange={e => setModulos(prev => prev.map(m =>
                        m.id === modulo.id
                          ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, conteudo: e.target.value } : a) }
                          : m
                      ))}
                      placeholder="Conteúdo textual da aula..."
                      className="ml-5 text-xs min-h-[60px] resize-none"
                    />
                  ) : aula.tipo === 'drive' ? (
                    <Input
                      value={aula.conteudo}
                      onChange={e => setModulos(prev => prev.map(m =>
                        m.id === modulo.id
                          ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, conteudo: e.target.value } : a) }
                          : m
                      ))}
                      placeholder="Cole o link do Google Drive (ex.: https://drive.google.com/file/d/…)"
                      className="ml-5 h-8 text-xs"
                    />
                  ) : (
                    <div className="ml-5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="flex-1">
                          <Input
                            type="file"
                            accept={{
                              video: 'video/*',
                              pdf: 'application/pdf',
                              imagem: 'image/*',
                              excel: '.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            }[aula.tipo] ?? '*'}
                            onChange={e => {
                              const file = e.target.files?.[0] || null
                              setModulos(prev => prev.map(m =>
                                m.id === modulo.id
                                  ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, arquivo: file, conteudo: file ? file.name : '' } : a) }
                                  : m
                              ))
                            }}
                            className="h-8 text-xs cursor-pointer"
                          />
                        </label>
                        {aula.arquivo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setModulos(prev => prev.map(m =>
                              m.id === modulo.id
                                ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, arquivo: null, conteudo: '' } : a) }
                                : m
                            ))}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {aula.arquivo && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <File className="w-3 h-3" />
                          <span>{aula.arquivo.name}</span>
                          <span className="text-[10px]">({(aula.arquivo.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      )}
                      <Input
                        value={aula.arquivo ? '' : aula.conteudo}
                        onChange={e => setModulos(prev => prev.map(m =>
                          m.id === modulo.id
                            ? { ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, conteudo: e.target.value } : a) }
                            : m
                        ))}
                        placeholder={aula.arquivo ? 'Arquivo selecionado' : ({
                          video: 'Ou insira URL do vídeo (YouTube, Vimeo…)',
                          pdf: 'Ou insira URL do arquivo PDF',
                          imagem: 'Ou insira URL da imagem',
                          excel: 'Ou insira URL do arquivo Excel',
                        }[aula.tipo] ?? 'Ou insira URL do conteúdo')}
                        disabled={!!aula.arquivo}
                        className="h-7 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}

              <Button variant="ghost" size="sm" onClick={() => addAula(modulo.id)} className="ml-4 gap-1 text-xs text-muted-foreground">
                <Plus className="w-3 h-3" /> Adicionar Aula
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>


    </div>
  )
}
