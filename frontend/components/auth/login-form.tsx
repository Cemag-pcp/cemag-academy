'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, GraduationCap, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

export function LoginForm() {
  const [matricula, setMatricula] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(matricula, password)
      toast.success('Bem-vindo à plataforma CEMAG!')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Painel esquerdo — visual */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-sidebar p-12">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-sidebar-foreground">CEMAG</p>
            <p className="text-xs text-sidebar-foreground/50 uppercase tracking-widest">Treinamentos</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight text-balance">
              Capacitando pessoas,<br />
              <span className="text-primary">fortalecendo resultados.</span>
            </h2>
            <p className="mt-4 text-sidebar-foreground/60 text-base leading-relaxed">
              A plataforma oficial de treinamento corporativo da CEMAG. Gerencie trilhas, acompanhe o desempenho da equipe e emita certificados com total controle.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Colaboradores', value: '234' },
              { label: 'Trilhas Ativas', value: '18' },
              { label: 'Certificados Emitidos', value: '312' },
              { label: 'Taxa de Conclusão', value: '67%' },
            ].map(stat => (
              <div key={stat.label} className="bg-sidebar-accent rounded-xl p-4">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-sidebar-foreground/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30">
          © 2025 CEMAG Indústria e Comércio de Máquinas Agrícolas
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold">CEMAG Treinamentos</p>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Entrar na plataforma</h1>
            <p className="text-sm text-muted-foreground mt-1">Use suas credenciais corporativas para acessar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                type="text"
                value={matricula}
                onChange={e => setMatricula(e.target.value)}
                placeholder="Ex: 00123"
                required
                autoComplete="username"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button type="button" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
              ) : (
                <>Entrar <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

        </div>
      </div>
    </div>
  )
}
