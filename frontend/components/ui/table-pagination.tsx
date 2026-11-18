'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TablePaginationProps {
  page: number
  pageSize: number
  count: number
  onPageChange: (page: number) => void
  loading?: boolean
  className?: string
}

/** Números de página exibidos: primeira, última e vizinhas da atual, com "…" entre elas. */
function paginasVisiveis(atual: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, atual - 1, atual, atual + 1])
  const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  nums.forEach((n, i) => {
    if (i > 0 && n - (nums[i - 1] as number) > 1) out.push('…')
    out.push(n)
  })
  return out
}

/** Rodapé de paginação das tabelas (paginação feita no servidor). */
export function TablePagination({
  page, pageSize, count, onPageChange, loading, className,
}: TablePaginationProps) {
  if (count === 0) return null

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const inicio = (page - 1) * pageSize + 1
  const fim = Math.min(page * pageSize, count)
  const ir = (p: number) => onPageChange(Math.min(Math.max(1, p), totalPages))

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border', className)}>
      <p className="text-xs text-muted-foreground">
        Mostrando <strong className="text-foreground">{inicio}–{fim}</strong> de{' '}
        <strong className="text-foreground">{count}</strong>
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={loading || page <= 1} onClick={() => ir(1)}
            aria-label="Primeira página" title="Primeira página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={loading || page <= 1} onClick={() => ir(page - 1)}
            aria-label="Página anterior" title="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {paginasVisiveis(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`r${i}`} className="px-1 text-xs text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className="h-7 min-w-7 px-2 text-xs"
                disabled={loading}
                onClick={() => ir(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={loading || page >= totalPages} onClick={() => ir(page + 1)}
            aria-label="Próxima página" title="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={loading || page >= totalPages} onClick={() => ir(totalPages)}
            aria-label="Última página" title="Última página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
