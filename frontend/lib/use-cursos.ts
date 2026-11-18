'use client'

/**
 * CEMAG Academy — Hooks para Cursos
 *
 * Integra os endpoints:
 *  - GET  /courses/                       lista de cursos
 *  - GET  /courses/:id/                   detalhe do curso
 *  - GET  /courses/:id/discussions/       discussões de um curso
 *  - POST /courses/discussions/           nova discussão
 *  - GET  /progress/?curso=:id            progresso do usuário naquele curso
 *  - POST /progress/                      iniciar progresso
 *  - POST /progress/:id/complete-lesson/  marcar aula concluída
 *  - POST /progress/:id/submit-assessment/ enviar avaliação
 */

import { useState, useEffect } from 'react'
import { api } from './api'
import type { Course, CourseProgress, Module, Lesson, Assessment, Question, Discussion } from './types'

// ── Helpers de paginação DRF ───────────────────────────────────────────────────

type PagedResponse<T> = { count: number; results: T[] }

async function getAll<T>(path: string): Promise<T[]> {
  const res = await api.get<PagedResponse<T> | T[]>(path)
  if (res && typeof res === 'object' && 'results' in (res as object)) {
    return (res as PagedResponse<T>).results
  }
  return res as T[]
}

// ── Mapping helpers (snake_case → camelCase) ───────────────────────────────────

function mapLesson(raw: any): Lesson {
  return {
    id: raw.id,
    titulo: raw.titulo,
    descricao: raw.descricao ?? '',
    tipo: raw.tipo,
    conteudo: raw.conteudo ?? '',
    duracao: raw.duracao ?? 0,
    ordem: raw.ordem ?? 0,
  }
}

function mapModule(raw: any): Module {
  return {
    id: raw.id,
    titulo: raw.titulo,
    descricao: raw.descricao ?? '',
    aulas: (raw.aulas ?? []).map(mapLesson),
    ordem: raw.ordem ?? 0,
  }
}

function mapAssessment(raw: any): Assessment {
  return {
    id: raw.id,
    titulo: raw.titulo,
    questoes: (raw.questoes ?? []).map((q: any): Question => ({
      id: q.id,
      texto: q.texto,
      tipo: q.tipo,
      opcoes: q.opcoes?.map((o: any) => ({ id: o.id, texto: o.texto, correta: o.correta })),
      respostaCorreta: q.resposta_correta,
      peso: q.peso,
    })),
    notaMinimaAprovacao: raw.nota_minima_aprovacao,
    tentativasPermitidas: raw.tentativas_permitidas,
  }
}

export function mapCourse(raw: any): Course {
  return {
    id: raw.id,
    titulo: raw.titulo,
    descricao: raw.descricao ?? '',
    thumbnail: raw.thumbnail ?? '',
    cargaHoraria: raw.carga_horaria,
    modulos: (raw.modulos ?? []).map(mapModule),
    avaliacao: raw.avaliacao ? mapAssessment(raw.avaliacao) : undefined,
    obrigatorio: raw.obrigatorio,
    prazo: raw.prazo ?? undefined,
    departamentosAlvo: raw.departamentos_alvo ?? [],
    cargosAlvo: raw.cargos_alvo ?? [],
    rolesAlvo: raw.roles_alvo ?? [],
    colaboradoresAlvo: raw.colaboradores_alvo ?? [],
    versao: raw.versao ?? 1,
    publicado: raw.publicado,
    criadoPor: raw.criado_por_id ?? raw.criado_por ?? '',
    criadoPorNome: raw.criado_por_nome ?? '',
    temAvaliacao: raw.tem_avaliacao ?? false,
    criadoEm: raw.criado_em ?? '',
    categoria: raw.categoria,
    tags: raw.tags ?? [],
    instrutor: raw.instrutor ?? undefined,
    totalInscritos: raw.total_inscritos ?? 0,
    mediaAvaliacao: raw.media_avaliacao ?? 0,
    totalAulas: raw.total_aulas ?? (raw.modulos ?? []).reduce(
      (acc: number, m: any) => acc + (m.aulas?.length ?? 0), 0
    ),
    driveFolderId: raw.drive_folder_id ?? '',
    driveLastSync: raw.drive_last_sync ?? null,
    driveFiles: raw.drive_files ?? [],
  }
}

export function mapProgress(raw: any): CourseProgress & { progressId: string } {
  return {
    progressId: raw.id,
    cursoId: raw.curso,
    colaboradorId: raw.colaborador,
    status: raw.status,
    percentual: Math.round(raw.percentual ?? 0),
    aulasCompletas: raw.aulas_completas ?? [],
    arquivosDriveCompletos: raw.arquivos_drive_completos ?? [],
    tempoGasto: raw.tempo_gasto ?? 0,
    notaAvaliacao: raw.nota_avaliacao ?? undefined,
    statusAvaliacao: raw.status_avaliacao ?? undefined,
    tentativasRealizadas: raw.tentativas_realizadas ?? 0,
    respostasAbertas: raw.respostas_abertas ?? [],
    feedbackGestor: raw.feedback_gestor ?? undefined,
    dataInicio: raw.data_inicio ?? undefined,
    dataConclusao: raw.data_conclusao ?? undefined,
    certificadoGerado: raw.certificado_gerado ?? false,
  }
}

export function mapDiscussion(raw: any): Discussion {
  return {
    id: raw.id,
    cursoId: raw.curso,
    autorId: raw.autor,
    autorNome: raw.autor_nome ?? '',
    autorAvatar: raw.autor_avatar ?? undefined,
    mensagem: raw.mensagem,
    respostas: (raw.respostas ?? []).map(mapDiscussion),
    criadaEm: raw.criada_em,
  }
}

// ── useCursos — lista de cursos + progresso do usuário ────────────────────────

