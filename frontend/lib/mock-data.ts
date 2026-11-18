import type {
  User, Course, CourseProgress, Certificate,
  LibraryItem, Notification, AuditLog, Department, Discussion
} from './types'

// =============================================
// USUÁRIOS
// =============================================
export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    nome: 'Ana Paula Ferreira',
    email: 'ana.ferreira@cemag.com.br',
    cargo: 'Analista de RH',
    departamento: 'Recursos Humanos',
    role: 'rh',
    status: 'ativo',
    avatar: '',
    dataAdmissao: '2019-03-15',
    permissions: { usuarios: true, cursos: true, relatorios: true, certificados: true, avaliacoes: true, biblioteca: true, configuracoes: true },
    cursosAtribuidos: ['c1', 'c2', 'c3'],
    cursosCompletos: ['c1'],
  },
  {
    id: 'u2',
    nome: 'Carlos Eduardo Santos',
    email: 'carlos.santos@cemag.com.br',
    cargo: 'Gerente de Produção',
    departamento: 'Produção',
    role: 'gestor',
    status: 'ativo',
    avatar: '',
    dataAdmissao: '2017-08-01',
    permissions: { usuarios: false, cursos: true, relatorios: true, certificados: true, avaliacoes: true, biblioteca: true, configuracoes: false },
    cursosAtribuidos: ['c1', 'c2'],
    cursosCompletos: ['c1', 'c2'],
  },
  {
    id: 'u3',
    nome: 'Marcos Vinícius Lima',
    email: 'marcos.lima@cemag.com.br',
    cargo: 'Operador de Máquinas',
    departamento: 'Produção',
    role: 'colaborador',
    status: 'ativo',
    avatar: '',
    dataAdmissao: '2021-06-10',
    permissions: { usuarios: false, cursos: false, relatorios: false, certificados: false, avaliacoes: false, biblioteca: true, configuracoes: false },
    cursosAtribuidos: ['c1', 'c2', 'c3'],
    cursosCompletos: [],
  },
  {
    id: 'u4',
    nome: 'Juliana Costa Mendes',
    email: 'juliana.mendes@cemag.com.br',
    cargo: 'Técnica de Segurança',
    departamento: 'Segurança do Trabalho',
    role: 'colaborador',
    status: 'ativo',
    avatar: '',
    dataAdmissao: '2020-01-20',
    permissions: { usuarios: false, cursos: false, relatorios: false, certificados: false, avaliacoes: false, biblioteca: true, configuracoes: false },
    cursosAtribuidos: ['c1', 'c3'],
    cursosCompletos: ['c1'],
  },
  {
    id: 'u5',
    nome: 'Roberto Alves Pereira',
    email: 'roberto.pereira@cemag.com.br',
    cargo: 'Analista de Manutenção',
    departamento: 'Manutenção',
    role: 'colaborador',
    status: 'inativo',
    avatar: '',
    dataAdmissao: '2018-11-05',
    permissions: { usuarios: false, cursos: false, relatorios: false, certificados: false, avaliacoes: false, biblioteca: true, configuracoes: false },
    cursosAtribuidos: ['c2'],
    cursosCompletos: [],
  },
  {
    id: 'u6',
    nome: 'Fernanda Oliveira',
    email: 'fernanda.oliveira@cemag.com.br',
    cargo: 'Engenheira Agrícola',
    departamento: 'Engenharia',
    role: 'gestor',
    status: 'ativo',
    avatar: '',
    dataAdmissao: '2016-04-12',
    permissions: { usuarios: false, cursos: true, relatorios: true, certificados: true, avaliacoes: true, biblioteca: true, configuracoes: false },
    cursosAtribuidos: ['c1', 'c2', 'c3'],
    cursosCompletos: ['c1', 'c3'],
  },
]

// Usuário logado atual (simulação)
export const CURRENT_USER: User = MOCK_USERS[0] // RH por padrão

