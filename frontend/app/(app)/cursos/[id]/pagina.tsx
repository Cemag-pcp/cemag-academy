'use client'

import { useRouter } from 'next/navigation'
import { CursoDetail } from '@/components/cursos/curso-detail'
import { useIdDaRota } from '@/lib/use-id-da-rota'

export default function CursoDetailPagina() {
  const router = useRouter()
  const id = useIdDaRota()

  if (!id) return null

  return <CursoDetail cursoId={id} onBack={() => router.push('/cursos')} />
}