export function useCursos() {
  const [cursos, setCursos] = useState<Course[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, CourseProgress & { progressId: string }>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [cursosRaw, progressRaw] = await Promise.all([
        getAll<any>('/courses/'),
        getAll<any>('/progress/'),
      ])
      setCursos(cursosRaw.map(mapCourse))
      const map: Record<string, CourseProgress & { progressId: string }> = {}
      progressRaw.forEach((p: any) => { map[p.curso] = mapProgress(p) })
      setProgressMap(map)
    } catch (e) {
      console.error('useCursos:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const getProgress = (cursoId: string) => progressMap[cursoId]
  
  async function togglePublicado(cursoId: string): Promise<void> {
    const curso = cursos.find(c => c.id === cursoId)
    if (!curso) return
    
    await api.patch(`/courses/${cursoId}/`, { 
      publicado: !curso.publicado 
    })
    
    // Update local state
    setCursos(cursos.map(c => 
      c.id === cursoId ? { ...c, publicado: !c.publicado } : c
    ))
  }
  
  return { cursos, progressMap, getProgress, loading, setCursos, togglePublicado, reload: load }
}

// ── useCursoDetail — detalhe + progresso + discussões + ações ─────────────────

export type ProgressFull = CourseProgress & { progressId: string }

const DISCUSSION_POLL_MS = 15_000

export function useCursoDetail(cursoId: string) {
  const [curso, setCurso] = useState<Course | null>(null)
  const [progresso, setProgresso] = useState<ProgressFull | null>(null)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)

  async function refreshDiscussions() {
    try {
      const discRaw = await api.get<any[]>(`/courses/${cursoId}/discussions/`).catch(() => [])
      setDiscussions((discRaw ?? []).map(mapDiscussion))
    } catch {
      // silencioso — não interrompe o uso
    }
  }

  useEffect(() => {
    if (!cursoId) return
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const [cursoRaw, progressRaw, discRaw] = await Promise.all([
          api.get<any>(`/courses/${cursoId}/`),
          getAll<any>(`/progress/?curso=${cursoId}`),
          api.get<any[]>(`/courses/${cursoId}/discussions/`).catch(() => []),
        ])
        if (cancelled) return
        setCurso(mapCourse(cursoRaw))
        if (progressRaw.length > 0) {
          setProgresso(mapProgress(progressRaw[0]))
        }
        setDiscussions((discRaw ?? []).map(mapDiscussion))
      } catch (e) {
        console.error('useCursoDetail:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    const pollId = setInterval(() => {
      if (!cancelled) refreshDiscussions()
    }, DISCUSSION_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(pollId)
    }
  }, [cursoId])

  async function ensureProgress(): Promise<ProgressFull | null> {
    if (progresso) return progresso
    try {
      const raw = await api.post<any>('/progress/', { curso: cursoId })
      const p = mapProgress(raw)
      setProgresso(p)
      return p
    } catch (e) {
      console.error('ensureProgress:', e)
      return null
    }
  }

  async function completeLesson(aulaId: string, tempoGasto = 0): Promise<ProgressFull | null> {
    const p = await ensureProgress()
    if (!p) return null
    try {
      const raw = await api.post<any>(`/progress/${p.progressId}/complete-lesson/`, {
        aula_id: aulaId,
        tempo_gasto: tempoGasto,
      })
      const updated = mapProgress(raw)
      setProgresso(updated)
      return updated
    } catch (e) {
      console.error('completeLesson:', e)
      return null
    }
  }

  async function uncompleteLesson(aulaId: string): Promise<ProgressFull | null> {
    const p = await ensureProgress()
    if (!p) return null
    try {
      const raw = await api.post<any>(`/progress/${p.progressId}/uncomplete-lesson/`, {
        aula_id: aulaId,
        tempo_gasto: 0,
      })
      const updated = mapProgress(raw)
      setProgresso(updated)
      return updated
    } catch (e) {
      console.error('uncompleteLesson:', e)
      return null
    }
  }

  async function submitAssessment(respostas: { questao_id: string; resposta?: string; opcoes_ids?: string[] }[]) {
    const p = await ensureProgress()
    if (!p) return null
    try {
      const raw = await api.post<any>(`/progress/${p.progressId}/submit-assessment/`, { respostas })
      const updated = mapProgress(raw)
      setProgresso(updated)
      return raw
    } catch (e: any) {
      console.error('submitAssessment:', e)
      throw e
    }
  }

  async function postDiscussion(mensagem: string): Promise<void> {
    try {
      await api.post<any>('/courses/discussions/', { curso: cursoId, mensagem })
      await refreshDiscussions()
    } catch (e) {
      console.error('postDiscussion:', e)
      throw e
    }
  }

  async function completeDriveFile(driveId: string): Promise<ProgressFull | null> {
    const p = await ensureProgress()
    if (!p) return null
    try {
      const raw = await api.post<any>(`/progress/${p.progressId}/complete-drive-file/`, { drive_id: driveId })
      const updated = mapProgress(raw)
      setProgresso(updated)
      return updated
    } catch (e) {
      console.error('completeDriveFile:', e)
      return null
    }
  }

  async function uncompleteDriveFile(driveId: string): Promise<ProgressFull | null> {
    const p = await ensureProgress()
    if (!p) return null
    try {
      const raw = await api.post<any>(`/progress/${p.progressId}/uncomplete-drive-file/`, { drive_id: driveId })
      const updated = mapProgress(raw)
      setProgresso(updated)
      return updated
    } catch (e) {
      console.error('uncompleteDriveFile:', e)
      return null
    }
  }

  return { curso, progresso, discussions, loading, completeLesson, uncompleteLesson, completeDriveFile, uncompleteDriveFile, submitAssessment, postDiscussion }
}