// =============================================
// DEPARTAMENTOS
// =============================================
export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', nome: 'Recursos Humanos', gestorId: 'u1', colaboradores: ['u1'] },
  { id: 'd2', nome: 'Produção', gestorId: 'u2', colaboradores: ['u2', 'u3'] },
  { id: 'd3', nome: 'Segurança do Trabalho', gestorId: 'u4', colaboradores: ['u4'] },
  { id: 'd4', nome: 'Manutenção', gestorId: 'u5', colaboradores: ['u5'] },
  { id: 'd5', nome: 'Engenharia', gestorId: 'u6', colaboradores: ['u6'] },
]

// =============================================
// CURSOS
// =============================================
export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    titulo: 'Segurança no Trabalho Agrícola',
    descricao: 'Normas e procedimentos essenciais de segurança para operação de máquinas e equipamentos agrícolas da CEMAG.',
    thumbnail: '',
    cargaHoraria: 8,
    obrigatorio: true,
    prazo: '2025-06-30',
    departamentosAlvo: ['d1', 'd2', 'd3'],
    rolesAlvo: ['colaborador', 'gestor'],
    colaboradoresAlvo: [],
    versao: 2,
    publicado: true,
    criadoPor: 'u1',
    criadoEm: '2024-01-10',
    categoria: 'Segurança',
    tags: ['NR12', 'Segurança', 'Obrigatório'],
    mediaAvaliacao: 4.6,
    totalInscritos: 48,
    modulos: [
      {
        id: 'm1', titulo: 'Fundamentos de NR12', descricao: 'Norma Regulamentadora 12 aplicada ao agro', ordem: 1,
        aulas: [
          { id: 'a1', titulo: 'Introdução à NR12', descricao: 'Visão geral', tipo: 'video', conteudo: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duracao: 20, ordem: 1 },
          { id: 'a2', titulo: 'EPIs Obrigatórios', descricao: 'Equipamentos de proteção', tipo: 'pdf', conteudo: '/docs/epi.pdf', duracao: 15, ordem: 2 },
        ]
      },
      {
        id: 'm2', titulo: 'Operação Segura de Máquinas', descricao: 'Boas práticas operacionais', ordem: 2,
        aulas: [
          { id: 'a3', titulo: 'Procedimentos de Partida', descricao: 'Checklist antes de operar', tipo: 'texto', conteudo: 'Antes de operar qualquer máquina CEMAG, realize o checklist completo de pré-operação conforme descrito no manual do operador. Verifique os níveis de fluidos, pressão dos pneus, funcionamento dos sistemas de segurança e dispositivos de proteção. Nunca inicie a operação com itens pendentes no checklist.', duracao: 10, ordem: 1 },
          { id: 'a4', titulo: 'Emergências em Campo', descricao: 'Protocolos de emergência', tipo: 'video', conteudo: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duracao: 25, ordem: 2 },
        ]
      }
    ],
    avaliacao: {
      id: 'av1',
      titulo: 'Avaliação — Segurança no Trabalho',
      notaMinimaAprovacao: 70,
      tentativasPermitidas: 2,
      questoes: [
        {
          id: 'q1', tipo: 'multipla_escolha', peso: 2,
          texto: 'Qual o principal objetivo da NR12?',
          opcoes: [
            { id: 'o1', texto: 'Aumentar a produtividade das máquinas', correta: false },
            { id: 'o2', texto: 'Garantir a segurança na operação de máquinas e equipamentos', correta: true },
            { id: 'o3', texto: 'Reduzir custos operacionais', correta: false },
            { id: 'o4', texto: 'Padronizar a manutenção preventiva', correta: false },
          ]
        },
        {
          id: 'q2', tipo: 'multipla_escolha', peso: 2,
          texto: 'Quais EPIs são obrigatórios na operação de colhedoras?',
          opcoes: [
            { id: 'o5', texto: 'Capacete e luvas', correta: true },
            { id: 'o6', texto: 'Protetor auricular', correta: true },
            { id: 'o7', texto: 'Óculos de proteção', correta: true },
            { id: 'o8', texto: 'Gravata', correta: false },
          ]
        },
        {
          id: 'q3', tipo: 'aberta', peso: 3,
          texto: 'Descreva o procedimento correto que deve ser realizado antes de iniciar a operação de uma máquina agrícola na CEMAG.',
        },
      ]
    }
  },
  {
    id: 'c2',
    titulo: 'Manutenção Preventiva de Colhedoras',
    descricao: 'Técnicas e procedimentos para manutenção preventiva das colhedoras da linha CEMAG, incluindo diagnóstico e intervenção.',
    thumbnail: '',
    cargaHoraria: 16,
    obrigatorio: true,
    prazo: '2025-08-15',
    departamentosAlvo: ['d2', 'd4'],
    rolesAlvo: ['colaborador'],
    colaboradoresAlvo: [],
    versao: 1,
    publicado: true,
    criadoPor: 'u6',
    criadoEm: '2024-02-20',
    categoria: 'Manutenção',
    tags: ['Manutenção', 'Colhedoras', 'Técnico'],
    mediaAvaliacao: 4.2,
    totalInscritos: 22,
    modulos: [
      {
        id: 'm3', titulo: 'Sistemas da Colhedora', descricao: 'Componentes e sistemas principais', ordem: 1,
        aulas: [
          { id: 'a5', titulo: 'Sistema Hidráulico', descricao: 'Funcionamento e manutenção do sistema hidráulico', tipo: 'video', conteudo: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duracao: 30, ordem: 1 },
          { id: 'a6', titulo: 'Manual Técnico CEMAG', descricao: 'Manual completo', tipo: 'pdf', conteudo: '/docs/manual.pdf', duracao: 45, ordem: 2 },
        ]
      }
    ],
    avaliacao: {
      id: 'av2',
      titulo: 'Avaliação — Manutenção de Colhedoras',
      notaMinimaAprovacao: 70,
      tentativasPermitidas: 3,
      questoes: [
        { id: 'q4', tipo: 'multipla_escolha', peso: 2, texto: 'Com que frequência deve ser realizada a troca de óleo hidráulico?', opcoes: [
          { id: 'o9', texto: 'A cada 250 horas de operação', correta: true },
          { id: 'o10', texto: 'Anualmente', correta: false },
          { id: 'o11', texto: 'Somente quando apresentar defeito', correta: false },
        ]},
        { id: 'q5', tipo: 'aberta', peso: 4, texto: 'Explique o procedimento de diagnóstico para falha no sistema de trilha da colhedora.' }
      ]
    }
  },
  {
    id: 'c3',
    titulo: 'Liderança e Gestão de Equipes no Agro',
    descricao: 'Desenvolvimento de competências de liderança, comunicação e gestão de pessoas no contexto do agronegócio.',
    thumbnail: '',
    cargaHoraria: 12,
    obrigatorio: false,
    prazo: undefined,
    departamentosAlvo: ['d1', 'd5'],
    rolesAlvo: ['gestor'],
    colaboradoresAlvo: [],
    versao: 1,
    publicado: true,
    criadoPor: 'u1',
    criadoEm: '2024-03-01',
    categoria: 'Liderança',
    tags: ['Liderança', 'Gestão', 'Soft Skills'],
    mediaAvaliacao: 4.8,
    totalInscritos: 12,
    modulos: [
      {
        id: 'm4', titulo: 'Fundamentos de Liderança', descricao: 'Estilos e práticas de liderança', ordem: 1,
        aulas: [
          { id: 'a7', titulo: 'Estilos de Liderança', descricao: 'Autocrático, democrático, coaching', tipo: 'video', conteudo: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duracao: 25, ordem: 1 },
          { id: 'a8', titulo: 'Feedback Eficaz', descricao: 'Como dar e receber feedback', tipo: 'texto', conteudo: 'O feedback eficaz é uma ferramenta essencial para o desenvolvimento da equipe. Ele deve ser específico, oportuno, construtivo e focado no comportamento, não na pessoa. Use o modelo SBI (Situation-Behavior-Impact) para estruturar seu feedback de maneira clara e objetiva.', duracao: 20, ordem: 2 },
        ]
      }
    ],
    avaliacao: {
      id: 'av3',
      titulo: 'Avaliação — Liderança',
      notaMinimaAprovacao: 60,
      tentativasPermitidas: 2,
      questoes: [
        { id: 'q6', tipo: 'aberta', peso: 5, texto: 'Descreva uma situação de conflito entre colaboradores que você teria que gerenciar como líder e como você atuaria.' }
      ]
    }
  },
]

