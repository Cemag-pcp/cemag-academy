'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from './api'

export interface QuestionOption {
  id?: string
  texto: string
  correta: boolean
}

export interface Question {
  id?: string
  texto: string
  tipo: 'aberta' | 'multipla_escolha'
  resposta_correta?: string
  peso: number
  opcoes?: QuestionOption[]
}

export interface Assessment {
  id: string
  titulo: string
  nota_minima_aprovacao: number
  tentativas_permitidas: number
  questoes: Question[]
  curso_id?: string | null
  criado_por_id?: string | null
}

export interface AssessmentFormData {
  titulo: string
  nota_minima_aprovacao: number
  tentativas_permitidas: number
  questoes: Question[]
  curso_id?: string
}

export interface CourseSimple {
  id: string
  titulo: string
}

function mapAssessment(raw: any): Assessment {
  return {
    id: String(raw.id),
    titulo: raw.titulo ?? '',
    nota_minima_aprovacao: raw.nota_minima_aprovacao ?? 7.0,
    tentativas_permitidas: raw.tentativas_permitidas ?? 3,
    curso_id: raw.curso_id ?? null,
    criado_por_id: raw.criado_por_id ?? null,
    questoes: (raw.questoes ?? []).map((q: any) => ({
      id: q.id ? String(q.id) : undefined,
      texto: q.texto ?? '',
      tipo: q.tipo ?? 'aberta',
      resposta_correta: q.resposta_correta ?? '',
      peso: q.peso ?? 1,
      opcoes: (q.opcoes ?? []).map((o: any) => ({
        id: o.id ? String(o.id) : undefined,
        texto: o.texto ?? '',
        correta: o.correta ?? false,
      })),
    })),
  }
}

export function useAssessments() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<any>('/courses/assessments/')
      const all: any[] = res?.results ?? res ?? []
      setAssessments(all.map(mapAssessment))
    } catch {
      setAssessments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createAssessment(data: AssessmentFormData): Promise<Assessment> {
    const res = await api.post('/courses/assessments/', data)
    await load()
    return mapAssessment(res)
  }

  async function updateAssessment(id: string, data: AssessmentFormData): Promise<Assessment> {
    const res = await api.patch(`/courses/assessments/${id}/`, data)
    await load()
    return mapAssessment(res)
  }

  async function deleteAssessment(id: string): Promise<void> {
    await api.delete(`/courses/assessments/${id}/`)
    await load()
  }

  async function getAssessment(id: string): Promise<Assessment> {
    const res = await api.get(`/courses/assessments/${id}/`)
    return mapAssessment(res)
  }

  async function getCourses(): Promise<CourseSimple[]> {
    const res = await api.get<any>('/courses/?page_size=1000')
    const all: any[] = res?.results ?? res ?? []
    return all.map((c: any) => ({
      id: String(c.id),
      titulo: c.titulo ?? '',
    }))
  }

  return {
    assessments,
    loading,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    getAssessment,
    getCourses,
    reload: load,
  }
}
