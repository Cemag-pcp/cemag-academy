'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redireciona no navegador (o site estático não tem servidor para redirecionar)
export default function CadastrosPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/cadastros/cargos') }, [router])
  return null
}
