import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
        <GraduationCap className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-5xl font-bold text-foreground">404</h1>
      <p className="text-lg font-medium text-foreground mt-3">Página não encontrada</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  )
}
