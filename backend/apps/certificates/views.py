from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import Certificate
from .serializers import CertificateSerializer
from .pdf_generator import generate_certificate_pdf
from apps.accounts.permissions import IsRHOrGestor
from apps.progress.models import CourseProgress
from django.core.files.base import ContentFile


class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['colaborador', 'curso']
    ordering_fields = ['emitido_em', 'data_conclusao']
    ordering = ['-emitido_em']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('rh', 'gestor'):
            return Certificate.objects.select_related('colaborador', 'curso').all()
        return Certificate.objects.filter(colaborador=user).select_related('curso')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsRHOrGestor()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='generate', permission_classes=[IsRHOrGestor])
    def generate(self, request):
        """Gera certificado a partir de um progresso concluído."""
        progress_id = request.data.get('progress_id')
        try:
            progress = CourseProgress.objects.select_related(
                'colaborador', 'curso'
            ).get(pk=progress_id, status='concluido')
        except CourseProgress.DoesNotExist:
            return Response({'detail': 'Progresso não encontrado ou não concluído.'}, status=400)

        curso = progress.curso
        criado_por = curso.criado_por
        cert, created = Certificate.objects.get_or_create(
            colaborador=progress.colaborador,
            curso=curso,
            defaults={
                'titulo':         curso.titulo,
                'carga_horaria':  curso.carga_horaria,
                'data_conclusao': progress.data_conclusao,
                'gestor_nome':    getattr(criado_por, 'nome', '') or 'Recursos Humanos',
                'gestor_cargo':   getattr(criado_por, 'cargo', '') or 'Recursos Humanos',
            }
        )
        if created:
            progress.certificado_gerado = True
            progress.save()

        return Response(CertificateSerializer(cert).data)
    
    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Download do certificado em PDF — sempre regenera com o layout atual."""
        cert = self.get_object()
        try:
            pdf_buffer = generate_certificate_pdf(cert)
            filename = f'certificado_{cert.id}.pdf'

            # Atualiza o arquivo em cache com o PDF recém-gerado
            cert.arquivo.save(filename, ContentFile(pdf_buffer.read()), save=True)

            pdf_buffer.seek(0)
            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({'detail': f'Erro ao gerar PDF: {str(e)}'}, status=500)
