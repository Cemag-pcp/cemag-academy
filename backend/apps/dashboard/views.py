from datetime import date, timedelta
from django.db.models import Count, Avg, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import User
from apps.accounts.permissions import IsRH, IsRHOrGestor
from apps.courses.models import Course
from apps.progress.models import CourseProgress
from apps.certificates.models import Certificate


# ── RH ────────────────────────────────────────────────────────────────────────

class DashboardRHView(APIView):
    permission_classes = [IsRH]

    def get(self, request):
        today = date.today()
        primeiro_do_mes = today.replace(day=1)
        trinta_dias = today + timedelta(days=30)

        # KPIs básicos
        total_colaboradores = User.objects.filter(role='colaborador', status='ativo').count()
        cursos_ativos       = Course.objects.filter(publicado=True).count()
        certificados_total  = Certificate.objects.count()
        novos_cursos_mes    = Course.objects.filter(criado_em__date__gte=primeiro_do_mes).count()

        # KPIs de progresso numa única consulta
        kpis = CourseProgress.objects.aggregate(
            total=Count('id'),
            concluidos=Count('id', filter=Q(status='concluido')),
            pendentes=Count('id', filter=Q(status_avaliacao='pendente')),
            media=Avg('nota_avaliacao', filter=Q(nota_avaliacao__isnull=False)),
            vencidos=Count('id', filter=Q(
                status__in=['nao_iniciado', 'em_andamento'],
                curso__prazo__lt=today,
                curso__prazo__isnull=False,
            )),
        )
        avaliacoes_pendentes = kpis['pendentes']

        # Taxa de conclusão geral
        total_progress = kpis['total']
        concluidos     = kpis['concluidos']
        taxa_conclusao = round((concluidos / total_progress * 100) if total_progress else 0, 1)

        # Média de score
        media_score = round(kpis['media'] or 0, 1)

        # Cursos com prazo vencido (com progressos ainda não concluídos)
        cursos_vencidos = kpis['vencidos']

        # Conclusão por departamento
        departamentos = User.objects.filter(
            role='colaborador', status='ativo'
        ).values_list('departamento', flat=True).distinct()

        por_depto = {
            row['colaborador__departamento']: row
            for row in CourseProgress.objects.values('colaborador__departamento').annotate(
                tot=Count('id'),
                con=Count('id', filter=Q(status='concluido')),
            )
        }

        conclusao_por_depto = []
        for depto in departamentos:
            if not depto:
                continue
            row = por_depto.get(depto, {'tot': 0, 'con': 0})
            tot, con = row['tot'], row['con']
            taxa = round((con / tot * 100) if tot else 0, 1)
            conclusao_por_depto.append({'departamento': depto, 'taxa': taxa})

        # Distribuição por categoria
        categorias = Course.objects.filter(publicado=True).values('categoria').annotate(total=Count('id'))
        total_cursos = sum(c['total'] for c in categorias)
        distribuicao = [
            {
                'nome': c['categoria'] or 'Outros',
                'valor': round(c['total'] / total_cursos * 100) if total_cursos else 0,
            }
            for c in categorias
        ]

        # Progresso mensal (últimos 6 meses)
        progresso_mensal = []
        MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        meses = []
        for i in range(5, -1, -1):
            mes_ref = (today.replace(day=1) - timedelta(days=i * 28))
            mes_ref = mes_ref.replace(day=1)
            proximo = (mes_ref.replace(day=28) + timedelta(days=4)).replace(day=1)
            meses.append((mes_ref, proximo))

        # Busca as datas do período uma vez e conta mês a mês em memória
        inicio_periodo, fim_periodo = meses[0][0], meses[-1][1]
        datas = list(CourseProgress.objects.filter(
            Q(data_inicio__gte=inicio_periodo, data_inicio__lt=fim_periodo) |
            Q(data_conclusao__gte=inicio_periodo, data_conclusao__lt=fim_periodo)
        ).values_list('data_inicio', 'data_conclusao'))

        for mes_ref, proximo in meses:
            iniciados = sum(1 for ini, _ in datas if ini and mes_ref <= ini < proximo)
            concluidos_mes = sum(1 for _, fim in datas if fim and mes_ref <= fim < proximo)
            progresso_mensal.append({
                'mes': MESES_PT[mes_ref.month - 1],
                'iniciados': iniciados,
                'concluidos': concluidos_mes,
            })

        # Top cursos por taxa de conclusão
        top_cursos = []
        cursos_publicados = Course.objects.filter(publicado=True).annotate(
            total_p=Count('progressos', distinct=True),
            concl_p=Count('progressos', filter=Q(progressos__status='concluido'), distinct=True),
        )
        for curso in cursos_publicados:
            total_p = curso.total_p
            concl_p = curso.concl_p
            taxa_c  = round((concl_p / total_p * 100) if total_p else 0)
            top_cursos.append({
                'titulo':    curso.titulo,
                'taxa':      taxa_c,
                'inscritos': total_p,
            })
        top_cursos = sorted(top_cursos, key=lambda x: (x['taxa'], x['inscritos']), reverse=True)[:5]

        # Colaboradores com prazo crítico (próximos 30 dias)
        criticos_qs = CourseProgress.objects.filter(
            status__in=['nao_iniciado', 'em_andamento'],
            curso__prazo__isnull=False,
            curso__prazo__lte=trinta_dias,
            curso__prazo__gte=today,
        ).select_related('colaborador', 'curso').order_by('curso__prazo')[:10]

        colaboradores_criticos = [
            {
                'nome':         p.colaborador.nome,
                'curso':        p.curso.titulo,
                'departamento': p.colaborador.departamento,
                'prazo':        p.curso.prazo.strftime('%d/%m/%Y') if p.curso.prazo else '',
                'progresso':    round(p.percentual),
            }
            for p in criticos_qs
        ]

        return Response({
            'totalColaboradores':     total_colaboradores,
            'cursosAtivos':           cursos_ativos,
            'certificadosEmitidos':   certificados_total,
            'taxaConclusaoGeral':     taxa_conclusao,
            'mediaScore':             media_score,
            'cursosVencidos':         cursos_vencidos,
            'novosCursosMes':         novos_cursos_mes,
            'avaliacoesPendentes':    avaliacoes_pendentes,
            'conclusaoPorDepartamento': conclusao_por_depto,
            'distribuicaoCursos':     distribuicao,
            'progressoMensal':        progresso_mensal,
            'topCursos':              top_cursos,
            'colaboradoresCriticos':  colaboradores_criticos,
        })


