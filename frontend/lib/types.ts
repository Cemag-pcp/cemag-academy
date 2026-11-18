// =============================================
// CEMAG LMS — Tipos Globais
// =============================================

export type Role = 'rh' | 'gestor' | 'colaborador'

export type Status = 'ativo' | 'inativo'

export type CourseStatus = 'nao_iniciado' | 'em_andamento' | 'concluido' | 'reprovado'

export type EvaluationStatus = 'pendente' | 'aprovado' | 'reprovado'

export type QuestionType = 'multipla_escolha' | 'aberta'

export interface Permission {
  usuarios: boolean
  cursos: boolean
  relatorios: boolean
  certificados: boolean
  avaliacoes: boolean
  biblioteca: boolean
  configuracoes: boolean
}

export interface User {
  id: string
  matricula: string
  nome: string
  email: string
  cargo: string
  departamento: string
  role: Role
  status: Status
  avatar?: string
  dataAdmissao: string
  permissions: Permission
  cursosAtribuidos: string[]
  cursosCompletos: string[]
}

export interface Cargo {
  id: string
  nome: string
  descricao: string
  ativo: boolean
}

export interface Documento {
  id: string
  titulo: string
  descricao: string
  driveId: string
  driveNome: string
  driveMimeType: string
  driveWebViewLink: string
  driveThumbnail: string
  cargos: Cargo[]
  criadoPor: string
  criadoPorNome: string
  criadoEm: string
  ativo: boolean
  /** Código na Lista Mestra sem a versão (ex.: FL AL-001) e versão vigente (ex.: 002) */
  codigo: string
  versao: string
  /** Lido na versão atual */
  isVisto: boolean
  /** Leu uma versão anterior, mas não a atual: precisa ler de novo */
  novaVersao: boolean
}

export interface Department {
  id: string
  nome: string
  gestorId: string
  colaboradores: string[]
}

export interface LessonFile {
  id: string
  arquivo: string
  url: string
  nome: string
  tipo: string
  tamanho: number
  ordem: number
}

export interface Lesson {
  id: string
  titulo: string
  descricao: string
  tipo: 'video' | 'pdf' | 'imagem' | 'excel' | 'texto' | 'drive'
  conteudo: string
  duracao: number // minutos
  ordem: number
  arquivos?: LessonFile[]
}

export interface Module {
  id: string
  titulo: string
  descricao: string
  aulas: Lesson[]
  ordem: number
}

export interface Question {
  id: string
  texto: string
  tipo: QuestionType
  opcoes?: { id: string; texto: string; correta: boolean }[]
  respostaCorreta?: string
  peso: number
}

export interface Assessment {
  id: string
  titulo: string
  questoes: Question[]
  notaMinimaAprovacao: number
  tentativasPermitidas: number
}

export interface Course {
  id: string
  titulo: string
  descricao: string
  thumbnail: string
  cargaHoraria: number
  modulos: Module[]
  avaliacao?: Assessment
  obrigatorio: boolean
  prazo?: string
  departamentosAlvo: string[]
  cargosAlvo: string[]
  rolesAlvo: Role[]
  colaboradoresAlvo: string[]
  versao: number
  publicado: boolean
  criadoPor: string
  criadoPorNome: string
  criadoEm: string
  categoria: string
  tags: string[]
  instrutor?: string
  temAvaliacao: boolean
  mediaAvaliacao: number
  totalInscritos: number
  totalAulas?: number
  // Google Drive
  driveFolderId?: string
  driveLastSync?: string | null
  driveFiles?: DriveFile[]
}

export interface CourseProgress {
  cursoId: string
  colaboradorId: string
  status: CourseStatus
  percentual: number
  aulasCompletas: string[]
  arquivosDriveCompletos: string[]
  tempoGasto: number // minutos
  notaAvaliacao?: number
  statusAvaliacao?: EvaluationStatus
  tentativasRealizadas?: number
  respostasAbertas?: { questaoId: string; resposta: string }[]
  feedbackGestor?: string
  dataInicio?: string
  dataConclusao?: string
  certificadoGerado: boolean
}

export interface Certificate {
  id: string
  colaboradorId: string
  cursoId: string
  titulo: string
  colaboradorNome: string
  cursoTitulo: string
  cargaHoraria: number
  dataConclusao: string
  gestorNome: string
  gestorCargo: string
  emitidoEm: string
}

export interface LibraryItem {
  id: string
  titulo: string
  descricao: string
  categoria: string
  arquivo: string
  tamanho: string
  driveId: string
  driveNome: string
  driveWebViewLink: string
  rolesPermitidas: Role[]
  departamentosPermitidos: string[]
  criadoPor: string
  criadoEm: string
  downloads: number
  favoritos: string[]
  tags: string[]
  isFavorito: boolean
}

export interface Notification {
  id: string
  tipo: 'curso_atribuido' | 'prazo_proximo' | 'avaliacao_pendente' | 'certificado_emitido' | 'avaliacao_resultado'
  titulo: string
  mensagem: string
  destinatarioId: string
  lida: boolean
  criadaEm: string
  link?: string
}

export interface AuditLog {
  id: string
  usuarioId: string
  usuarioNome: string
  acao: string
  modulo: string
  detalhes: string
  ip: string
  timestamp: string
}

export type DriveCategory = 'video' | 'pdf' | 'sheet' | 'doc' | 'slide' | 'image' | 'other'

export interface DriveFile {
  id: string
  drive_id: string
  name: string
  mime_type: string
  category: DriveCategory
  web_view_link: string
  thumbnail_link: string | null
  embed_url: string
  size: number | null
  modified_at: string | null
  order: number
}

export interface DriveSyncState {
  folder_id: string
  last_sync: string | null
  file_count: number
  files: DriveFile[]
}

export interface Discussion {
  id: string
  cursoId: string
  autorId: string
  autorNome: string
  autorAvatar?: string
  mensagem: string
  respostas: Discussion[]
  criadaEm: string
}

export interface CompetencyMatrix {
  colaboradorId: string
  competencias: {
    nome: string
    nivel: 1 | 2 | 3 | 4 | 5
    cursoRelacionado?: string
  }[]
}