// =============================================
// PROGRESSO DOS CURSOS
// =============================================
export const MOCK_PROGRESS: CourseProgress[] = [
  { cursoId: 'c1', colaboradorId: 'u3', status: 'em_andamento', percentual: 50, aulasCompletas: ['a1', 'a2'], tempoGasto: 35, certificadoGerado: false },
  { cursoId: 'c2', colaboradorId: 'u3', status: 'nao_iniciado', percentual: 0, aulasCompletas: [], tempoGasto: 0, certificadoGerado: false },
  { cursoId: 'c3', colaboradorId: 'u3', status: 'nao_iniciado', percentual: 0, aulasCompletas: [], tempoGasto: 0, certificadoGerado: false },
  { cursoId: 'c1', colaboradorId: 'u4', status: 'concluido', percentual: 100, aulasCompletas: ['a1','a2','a3','a4'], tempoGasto: 70, notaAvaliacao: 85, statusAvaliacao: 'aprovado', feedbackGestor: 'Excelente desempenho!', dataInicio: '2025-01-10', dataConclusao: '2025-01-20', certificadoGerado: true },
  { cursoId: 'c1', colaboradorId: 'u2', status: 'concluido', percentual: 100, aulasCompletas: ['a1','a2','a3','a4'], tempoGasto: 65, notaAvaliacao: 90, statusAvaliacao: 'aprovado', dataInicio: '2025-01-05', dataConclusao: '2025-01-18', certificadoGerado: true },
  { cursoId: 'c2', colaboradorId: 'u2', status: 'concluido', percentual: 100, aulasCompletas: ['a5','a6'], tempoGasto: 80, notaAvaliacao: 88, statusAvaliacao: 'aprovado', dataInicio: '2025-02-01', dataConclusao: '2025-02-15', certificadoGerado: true },
  { cursoId: 'c1', colaboradorId: 'u1', status: 'concluido', percentual: 100, aulasCompletas: ['a1','a2','a3','a4'], tempoGasto: 68, notaAvaliacao: 92, statusAvaliacao: 'aprovado', dataInicio: '2025-01-08', dataConclusao: '2025-01-22', certificadoGerado: true },
  { cursoId: 'c2', colaboradorId: 'u5', status: 'em_andamento', percentual: 30, aulasCompletas: ['a5'], tempoGasto: 30, certificadoGerado: false },
  // Avaliação pendente de revisão
  { cursoId: 'c2', colaboradorId: 'u3', status: 'em_andamento', percentual: 80, aulasCompletas: ['a5','a6'], tempoGasto: 60, statusAvaliacao: 'pendente', respostasAbertas: [{ questaoId: 'q5', resposta: 'O diagnóstico deve iniciar pela verificação visual das correias e tensores do sistema de trilha, seguido de análise com o software de diagnose CEMAG. Em seguida, verificar o torque do eixo cilindro e o ajuste das saliências de trilha conforme tabela do manual técnico.' }], certificadoGerado: false },
]

