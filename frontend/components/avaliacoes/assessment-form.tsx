'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useAssessments, type Question, type QuestionOption, type CourseSimple } from '@/lib/use-assessments'
import { cn } from '@/lib/utils'

const NOTA_MAXIMA = 10

interface AssessmentFormProps {
  assessmentId?: string | null
  prefilledCursoId?: string | null
  onBack: () => void
}

export function AssessmentForm({ assessmentId, prefilledCursoId, onBack }: AssessmentFormProps) {
  const { createAssessment, updateAssessment, getAssessment, getCourses } = useAssessments()

  const [titulo, setTitulo] = useState('')
  const [cursoId, setCursoId] = useState<string>(prefilledCursoId ?? '')
  const [notaMinima, setNotaMinima] = useState(7.0)
  const [tentativas, setTentativas] = useState(3)
  const [questoes, setQuestoes] = useState<Question[]>([])
  const [cursos, setCursos] = useState<CourseSimple[]>([])
  const [loading, setLoading] = useState(!!assessmentId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCursos()
    if (assessmentId) {
      loadAssessment()
    }
  }, [assessmentId])

  async function loadCursos() {
    try {
      const data = await getCourses()
      setCursos(data)
    } catch {
      toast.error('Erro ao carregar trilhas')
    }
  }

  async function loadAssessment() {
    if (!assessmentId) return
    setLoading(true)
    try {
      const data = await getAssessment(assessmentId)
      setTitulo(data.titulo)
      setCursoId(data.curso_id || '')
      setNotaMinima(data.nota_minima_aprovacao)
      setTentativas(data.tentativas_permitidas)
      setQuestoes(data.questoes)
    } catch {
      toast.error('Erro ao carregar avaliação')
      onBack()
    } finally {
      setLoading(false)
    }
  }

  // Nota do colaborador = soma dos pontos acertados, numa escala de 0 a 10
  const totalPontos = Math.round(questoes.reduce((s, q) => s + (Number(q.peso) || 0), 0) * 100) / 100
  const pontosRestantes = Math.max(NOTA_MAXIMA - totalPontos, 0)

  function problemaPontuacao(): string | null {
    if (!(notaMinima >= 0 && notaMinima <= NOTA_MAXIMA)) return `A nota mínima deve ficar entre 0 e ${NOTA_MAXIMA}.`
    const fora = questoes.findIndex(q => !(q.peso >= 0 && q.peso <= NOTA_MAXIMA))
    if (fora >= 0) return `Questão ${fora + 1}: os pontos devem ficar entre 0 e ${NOTA_MAXIMA}.`
    if (questoes.length === 0) return null
    if (totalPontos > NOTA_MAXIMA) return `A soma dos pontos (${totalPontos}) passa de ${NOTA_MAXIMA}.`
    if (totalPontos < notaMinima) {
      return `A soma dos pontos (${totalPontos}) é menor que a nota mínima (${notaMinima}). Ninguém conseguiria ser aprovado.`
    }
    return null
  }

  function addQuestao() {
    const newQ: Question = {
      texto: '',
      tipo: 'aberta',
      peso: Math.min(1, pontosRestantes),
      resposta_correta: '',
      opcoes: [],
    }
    setQuestoes([...questoes, newQ])
  }

  function removeQuestao(index: number) {
    setQuestoes(questoes.filter((_, i) => i !== index))
  }

  function updateQuestao(index: number, updates: Partial<Question>) {
    setQuestoes(questoes.map((q, i) => i === index ? { ...q, ...updates } : q))
  }

  function addOpcao(qIndex: number) {
    const questao = questoes[qIndex]
    const newOpcoes = [...(questao.opcoes ?? []), { texto: '', correta: false }]
    updateQuestao(qIndex, { opcoes: newOpcoes })
  }

  function removeOpcao(qIndex: number, oIndex: number) {
    const questao = questoes[qIndex]
    const newOpcoes = (questao.opcoes ?? []).filter((_, i) => i !== oIndex)
    updateQuestao(qIndex, { opcoes: newOpcoes })
  }

  function updateOpcao(qIndex: number, oIndex: number, updates: Partial<QuestionOption>) {
    const questao = questoes[qIndex]
    const newOpcoes = (questao.opcoes ?? []).map((o, i) => 
      i === oIndex ? { ...o, ...updates } : o
    )
    updateQuestao(qIndex, { opcoes: newOpcoes })
  }

  async function handleSave() {
    if (!titulo.trim()) {
      toast.error('Informe o título da avaliação')
      return
    }
    if (!cursoId) {
      toast.error('Selecione a trilha')
      return
    }
    if (questoes.length === 0) {
      toast.error('Adicione pelo menos uma questão')
      return
    }

    // Validate questions
    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i]
      if (!q.texto.trim()) {
        toast.error(`Questão ${i + 1}: Informe o texto da questão`)
        return
      }
      if (q.tipo === 'multipla_escolha') {
        if (!q.opcoes || q.opcoes.length < 2) {
          toast.error(`Questão ${i + 1}: Adicione pelo menos 2 opções`)
          return
        }
        const hasCorrect = q.opcoes.some(o => o.correta)
        if (!hasCorrect) {
          toast.error(`Questão ${i + 1}: Marque pelo menos uma opção como correta`)
          return
        }
      }
    }

    const problema = problemaPontuacao()
    if (problema) {
      toast.error(problema)
      return
    }

    setSaving(true)
    try {
      const data = {
        titulo,
        curso_id: cursoId,
        nota_minima_aprovacao: notaMinima,
        tentativas_permitidas: tentativas,
        questoes: questoes.map(q => ({
          texto: q.texto,
          tipo: q.tipo,
          peso: q.peso,
          resposta_correta: q.resposta_correta ?? '',
          opcoes: (q.opcoes ?? []).map(o => ({
            texto: o.texto,
            correta: o.correta,
          })),
        })),
      }

      if (assessmentId) {
        await updateAssessment(assessmentId, data)
        toast.success('Avaliação atualizada com sucesso!')
      } else {
        await createAssessment(data)
        toast.success('Avaliação criada com sucesso!')
      }
      onBack()
    } catch (err: any) {
      const detalhe = err?.body?.questoes ?? err?.body?.nota_minima_aprovacao
      toast.error((Array.isArray(detalhe) ? detalhe[0] : detalhe) ?? err?.message ?? 'Erro ao salvar avaliação')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            {assessmentId ? 'Editar Avaliação' : 'Nova Avaliação'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure o título, nota mínima e questões da avaliação
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Avaliação *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Avaliação Final - Segurança do Trabalho"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="curso">Trilha *</Label>
            <Select value={cursoId} onValueChange={setCursoId} disabled={!!prefilledCursoId}>
              <SelectTrigger id="curso">
                <SelectValue placeholder="Selecione a trilha" />
              </SelectTrigger>
              <SelectContent>
                {cursos.map((curso) => (
                  <SelectItem key={curso.id} value={curso.id}>
                    {curso.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nota-minima">Nota Mínima para Aprovação * <span className="text-xs font-normal text-muted-foreground">(0 a 10)</span></Label>
              <Input
                id="nota-minima"
                type="number"
                min="0"
                max={NOTA_MAXIMA}
                step="0.5"
                value={notaMinima}
                onChange={(e) => setNotaMinima(Number(e.target.value))}
                aria-invalid={!(notaMinima >= 0 && notaMinima <= NOTA_MAXIMA)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tentativas">Tentativas Permitidas *</Label>
              <Input
                id="tentativas"
                type="number"
                min="1"
                max="10"
                value={tentativas}
                onChange={(e) => setTentativas(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Questões</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione questões abertas ou de múltipla escolha
              </p>
            </div>
            <Button onClick={addQuestao} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Questão
            </Button>
          </div>

          {/* Placar: pontos distribuídos x nota mínima */}
          {(() => {
            const problema = questoes.length > 0 ? problemaPontuacao() : null
            const ok = questoes.length > 0 && !problema
            return (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Pontos distribuídos: <strong className="text-foreground">{totalPontos}</strong> de {NOTA_MAXIMA}
                    {' · '}nota mínima: <strong className="text-foreground">{notaMinima}</strong>
                  </span>
                  {questoes.length > 0 && pontosRestantes > 0 && !problema && (
                    <span className="text-muted-foreground">{pontosRestantes} ponto(s) livre(s)</span>
                  )}
                </div>
                <div className="relative h-2 rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      problema ? 'bg-destructive' : ok ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                    )}
                    style={{ width: `${Math.min(totalPontos / NOTA_MAXIMA, 1) * 100}%` }}
                  />
                  {/* Marca da nota mínima */}
                  <div
                    className="absolute -top-0.5 h-3 w-0.5 rounded bg-foreground/70"
                    style={{ left: `calc(${Math.min(Math.max(notaMinima / NOTA_MAXIMA, 0), 1) * 100}% - 1px)` }}
                    title={`Nota mínima: ${notaMinima}`}
                  />
                </div>
                {problema ? (
                  <p className="text-xs text-destructive">{problema}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    A nota do colaborador é a soma dos pontos das questões que ele acertar.
                  </p>
                )}
              </div>
            )
          })()}
        </CardHeader>
        <CardContent className="space-y-4">
          {questoes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma questão adicionada. Clique em "Adicionar Questão" para começar.
            </div>
          ) : (
            questoes.map((questao, qIndex) => (
              <Card key={qIndex} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Questão {qIndex + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestao(qIndex)}
                      className="text-destructive hover:text-destructive h-8 gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Texto da Questão *</Label>
                    <Textarea
                      value={questao.texto}
                      onChange={(e) => updateQuestao(qIndex, { texto: e.target.value })}
                      placeholder="Digite a pergunta..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo de Questão</Label>
                      <Select
                        value={questao.tipo}
                        onValueChange={(v) => updateQuestao(qIndex, { 
                          tipo: v as 'aberta' | 'multipla_escolha',
                          opcoes: v === 'multipla_escolha' ? (questao.opcoes ?? []) : []
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aberta">Aberta</SelectItem>
                          <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pontos <span className="text-xs font-normal text-muted-foreground">(0 a 10)</span></Label>
                      <Input
                        type="number"
                        min="0"
                        max={NOTA_MAXIMA}
                        step="0.5"
                        value={questao.peso}
                        onChange={(e) => updateQuestao(qIndex, { peso: Number(e.target.value) })}
                        aria-invalid={!(questao.peso >= 0 && questao.peso <= NOTA_MAXIMA)}
                      />
                    </div>
                  </div>

                  {questao.tipo === 'multipla_escolha' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <Label>Opções de Resposta</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOpcao(qIndex)}
                          className="h-7 gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Opção
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(questao.opcoes ?? []).map((opcao, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                            <Switch
                              checked={opcao.correta}
                              onCheckedChange={(checked) => updateOpcao(qIndex, oIndex, { correta: checked })}
                            />
                            <Input
                              value={opcao.texto}
                              onChange={(e) => updateOpcao(qIndex, oIndex, { texto: e.target.value })}
                              placeholder={`Opção ${oIndex + 1}`}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => removeOpcao(qIndex, oIndex)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Marque o switch para indicar a(s) opção(ões) correta(s)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
