'use client'

import { useState } from 'react'
import { Bell, BookOpen, AlertCircle, ClipboardList, Award, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth-context'
import { useNotificacoes } from '@/lib/use-notificacoes'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePageTitleValue } from '@/lib/page-title'
import type { Role } from '@/lib/types'

// Rota mais específica primeiro
const TITULOS_ROTA: [string, string][] = [
  ['/avaliacoes/revisar', 'Revisar avaliação'],
  ['/avaliacoes', 'Avaliações'],
  ['/cadastros/cargos', 'Cargos'],
  ['/cadastros/setores', 'Setores'],
  ['/cadastros', 'Cadastros'],
  ['/dashboard', 'Home'],
  ['/certificados', 'Certificados'],
  ['/biblioteca', 'Biblioteca'],
  ['/acervo', 'Documentação ISO'],
  ['/usuarios', 'Usuários'],
  ['/relatorios', 'Relatórios'],
  ['/auditoria', 'Logs de Auditoria'],
  ['/configuracoes', 'Configurações'],
]

function tituloDaRota(pathname: string, role: Role): string {
  if (pathname === '/cursos' || pathname.startsWith('/cursos/')) {
    return role === 'colaborador' ? 'Minhas Trilhas' : 'Gerenciar Trilhas'
  }
  const achado = TITULOS_ROTA.find(([rota]) => pathname === rota || pathname.startsWith(rota + '/'))
  return achado?.[1] ?? ''
}

export function Topbar({ title }: { title?: string }) {
  const { user } = useAuth()
  const { notificacoes, naoLidas, marcarComoLida } = useNotificacoes()
  const [notifOpen, setNotifOpen] = useState(false)
  const pathname = usePathname()
  const tituloPagina = usePageTitleValue()

  console.log('[Topbar] Notificações:', notificacoes.length, 'Não lidas:', naoLidas)

  if (!user) return null

  const notifIconMap: Record<string, React.ElementType> = {
    curso_atribuido: BookOpen,
    prazo_proximo: AlertCircle,
    avaliacao_pendente: ClipboardList,
    avaliacao_revisao: ClipboardList,
    certificado_emitido: Award,
    avaliacao_resultado: CheckCircle2,
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        {(() => {
          const texto = title ?? tituloPagina ?? tituloDaRota(pathname, user.role)
          return texto && (
            <h1 className="text-base font-semibold text-foreground truncate" title={texto}>{texto}</h1>
          )
        })()}
      </div>

      <div className="flex items-center gap-3">
        {/* Notificações */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="w-4 h-4" />
              {naoLidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                  {naoLidas}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notificações
              {naoLidas > 0 && <Badge variant="secondary" className="text-xs">{naoLidas} novas</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificacoes.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
            ) : (
              notificacoes.slice(0, 5).map(n => {
                const NIcon = notifIconMap[n.tipo] ?? Bell
                const handleClick = () => {
                  if (!n.lida) {
                    marcarComoLida(n.id)
                  }
                  setNotifOpen(false)
                }
                
                return (
                <Link key={n.id} href={n.link || '#'} onClick={handleClick}>
                  <DropdownMenuItem className={cn('flex items-start gap-3 py-3 cursor-pointer', !n.lida && 'bg-primary/5')}>
                    <NIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.criada_em).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {!n.lida && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                  </DropdownMenuItem>
                </Link>
                )
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