// =============================================
// CERTIFICADOS
// =============================================
export const MOCK_CERTIFICATES: Certificate[] = [
  { id: 'cert1', colaboradorId: 'u4', cursoId: 'c1', titulo: 'Certificado de Conclusão', colaboradorNome: 'Juliana Costa Mendes', cursoTitulo: 'Segurança no Trabalho Agrícola', cargaHoraria: 8, dataConclusao: '20/01/2025', gestorNome: 'Carlos Eduardo Santos', gestorCargo: 'Gerente de Produção', emitidoEm: '2025-01-20' },
  { id: 'cert2', colaboradorId: 'u2', cursoId: 'c1', titulo: 'Certificado de Conclusão', colaboradorNome: 'Carlos Eduardo Santos', cursoTitulo: 'Segurança no Trabalho Agrícola', cargaHoraria: 8, dataConclusao: '18/01/2025', gestorNome: 'Ana Paula Ferreira', gestorCargo: 'Analista de RH', emitidoEm: '2025-01-18' },
  { id: 'cert3', colaboradorId: 'u2', cursoId: 'c2', titulo: 'Certificado de Conclusão', colaboradorNome: 'Carlos Eduardo Santos', cursoTitulo: 'Manutenção Preventiva de Colhedoras', cargaHoraria: 16, dataConclusao: '15/02/2025', gestorNome: 'Fernanda Oliveira', gestorCargo: 'Engenheira Agrícola', emitidoEm: '2025-02-15' },
  { id: 'cert4', colaboradorId: 'u1', cursoId: 'c1', titulo: 'Certificado de Conclusão', colaboradorNome: 'Ana Paula Ferreira', cursoTitulo: 'Segurança no Trabalho Agrícola', cargaHoraria: 8, dataConclusao: '22/01/2025', gestorNome: 'Carlos Eduardo Santos', gestorCargo: 'Gerente de Produção', emitidoEm: '2025-01-22' },
]

