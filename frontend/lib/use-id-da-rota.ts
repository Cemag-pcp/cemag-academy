'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * ID da rota dinâmica lido da URL do navegador (último trecho do caminho).
 *
 * No site estático só existe a página "molde" (/cursos/_/), e o Render serve ela para
 * qualquer /cursos/<id>; por isso o ID vem de window.location, não dos params do Next
 * (que seriam "_"). Em `next dev` funciona igual.
 */
export function useIdDaRota(): string | null {
  const pathname = usePathname()
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    const partes = window.location.pathname.split('/').filter(Boolean)
    const ultimo = partes[partes.length - 1]
    setId(ultimo && ultimo !== '_' ? decodeURIComponent(ultimo) : null)
  }, [pathname])

  return id
}
