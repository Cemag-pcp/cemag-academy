'use client'

import { useState } from 'react'
import { RefreshCw, AlertTriangle, CloudCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { StatusSincronizacao } from '@/lib/use-acervo'

const ROTULOS_PENDENCIAS: Record<string, { titulo: string; dica: string }> = {
  codigos_nao_encontrados_na_lista_mestra: {
    titulo: 'Códigos da Matriz que não estão na Lista Mestra',
    dica: 'Cadastre o código na aba INTERNOS da Lista Mestra (com o link do arquivo na coluna IDENTIFICAÇÃO).',
  },
  cargos_nao_cadastrados_no_academy: {
    titulo: 'Cargos da Matriz que não existem no Academy',
    dica: 'Cadastre o cargo em Cadastros › Cargos com o mesmo nome da Matriz (ou ajuste o nome na planilha).',
  },
  documentos_sem_cargo_reconhecido: {
    titulo: 'Documentos não publicados (nenhum cargo reconhecido)',
    dica: 'Ficam fora do ar para não aparecerem para todos. Resolva os cargos acima.',
  },
  arquivos_sem_acesso_no_drive: {
    titulo: 'Arquivos que a conta de serviço não consegue abrir',
    dica: 'Compartilhe o arquivo (ou a pasta) com a conta de serviço do Google Drive.',
  },
  abas_ignoradas: {
    titulo: 'Abas da Matriz ignoradas',
    dica: 'Abas por pessoa (sem o cabeçalho SETOR / CARGOS) não são usadas.',
  },
}

function tempoDesde(iso: string | null) {
  if (!iso) return 'nunca'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatarItem(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as Record<string, string>
    if (o.matriz) return `${o.matriz} → ${o.lista_mestra}`
    if (o.codigo) return `${o.codigo}${o.erro ? ` — ${o.erro}` : ''}`
  }
  return JSON.stringify(item)
}

interface Props {
  status: StatusSincronizacao | undefined
  isRH: boolean
  onSincronizado: () => void
}

/** Origem dos documentos (planilhas da Qualidade), última atualização e, para o RH, sincronizar/pendências. */
export function SincronizacaoISO({ status, isRH, onSincronizado }: Props) {
  const [sincronizando, setSincronizando] = useState(false)
  const [verPendencias, setVerPendencias] = useState(false)

  const pendencias = status?.resumo?.pendencias ?? {}
  const totalPendencias = Object.entries(pendencias)
    .filter(([k]) => k !== 'abas_ignoradas')
    .reduce((acc, [, v]) => acc + (v?.length ?? 0), 0)

  async function sincronizarAgora() {
    setSincronizando(true)
    try {
      const r = await api.post<any>('/acervo/sincronizar/')
      toast.success(
        `Sincronizado: ${r.documentos_publicados} documento(s) publicados` +
        (r.criados || r.atualizados || r.desativados
          ? ` (${r.criados} novos, ${r.atualizados} alterados, ${r.desativados} removidos).`
          : ', nada mudou.'),
      )
      onSincronizado()
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao sincronizar.')
    } finally {
      setSincronizando(false)
    }
  }

  const emAndamento = sincronizando || status?.em_andamento

  return (
    <div className="flex items-center gap-2">
      <div className="text-right leading-tight">
        <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          {emAndamento
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando com as planilhas…</>
            : <><CloudCheck className="w-3.5 h-3.5" /> Lista Mestra · atualizado {tempoDesde(status?.ultima_ok_em ?? null)}</>}
        </p>
        {isRH && status?.ultima_status === 'erro' && !emAndamento && (
          <p className="text-[11px] text-destructive" title={status.ultima_erro}>A última tentativa falhou</p>
        )}
      </div>

      {isRH && (
        <>
          {totalPendencias > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setVerPendencias(true)}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Pendências
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{totalPendencias}</Badge>
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={sincronizarAgora} disabled={!!emAndamento}>
            <RefreshCw className={`w-3.5 h-3.5 ${emAndamento ? 'animate-spin' : ''}`} />
            Sincronizar agora
          </Button>
        </>
      )}

      <Dialog open={verPendencias} onOpenChange={setVerPendencias}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pendências da sincronização</DialogTitle>
            <DialogDescription>
              Corrija nas planilhas (Lista Mestra / Matriz de Conhecimentos) ou nos cadastros do Academy.
              A próxima sincronização aplica as correções.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto space-y-4 pr-1">
            {Object.entries(pendencias)
              .filter(([, itens]) => itens?.length)
              .map(([chave, itens]) => {
                const rotulo = ROTULOS_PENDENCIAS[chave] ?? { titulo: chave, dica: '' }
                return (
                  <div key={chave} className="space-y-1.5">
                    <p className="text-sm font-semibold">
                      {rotulo.titulo} <span className="text-muted-foreground font-normal">({itens.length})</span>
                    </p>
                    {rotulo.dica && <p className="text-xs text-muted-foreground">{rotulo.dica}</p>}
                    <ul className="text-xs rounded-md border bg-muted/30 p-2 space-y-0.5 max-h-40 overflow-y-auto">
                      {itens.map((item: unknown, i: number) => <li key={i} className="font-mono">{formatarItem(item)}</li>)}
                    </ul>
                  </div>
                )
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
