'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redireciona no navegador (o site estático não tem servidor para redirecionar)
export default function Home() {
  const router = useRouter()
  useEffect(() => { router.replace('/login') }, [router])
  return null
}
