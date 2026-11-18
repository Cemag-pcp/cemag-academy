'use client'

import { ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'

interface CadastroPageProps {
  titulo: string
  descricao: string
  children: React.ReactNode
}

export function CadastroPage({ titulo, descricao, children }: CadastroPageProps) {
  const { user } = useAuth()

  if (!user) return null

  if (user.role !== 'rh') {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <ShieldAlert className="w-8 h-8" />
          <p className="text-sm">Somente o RH tem acesso aos cadastros.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* O nome da página já aparece no topo (Topbar) */}
      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
