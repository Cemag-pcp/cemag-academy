'use client'

import { useState } from 'react'
import { Award, Download, Search, Calendar, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { useCertificados } from '@/lib/use-certificados'
import type { Certificate } from '@/lib/types'

export function CertificadosList() {
  const { user } = useAuth()
  const { certificados, loading, downloadCertificate } = useCertificados()
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  if (!user) return null

  const isAdmin = user.role === 'rh' || user.role === 'gestor'

  const certs = certificados.filter(c =>
    search === '' ||
    c.colaboradorNome.toLowerCase().includes(search.toLowerCase()) ||
    c.cursoTitulo.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDownload(cert: Certificate) {
    setDownloading(cert.id)
    try {
      await downloadCertificate(cert.id)
      toast.success(`Certificado de "${cert.cursoTitulo}" baixado com sucesso.`)
    } catch (error) {
      toast.error('Erro ao baixar certificado. Tente novamente.')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-end gap-4">
        {isAdmin && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador ou trilha..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        )}
      </div>

      {certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Nenhum certificado encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'Nenhum colaborador concluiu trilhas ainda.' : 'Conclua trilhas para receber certificados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {certs.map(cert => (
            <Card key={cert.id} className="hover:shadow-md transition-all group border-border">
              <CardContent className="p-5">
                {/* Header do card */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 flex-shrink-0">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight truncate">{cert.cursoTitulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{cert.colaboradorNome}</p>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20 text-[10px] border flex-shrink-0">
                    Emitido
                  </Badge>
                </div>

                {/* Detalhes */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Concluído em {cert.dataConclusao}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{cert.cargaHoraria}h de carga horária</span>
                  </div>
                </div>

                {/* Assinatura */}
                <div className="pt-3 border-t border-border mb-4">
                  <p className="text-xs text-muted-foreground">Assinado por</p>
                  <p className="text-xs font-medium mt-0.5">{cert.gestorNome}</p>
                  <p className="text-[10px] text-muted-foreground">{cert.gestorCargo}</p>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => handleDownload(cert)}
                    disabled={downloading === cert.id}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloading === cert.id ? 'Baixando...' : 'Baixar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}

