from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import CourseProgress
from .serializers import (
    CourseProgressSerializer,
    MarkLessonCompleteSerializer,
    SubmitAssessmentSerializer,
)
from apps.accounts.permissions import IsRHOrGestor
from apps.courses.models import Course, Lesson, Question, DriveFile, NOTA_MAXIMA


def _recalc_percentual(progress):
    """Recalcula o percentual levando em conta aulas E arquivos Drive."""
    total_lessons = Lesson.objects.filter(modulo__curso=progress.curso).count()
    total_drive   = DriveFile.objects.filter(course=progress.curso).count()
    total         = total_lessons + total_drive

    if total == 0:
        return

    concluidos = len(progress.aulas_completas) + len(progress.arquivos_drive_completos)
    progress.percentual = min((concluidos / total) * 100, 100.0)


def _generate_certificate(progress):
    """Função auxiliar para gerar certificado após aprovação"""
    from apps.certificates.models import Certificate
    from apps.certificates.pdf_generator import generate_certificate_pdf
    from django.core.files.base import ContentFile
    
    try:
        curso = progress.curso
        
        # Criar ou buscar certificado existente
        cert, created = Certificate.objects.get_or_create(
            colaborador=progress.colaborador,
            curso=curso,
            defaults={
                'titulo': curso.titulo,
                'carga_horaria': curso.carga_horaria,
                'data_conclusao': progress.data_conclusao,
                'gestor_nome': getattr(curso.criado_por, 'nome', '') or 'Recursos Humanos',
                'gestor_cargo': getattr(curso.criado_por, 'cargo', '') or 'Recursos Humanos',
            }
        )
        
        # Gerar PDF
        pdf_buffer = generate_certificate_pdf(cert)
        filename = f'certificado_{cert.id}.pdf'
        cert.arquivo.save(filename, ContentFile(pdf_buffer.read()), save=True)
        
        progress.certificado_gerado = True
        progress.save()
        
        return True
    except Exception as e:
        print(f"Erro ao gerar certificado: {e}")
        return False


def _create_review_notification(progress):
    """Cria notificação para o criador do curso quando há questões abertas para revisar"""
    from apps.notifications.models import Notification
    
    try:
        curso = progress.curso
        
        # Verificar se o curso tem um criador
        if not curso.criado_por:
            return False
        
        # Criar notificação para o criador do curso
        Notification.objects.create(
            tipo='avaliacao_revisao',
            titulo=f'Avaliação aguardando revisão - {curso.titulo}',
            mensagem=f'{progress.colaborador.nome} completou a avaliação da trilha "{curso.titulo}" e está aguardando sua revisão das questões abertas.',
            destinatario=curso.criado_por,
            link=f'/avaliacoes/revisar/{progress.id}'
        )
        
        return True
    except Exception as e:
        print(f"Erro ao criar notificação: {e}")
        return False


def _notify_student_review_result(progress, aprovado):
    """Notifica o aluno sobre o resultado da revisão das questões abertas"""
    from apps.notifications.models import Notification
    
    try:
        curso = progress.curso
        
        if aprovado:
            titulo = f'Avaliação Aprovada - {curso.titulo}'
            mensagem = f'Parabéns! Sua avaliação da trilha "{curso.titulo}" foi aprovada. Nota final: {progress.nota_avaliacao}. Seu certificado está disponível.'
            tipo = 'certificado_emitido'
            link = '/certificados'
        else:
            titulo = f'Avaliação Reprovada - {curso.titulo}'
            mensagem = f'Sua avaliação da trilha "{curso.titulo}" foi reprovada. Nota final: {progress.nota_avaliacao}. Você pode tentar novamente.'
            tipo = 'avaliacao_resultado'
            link = f'/cursos/{curso.id}'
        
        Notification.objects.create(
            tipo=tipo,
            titulo=titulo,
            mensagem=mensagem,
            destinatario=progress.colaborador,
            link=link
        )
        
        return True
    except Exception as e:
        print(f"Erro ao notificar aluno: {e}")
        return False


