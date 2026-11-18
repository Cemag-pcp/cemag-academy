'use client'

import { useParams, useRouter } from 'next/navigation'
import { CursoDetail } from '@/components/cursos/curso-detail'

export default function CursoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id as string

  if (!id) return null

  return <CursoDetail cursoId={id} onBack={() => router.push('/cursos')} />
}