// =============================================
// BIBLIOTECA
// =============================================
export const MOCK_LIBRARY: LibraryItem[] = [
  { id: 'lib1', titulo: 'Manual de Operação — Colhedora S700', descricao: 'Manual completo de operação da colhedora S700, incluindo configurações, operação de campo e resolução de problemas.', categoria: 'Manuais Técnicos', arquivo: '/docs/s700.pdf', tamanho: '8.4 MB', rolesPermitidas: ['colaborador', 'gestor', 'rh'], departamentosPermitidos: [], criadoPor: 'u1', criadoEm: '2024-01-15', downloads: 134, favoritos: ['u2', 'u3'], tags: ['S700', 'Manual', 'Operação'] },
  { id: 'lib2', titulo: 'NR12 — Segurança em Máquinas e Equipamentos', descricao: 'Texto completo e atualizado da Norma Regulamentadora 12 com anotações técnicas.', categoria: 'Normas e Regulamentos', arquivo: '/docs/nr12.pdf', tamanho: '2.1 MB', rolesPermitidas: ['colaborador', 'gestor', 'rh'], departamentosPermitidos: [], criadoPor: 'u1', criadoEm: '2024-02-01', downloads: 87, favoritos: ['u4'], tags: ['NR12', 'Segurança', 'Legal'] },
  { id: 'lib3', titulo: 'Catálogo de Peças — Linha Premium', descricao: 'Catálogo de peças de reposição originais CEMAG para a linha Premium de máquinas agrícolas.', categoria: 'Catálogos', arquivo: '/docs/catalogo.pdf', tamanho: '15.2 MB', rolesPermitidas: ['gestor', 'rh'], departamentosPermitidos: ['d4', 'd5'], criadoPor: 'u6', criadoEm: '2024-03-10', downloads: 42, favoritos: ['u6'], tags: ['Peças', 'Catálogo', 'Premium'] },
  { id: 'lib4', titulo: 'Gestão de Equipes no Agronegócio', descricao: 'Livro digital sobre liderança e gestão de pessoas em ambientes agroindustriais.', categoria: 'Desenvolvimento', arquivo: '/docs/gestao.pdf', tamanho: '3.7 MB', rolesPermitidas: ['gestor', 'rh'], departamentosPermitidos: [], criadoPor: 'u1', criadoEm: '2024-04-05', downloads: 28, favoritos: ['u2', 'u6'], tags: ['Liderança', 'Gestão', 'Agro'] },
  { id: 'lib5', titulo: 'Plano de Manutenção Preventiva 2025', descricao: 'Cronograma e procedimentos de manutenção preventiva para a frota CEMAG no ano de 2025.', categoria: 'Manuais Técnicos', arquivo: '/docs/manutencao2025.pdf', tamanho: '1.8 MB', rolesPermitidas: ['colaborador', 'gestor', 'rh'], departamentosPermitidos: ['d2', 'd4'], criadoPor: 'u6', criadoEm: '2025-01-02', downloads: 56, favoritos: ['u5'], tags: ['Manutenção', '2025', 'Preventiva'] },
]

