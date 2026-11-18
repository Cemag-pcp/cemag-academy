'use client'

import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Título exibido no canto superior esquerdo (Topbar).
 * Por padrão vem da rota (ver `tituloDaRota` no topbar); páginas dinâmicas,
 * como o detalhe do curso, podem sobrescrever com `usePageTitle`.
 */
interface PageTitleContextValue {
  titulo: string | null
  setTitulo: (titulo: string | null) => void
}

const PageTitleContext = createContext<PageTitleContextValue>({
  titulo: null,
  setTitulo: () => {},
})

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [titulo, setTitulo] = useState<string | null>(null)
  return (
    <PageTitleContext.Provider value={{ titulo, setTitulo }}>
      {children}
    </PageTitleContext.Provider>
  )
}

export function usePageTitleValue() {
  return useContext(PageTitleContext).titulo
}

/** Define o título da página enquanto o componente estiver montado. */
export function usePageTitle(titulo: string | null | undefined) {
  const { setTitulo } = useContext(PageTitleContext)
  useEffect(() => {
    if (!titulo) return
    setTitulo(titulo)
    return () => setTitulo(null)
  }, [titulo, setTitulo])
}
