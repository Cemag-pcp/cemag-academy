'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, Users, BarChart3, Award,
  Library, Settings, LogOut, ChevronRight, ChevronDown,
  GraduationCap, Shield, Archive, PanelLeftClose, PanelLeftOpen,
  FolderCog, Briefcase, Building2, ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { Role } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
  permission?: keyof import('@/lib/types').Permission
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',             href: '/dashboard',    icon: LayoutDashboard, roles: ['rh', 'gestor', 'colaborador'] },
  { label: 'Minhas Trilhas',      href: '/cursos',       icon: BookOpen,        roles: ['colaborador'] },
  { label: 'Gerenciar Trilhas', href: '/cursos',       icon: BookOpen,        roles: ['rh', 'gestor'] },
  { label: 'Avaliações',       href: '/avaliacoes',   icon: ClipboardCheck,  roles: ['rh', 'gestor'] },
  { label: 'Certificados',     href: '/certificados', icon: Award,           roles: ['rh', 'gestor', 'colaborador'] },
  { label: 'Biblioteca',       href: '/biblioteca',   icon: Library,         roles: ['rh', 'gestor', 'colaborador'] },
  { label: 'Documentação ISO', href: '/acervo',       icon: Archive,         roles: ['rh', 'gestor', 'colaborador'] },
  { label: 'Usuários',         href: '/usuarios',     icon: Users,           roles: ['rh'] },
  {
    label: 'Cadastros', href: '/cadastros', icon: FolderCog, roles: ['rh'],
    children: [
      { label: 'Cargos',  href: '/cadastros/cargos',  icon: Briefcase, roles: ['rh'] },
      { label: 'Setores', href: '/cadastros/setores', icon: Building2, roles: ['rh'] },
    ],
  },
  { label: 'Relatórios',       href: '/relatorios',   icon: BarChart3,       roles: ['rh', 'gestor'] },
  { label: 'Logs de Auditoria',href: '/auditoria',    icon: Shield,          roles: ['rh'] },
]

const roleLabel: Record<Role, string> = {
  rh: 'Recursos Humanos',
  gestor: 'Gestor',
  colaborador: 'Colaborador',
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  function toggle() {
    setCollapsed(prev => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  if (!user) return null

  const filteredItems = NAV_ITEMS.filter(item =>
    item.roles.includes(user.role) &&
    !(item.label === 'Minhas Trilhas' && user.role !== 'colaborador') &&
    !(item.label === 'Gerenciar Trilhas' && user.role === 'colaborador')
  )

  const initials = user.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // Foto do usuário; sem foto, mostra as iniciais
  const avatar = (extra?: string) => user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar}
      alt={user.nome}
      className={cn('w-9 h-9 rounded-full object-cover flex-shrink-0', extra)}
    />
  ) : (
    <div className={cn('flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 text-primary font-semibold text-sm flex-shrink-0', extra)}>
      {initials}
    </div>
  )

  const isItemActive = (href: string) => pathname === href || (pathname.startsWith(href) && href !== '/')

  function renderLink(item: NavItem, tooltip = item.label, nested = false) {
    const Icon = item.icon
    const isActive = isItemActive(item.href)

    if (collapsed) {
      return (
        <Tooltip key={item.href + item.label}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-all mx-auto',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{tooltip}</TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all',
          nested ? 'py-2' : 'py-2.5',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
      </Link>
    )
  }

  function renderGroup(item: NavItem) {
    const children = item.children!.filter(c => c.roles.includes(user!.role))
    const Icon = item.icon
    const groupActive = isItemActive(item.href)

    // Menu recolhido: mostra os submenus direto como ícones
    if (collapsed) {
      return children.map(child => renderLink(child, `${item.label} › ${child.label}`))
    }

    const open = openGroups[item.href] ?? groupActive

    return (
      <div key={item.href + item.label}>
        <button
          type="button"
          onClick={() => setOpenGroups(prev => ({ ...prev, [item.href]: !open }))}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            groupActive
              ? 'text-sidebar-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('w-3 h-3 opacity-60 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-5 mt-0.5 pl-2 border-l border-sidebar-border space-y-0.5">
            {children.map(child => renderLink(child, child.label, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={cn(
      'relative flex flex-col min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Toggle: sobre a borda direita, na altura do primeiro bloco
          (logo quando aberto, avatar quando recolhido) */}
      <button
        onClick={toggle}
        className={cn(
          'absolute -right-3.5 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/60 shadow-sm hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
          collapsed ? 'top-[34px]' : 'top-[38px]'
        )}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed
          ? <PanelLeftOpen className="w-3.5 h-3.5" />
          : <PanelLeftClose className="w-3.5 h-3.5" />
        }
      </button>

      {/* Logo (some com o menu recolhido) */}
      {!collapsed && (
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground tracking-wide">CEMAG</p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Treinamentos</p>
          </div>
        </div>
      )}

      {/* Perfil */}
      <div className={cn(
        'border-b border-sidebar-border flex-shrink-0 transition-all duration-300',
        collapsed ? 'flex justify-center py-4 px-0' : 'px-4 py-4'
      )}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">{avatar()}</div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{user.nome.split(' ').slice(0, 2).join(' ')}</p>
              <p className="text-xs opacity-70">{roleLabel[user.role]}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {avatar()}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.nome.split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user.cargo}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navegação */}
      <nav className={cn('flex-1 py-4 space-y-0.5 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
        {filteredItems.map(item => (item.children ? renderGroup(item) : renderLink(item)))}
      </nav>

      {/* Rodapé */}
      <div className={cn(
        'pb-4 space-y-0.5 border-t border-sidebar-border pt-3',
        collapsed ? 'px-2' : 'px-3'
      )}>
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/configuracoes"
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all mx-auto"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Configurações</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-red-400 transition-all mx-auto"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Link
              href="/configuracoes"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-red-400 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