// =============================================
// NOTIFICAÇÕES
// =============================================
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', tipo: 'curso_atribuido', titulo: 'Novo curso atribuído', mensagem: 'Você foi inscrito no curso "Segurança no Trabalho Agrícola". Prazo: 30/06/2025.', destinatarioId: 'u3', lida: false, criadaEm: '2025-05-10', link: '/cursos/c1' },
  { id: 'n2', tipo: 'prazo_proximo', titulo: 'Prazo se aproximando', mensagem: 'O curso "Manutenção Preventiva de Colhedoras" vence em 15 dias.', destinatarioId: 'u3', lida: false, criadaEm: '2025-07-31', link: '/cursos/c2' },
  { id: 'n3', tipo: 'avaliacao_pendente', titulo: 'Avaliação para revisar', mensagem: 'Marcos Vinícius Lima enviou resposta aberta para revisão no curso "Manutenção Preventiva".', destinatarioId: 'u2', lida: false, criadaEm: '2025-05-12', link: '/avaliacoes' },
  { id: 'n4', tipo: 'certificado_emitido', titulo: 'Certificado emitido', mensagem: 'Seu certificado de "Segurança no Trabalho Agrícola" está disponível para download.', destinatarioId: 'u4', lida: true, criadaEm: '2025-01-20', link: '/certificados' },
  { id: 'n5', tipo: 'avaliacao_resultado', titulo: 'Resultado da avaliação', mensagem: 'Sua avaliação de "Segurança no Trabalho" foi aprovada com nota 85. Parabéns!', destinatarioId: 'u4', lida: true, criadaEm: '2025-01-19', link: '/cursos/c1' },
]

// =============================================
// AUDIT LOGS
// =============================================
export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'log1', usuarioId: 'u1', usuarioNome: 'Ana Paula Ferreira', acao: 'Publicou curso', modulo: 'Cursos', detalhes: 'Publicou o curso "Segurança no Trabalho Agrícola" v2', ip: '192.168.1.100', timestamp: '2025-05-10T09:23:00' },
  { id: 'log2', usuarioId: 'u1', usuarioNome: 'Ana Paula Ferreira', acao: 'Adicionou usuário', modulo: 'Usuários', detalhes: 'Criou conta para Marcos Vinícius Lima (colaborador)', ip: '192.168.1.100', timestamp: '2025-04-15T14:30:00' },
  { id: 'log3', usuarioId: 'u2', usuarioNome: 'Carlos Eduardo Santos', acao: 'Aprovou avaliação', modulo: 'Avaliações', detalhes: 'Aprovou resposta de Juliana Mendes no curso "Segurança"', ip: '192.168.1.101', timestamp: '2025-01-19T16:45:00' },
  { id: 'log4', usuarioId: 'u6', usuarioNome: 'Fernanda Oliveira', acao: 'Upload biblioteca', modulo: 'Biblioteca', detalhes: 'Adicionou "Catálogo de Peças — Linha Premium" à biblioteca', ip: '192.168.1.105', timestamp: '2025-03-10T10:12:00' },
  { id: 'log5', usuarioId: 'u1', usuarioNome: 'Ana Paula Ferreira', acao: 'Gerou relatório', modulo: 'Relatórios', detalhes: 'Exportou relatório de conclusão por departamento', ip: '192.168.1.100', timestamp: '2025-05-11T11:00:00' },
  { id: 'log6', usuarioId: 'u1', usuarioNome: 'Ana Paula Ferreira', acao: 'Editou curso', modulo: 'Cursos', detalhes: 'Atualizou módulo "Fundamentos de NR12" com novo vídeo', ip: '192.168.1.100', timestamp: '2025-05-09T14:50:00' },
  { id: 'log7', usuarioId: 'u2', usuarioNome: 'Carlos Eduardo Santos', acao: 'Emitiu certificado', modulo: 'Certificados', detalhes: 'Emitiu certificado para Juliana Costa Mendes', ip: '192.168.1.101', timestamp: '2025-01-20T08:15:00' },
]