class CourseProgressViewSet(viewsets.ModelViewSet):
    serializer_class = CourseProgressSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['colaborador', 'curso', 'status', 'status_avaliacao']
    ordering_fields = ['atualizado_em', 'percentual']
    ordering = ['-atualizado_em']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('rh', 'gestor'):
            return CourseProgress.objects.select_related('colaborador', 'curso').all()
        return CourseProgress.objects.filter(colaborador=user).select_related('curso')

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy', 'feedback'):
            return [IsRHOrGestor()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # Auto-set colaborador to current user if not provided or None
        colaborador = serializer.validated_data.get('colaborador') or self.request.user
        data_inicio = serializer.validated_data.get('data_inicio') or timezone.now().date()
        serializer.save(colaborador=colaborador, data_inicio=data_inicio)

    @action(detail=True, methods=['post'], url_path='complete-lesson')
    def complete_lesson(self, request, pk=None):
        progress = self.get_object()
        serializer = MarkLessonCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        aula_id = str(serializer.validated_data['aula_id'])
        tempo   = serializer.validated_data['tempo_gasto']

        if aula_id not in progress.aulas_completas:
            progress.aulas_completas.append(aula_id)

        progress.tempo_gasto += tempo

        _recalc_percentual(progress)

        if progress.status == CourseProgress.Status.NAO_INICIADO:
            progress.status = CourseProgress.Status.EM_ANDAMENTO
            if not progress.data_inicio:
                progress.data_inicio = timezone.now().date()

        progress.save()
        return Response(CourseProgressSerializer(progress).data)

    @action(detail=True, methods=['post'], url_path='uncomplete-lesson')
    def uncomplete_lesson(self, request, pk=None):
        progress = self.get_object()
        serializer = MarkLessonCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        aula_id = str(serializer.validated_data['aula_id'])

        if aula_id in progress.aulas_completas:
            progress.aulas_completas.remove(aula_id)

        _recalc_percentual(progress)
        progress.save()
        return Response(CourseProgressSerializer(progress).data)

    @action(detail=True, methods=['post'], url_path='complete-drive-file')
    def complete_drive_file(self, request, pk=None):
        progress = self.get_object()
        drive_id = str(request.data.get('drive_id', '')).strip()
        if not drive_id:
            return Response({'detail': 'drive_id é obrigatório.'}, status=400)

        if drive_id not in progress.arquivos_drive_completos:
            progress.arquivos_drive_completos.append(drive_id)

        if progress.status == CourseProgress.Status.NAO_INICIADO:
            progress.status = CourseProgress.Status.EM_ANDAMENTO
            if not progress.data_inicio:
                progress.data_inicio = timezone.now().date()

        _recalc_percentual(progress)
        progress.save()
        return Response(CourseProgressSerializer(progress).data)

    @action(detail=True, methods=['post'], url_path='uncomplete-drive-file')
    def uncomplete_drive_file(self, request, pk=None):
        progress = self.get_object()
        drive_id = str(request.data.get('drive_id', '')).strip()
        if not drive_id:
            return Response({'detail': 'drive_id é obrigatório.'}, status=400)

        if drive_id in progress.arquivos_drive_completos:
            progress.arquivos_drive_completos.remove(drive_id)

        _recalc_percentual(progress)
        progress.save()
        return Response(CourseProgressSerializer(progress).data)

    @action(detail=True, methods=['post'], url_path='submit-assessment')
    def submit_assessment(self, request, pk=None):
        progress = self.get_object()
        curso = progress.curso

        if not hasattr(curso, 'avaliacao') or not curso.avaliacao:
            return Response({'detail': 'Esta trilha não possui avaliação.'}, status=400)

        avaliacao = curso.avaliacao
        questions = avaliacao.questoes.prefetch_related('opcoes').all()

        # Bloquear se já aprovado
        if progress.status_avaliacao == CourseProgress.EvaluationStatus.APROVADO:
            return Response({'detail': 'Avaliação já aprovada. Não é possível refazê-la.'}, status=400)

        # Bloquear se pendente (aguardando revisão do gestor)
        if progress.status_avaliacao == CourseProgress.EvaluationStatus.PENDENTE:
            return Response({'detail': 'Sua avaliação está aguardando revisão do gestor. Aguarde o resultado.'}, status=400)

        # Bloquear se esgotou as tentativas
        if progress.tentativas_realizadas >= avaliacao.tentativas_permitidas:
            return Response({
                'detail': f'Número máximo de tentativas atingido ({avaliacao.tentativas_permitidas}).'
            }, status=400)

        serializer = SubmitAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        respostas = {str(r['questao_id']): r.get('resposta') for r in serializer.validated_data['respostas']}

        progress.tentativas_realizadas += 1

        # Abandono: nenhuma resposta enviada → reprovado imediato com nota 0
        if not respostas:
            progress.nota_avaliacao = 0
            progress.status_avaliacao = CourseProgress.EvaluationStatus.REPROVADO
            progress.status = CourseProgress.Status.REPROVADO
            progress.respostas_abertas = []
            progress.save()
            return Response(CourseProgressSerializer(progress).data)

        total_weight = sum(q.peso for q in questions)
        earned = 0.0
        respostas_abertas = []
        has_open_questions = False

        for q in questions:
            resposta = respostas.get(str(q.id))
            if q.tipo == Question.Type.MULTIPLA_ESCOLHA:
                correta = q.opcoes.filter(correta=True).values_list('id', flat=True)
                if str(resposta) in [str(c) for c in correta]:
                    earned += q.peso
            else:
                # Questão aberta - precisa de revisão manual
                has_open_questions = True
                respostas_abertas.append({
                    'questao_id': str(q.id), 
                    'resposta': resposta or '',
                    'peso': q.peso
                })

        # Nota = soma dos pontos acertados (escala 0–10; as questões somam no máximo 10).
        # Com questões abertas, aqui entra só a parte objetiva; a revisão soma o resto.
        nota_objetivas = earned
        
        progress.respostas_abertas = respostas_abertas

        # Se há questões abertas, marcar como PENDENTE para revisão
        if has_open_questions:
            progress.nota_avaliacao = round(nota_objetivas, 2)
            progress.status_avaliacao = CourseProgress.EvaluationStatus.PENDENTE
            progress.status = CourseProgress.Status.EM_ANDAMENTO
            progress.save()
            
            # Criar notificação para o criador do curso
            _create_review_notification(progress)
            
            return Response({
                **CourseProgressSerializer(progress).data,
                'message': 'Avaliação enviada para revisão. Aguarde a correção das questões abertas pelo gestor.'
            })
        
        # Se não há questões abertas, avaliar normalmente
        aprovado = nota_objetivas >= avaliacao.nota_minima_aprovacao
        
        progress.nota_avaliacao = round(nota_objetivas, 2)
        progress.status_avaliacao = (
            CourseProgress.EvaluationStatus.APROVADO if aprovado
            else CourseProgress.EvaluationStatus.REPROVADO
        )

        if aprovado:
            progress.status = CourseProgress.Status.CONCLUIDO
            progress.percentual = 100.0
            progress.data_conclusao = timezone.now().date()
            
            # Gerar certificado automaticamente
            _generate_certificate(progress)
        else:
            progress.status = CourseProgress.Status.REPROVADO

        progress.save()
        return Response(CourseProgressSerializer(progress).data)

    @action(detail=True, methods=['patch'], url_path='feedback', permission_classes=[IsRHOrGestor])
    def feedback(self, request, pk=None):
        progress = self.get_object()
        curso = progress.curso

        # Feedback text
        if 'feedback' in request.data:
            progress.feedback_gestor = request.data['feedback']

        # Se está revisando questões abertas com pontuações
        respostas_abertas_avaliadas = request.data.get('respostas_abertas_avaliadas')
        if respostas_abertas_avaliadas:
            # Pontos das abertas já somados numa revisão anterior (para não contar duas vezes)
            pontos_anteriores = sum(
                float(r.get('pontos_recebidos') or 0) for r in (progress.respostas_abertas or [])
            )
            progress.respostas_abertas = respostas_abertas_avaliadas

            # Recalcular nota total
            if hasattr(curso, 'avaliacao') and curso.avaliacao:
                avaliacao = curso.avaliacao
                pesos = {str(q.id): q.peso for q in avaliacao.questoes.all()}

                # Pontos de cada aberta ficam entre 0 e o peso da questão
                for r in respostas_abertas_avaliadas:
                    try:
                        pontos = float(r.get('pontos_recebidos') or 0)
                    except (TypeError, ValueError):
                        pontos = 0
                    teto = pesos.get(str(r.get('questao_id')), 0)
                    r['pontos_recebidos'] = min(max(pontos, 0), teto)

                pontos_abertas = sum(r['pontos_recebidos'] for r in respostas_abertas_avaliadas)

                # Nota = pontos das objetivas (gravados no envio) + pontos das abertas
                nota_objetivas = max((progress.nota_avaliacao or 0) - pontos_anteriores, 0)
                progress.nota_avaliacao = round(nota_objetivas + pontos_abertas, 2)

                # Verificar se foi aprovado
                aprovado = progress.nota_avaliacao >= avaliacao.nota_minima_aprovacao
                progress.status_avaliacao = (
                    CourseProgress.EvaluationStatus.APROVADO if aprovado
                    else CourseProgress.EvaluationStatus.REPROVADO
                )
                
                if aprovado:
                    progress.status = CourseProgress.Status.CONCLUIDO
                    progress.percentual = 100.0
                    progress.data_conclusao = timezone.now().date()
                    
                    # Gerar certificado
                    _generate_certificate(progress)
                    
                    # Notificar aluno sobre aprovação
                    _notify_student_review_result(progress, aprovado=True)
                else:
                    progress.status = CourseProgress.Status.REPROVADO
                    
                    # Notificar aluno sobre reprovação
                    _notify_student_review_result(progress, aprovado=False)

        # Aprovação/reprovação manual direta (override)
        novo_status = request.data.get('status_avaliacao')
        if novo_status in ('aprovado', 'reprovado'):
            progress.status_avaliacao = novo_status
            
            if novo_status == 'aprovado':
                progress.status = CourseProgress.Status.CONCLUIDO
                progress.percentual = 100.0
                if not progress.data_conclusao:
                    progress.data_conclusao = timezone.now().date()
                
                # Gerar certificado se ainda não foi gerado
                if not progress.certificado_gerado:
                    _generate_certificate(progress)
                
                # Notificar aluno sobre aprovação
                _notify_student_review_result(progress, aprovado=True)
            else:
                progress.status = CourseProgress.Status.REPROVADO
                
                # Notificar aluno sobre reprovação
                _notify_student_review_result(progress, aprovado=False)

        # Atualização manual de nota
        nova_nota = request.data.get('nota_avaliacao')
        if nova_nota is not None:
            try:
                progress.nota_avaliacao = min(max(float(nova_nota), 0), NOTA_MAXIMA)
            except (ValueError, TypeError):
                pass

        progress.save()
        return Response(CourseProgressSerializer(progress).data)