# ── Gestor ────────────────────────────────────────────────────────────────────

class DashboardGestorView(APIView):
    permission_classes = [IsRHOrGestor]

    def get(self, request):
        user = request.user
        today = date.today()
        sete_dias = today + timedelta(days=7)

        equipe = User.objects.filter(
            departamento=user.departamento,
            role='colaborador',
        )
        equipe_ids = list(equipe.values_list('id', flat=True))

        conclusoes_equipe = CourseProgress.objects.filter(
            colaborador_id__in=equipe_ids, status='concluido'
        ).count()

        avaliacoes_pendentes = CourseProgress.objects.filter(
            colaborador_id__in=equipe_ids, status_avaliacao='pendente'
        ).count()

        prazos_vencendo = CourseProgress.objects.filter(
            colaborador_id__in=equipe_ids,
            status__in=['nao_iniciado', 'em_andamento'],
            curso__prazo__isnull=False,
            curso__prazo__lte=sete_dias,
            curso__prazo__gte=today,
        ).count()

        # Progresso por membro
        por_membro = {
            row['colaborador_id']: row
            for row in CourseProgress.objects.filter(colaborador_id__in=equipe_ids)
            .values('colaborador_id')
            .annotate(
                total=Count('id'),
                concluidos=Count('id', filter=Q(status='concluido')),
                media=Avg('percentual'),
            )
        }

        progresso_equipe = []
        for membro in equipe:
            row           = por_membro.get(membro.id, {})
            total_p       = row.get('total', 0)
            concluidos_p  = row.get('concluidos', 0)
            media_perc    = round(row.get('media') or 0)
            progresso_equipe.append({
                'id':          str(membro.id),
                'nome':        membro.nome,
                'cargo':       membro.cargo,
                'status':      membro.status,
                'media':       media_perc,
                'concluidos':  concluidos_p,
                'totalCursos': total_p,
            })

        # Avaliações pendentes com detalhe
        pendentes_qs = CourseProgress.objects.filter(
            colaborador_id__in=equipe_ids, status_avaliacao='pendente'
        ).select_related('colaborador', 'curso')[:5]

        pendentes_detalhe = [
            {
                'progressoId':      p.pk,
                'colaborador':      p.colaborador.nome,
                'curso':            p.curso.titulo,
                'respostasAbertas': p.respostas_abertas,
            }
            for p in pendentes_qs
        ]

        return Response({
            'totalEquipe':            equipe.count(),
            'conclusoesEquipe':       conclusoes_equipe,
            'avaliacoesPendentes':    avaliacoes_pendentes,
            'prazosVencendo':         prazos_vencendo,
            'progressoEquipe':        progresso_equipe,
            'avaliacoesPendentesDetalhe': pendentes_detalhe,
        })


# ── Colaborador ───────────────────────────────────────────────────────────────

class DashboardColaboradorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        progressos = CourseProgress.objects.filter(
            colaborador=user
        ).select_related('curso').order_by('curso__titulo')

        certificados = Certificate.objects.filter(
            colaborador=user
        ).select_related('curso')

        total_horas = sum(
            p.curso.carga_horaria
            for p in progressos
            if p.status == 'concluido'
        )

        cursos_data = []
        for p in progressos:
            curso = p.curso
            cursos_data.append({
                'cursoId':      str(curso.id),
                'titulo':       curso.titulo,
                'cargaHoraria': curso.carga_horaria,
                'obrigatorio':  curso.obrigatorio,
                'prazo':        curso.prazo.isoformat() if curso.prazo else None,
                'categoria':    curso.categoria,
                'status':       p.status,
                'percentual':   round(p.percentual),
                'notaAvaliacao': p.nota_avaliacao,
                'statusAvaliacao': p.status_avaliacao,
                'dataInicio':    p.data_inicio.isoformat() if p.data_inicio else None,
                'dataConclusao': p.data_conclusao.isoformat() if p.data_conclusao else None,
                'certificadoGerado': p.certificado_gerado,
            })

        certificados_data = [
            {
                'id':            str(c.id),
                'titulo':        c.titulo,
                'cursoTitulo':   c.curso.titulo,
                'cargaHoraria':  c.carga_horaria,
                'dataConclusao': c.data_conclusao.strftime('%d/%m/%Y') if c.data_conclusao else '',
                'emitidoEm':     c.emitido_em.isoformat(),
            }
            for c in certificados
        ]

        return Response({
            'cursos':        cursos_data,
            'certificados':  certificados_data,
            'totalHoras':    total_horas,
            'totalAtribuidos': len(cursos_data),
            'totalConcluidos': sum(1 for c in cursos_data if c['status'] == 'concluido'),
            'totalCertificados': len(certificados_data),
        })