// =============================================
// DISCUSSÕES
// =============================================
export const MOCK_DISCUSSIONS: Discussion[] = [
  {
    id: 'disc1', cursoId: 'c1', autorId: 'u3', autorNome: 'Marcos Vinícius Lima', mensagem: 'Alguém pode explicar melhor o procedimento de desligamento de emergência da colhedora? Não ficou muito claro no vídeo.', criadaEm: '2025-05-11T10:30:00',
    respostas: [
      { id: 'disc1r1', cursoId: 'c1', autorId: 'u2', autorNome: 'Carlos Eduardo Santos', mensagem: 'Boa pergunta, Marcos! O botão de parada de emergência fica localizado no painel direito do operador, sinalizado em vermelho. Ao acioná-lo, todos os sistemas param imediatamente exceto o sistema de freio.', criadaEm: '2025-05-11T11:15:00', respostas: [] }
    ]
  },
  {
    id: 'disc2', cursoId: 'c2', autorId: 'u5', autorNome: 'Roberto Alves Pereira', mensagem: 'Qual o intervalo correto para lubrificação das articulações do molinete?', criadaEm: '2025-05-12T09:00:00',
    respostas: []
  }
]

// =============================================
// MÉTRICAS DO DASHBOARD
// =============================================
export const DASHBOARD_METRICS = {
  totalColaboradores: 234,
  cursosAtivos: 18,
  certificadosEmitidos: 312,
  taxaConclusaoGeral: 67,
  mediaScore: 82,
  cursosVencidos: 7,
  novosCursosMes: 3,
  conclusaoPorDepartamento: [
    { departamento: 'Produção', taxa: 72 },
    { departamento: 'Engenharia', taxa: 88 },
    { departamento: 'Manutenção', taxa: 54 },
    { departamento: 'Segurança', taxa: 91 },
    { departamento: 'RH', taxa: 95 },
  ],
  distribuicaoCursos: [
    { nome: 'Segurança', valor: 35 },
    { nome: 'Manutenção', valor: 28 },
    { nome: 'Liderança', valor: 18 },
    { nome: 'Técnico', valor: 12 },
    { nome: 'Outros', valor: 7 },
  ],
  progressoMensal: [
    { mes: 'Jan', iniciados: 34, concluidos: 18 },
    { mes: 'Fev', iniciados: 28, concluidos: 22 },
    { mes: 'Mar', iniciados: 42, concluidos: 31 },
    { mes: 'Abr', iniciados: 38, concluidos: 27 },
    { mes: 'Mai', iniciados: 51, concluidos: 39 },
    { mes: 'Jun', iniciados: 45, concluidos: 41 },
  ],
  topCursos: [
    { titulo: 'Segurança no Trabalho Agrícola', taxa: 82, inscritos: 48 },
    { titulo: 'Liderança e Gestão', taxa: 75, inscritos: 12 },
    { titulo: 'Manutenção Preventiva', taxa: 61, inscritos: 22 },
  ],
}
