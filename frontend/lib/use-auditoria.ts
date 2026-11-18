'use client'

// ─── Raw API shape ─────────────────────────────────────────────────────────

export interface AuditLogRaw {
  id: string
  usuario: string | null
  usuario_nome: string
  acao: string
  modulo: string
  detalhes: string
  ip: string | null
  timestamp: string
}

// ─── Public type ───────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  usuarioId: string | null
  usuarioNome: string
  acao: string
  modulo: string
  detalhes: string
  ip: string
  timestamp: string
}

export function mapLog(raw: AuditLogRaw): AuditLog {
  return {
    id: raw.id,
    usuarioId: raw.usuario,
    usuarioNome: raw.usuario_nome || 'Sistema',
    acao: raw.acao,
    modulo: raw.modulo || '—',
    detalhes: raw.detalhes,
    ip: raw.ip ?? '—',
    timestamp: raw.timestamp,
  }
}
