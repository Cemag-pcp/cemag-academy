from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Course, Discussion, Assessment, Lesson, LessonFile
from .serializers import (
    CourseListSerializer, CourseDetailSerializer, DiscussionSerializer, 
    DriveFileSerializer, AssessmentSerializer, LessonFileSerializer
)
from apps.accounts.permissions import IsRH, IsRHOrGestor, IsRHOrOwnerGestor
from apps.accounts.models import Cargo, Department


class CourseViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['publicado', 'obrigatorio', 'categoria']
    search_fields = ['titulo', 'descricao', 'categoria', 'tags']
    ordering_fields = ['titulo', 'criado_em', 'carga_horaria']
    ordering = ['-criado_em']

    def get_queryset(self):
        user = self.request.user
        qs = Course.objects.select_related('avaliacao', 'criado_por').prefetch_related(
            'modulos__aulas', 'colaboradores_alvo', 'drive_files'
        )
        
        if user.role in ('rh', 'gestor'):
            return qs.all()
        
        # Colaboradores: filtrar cursos publicados
        qs = qs.filter(publicado=True)
        
        # Buscar UUID do setor e do cargo do usuário (guardados por nome no User)
        depto_id = None
        if user.departamento:
            depto = Department.objects.filter(nome=user.departamento).values_list('id', flat=True).first()
            depto_id = str(depto) if depto else None

        cargo_id = None
        if user.cargo:
            cargo = Cargo.objects.filter(nome=user.cargo).values_list('id', flat=True).first()
            cargo_id = str(cargo) if cargo else None

        def publico_alvo(curso):
            # Setores e cargos se combinam: com os dois preenchidos, o colaborador
            # precisa estar num dos setores E ter um dos cargos
            setores = curso.departamentos_alvo or []
            cargos  = curso.cargos_alvo or []
            if not setores and not cargos:
                return False
            return (
                (not setores or depto_id in setores) and
                (not cargos or cargo_id in cargos)
            )

        # Filtrar cursos onde o colaborador tem acesso:
        # - Atribuição direta OU
        # - Setor/cargo no público-alvo OU
        # - Role está em roles_alvo
        curso_ids = []
        for curso in qs:
            tem_acesso = (
                user in curso.colaboradores_alvo.all() or
                publico_alvo(curso) or
                (user.role and user.role in curso.roles_alvo)
            )
            
            if tem_acesso:
                curso_ids.append(curso.id)
        
        return qs.filter(id__in=curso_ids)

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'drive_proxy', 'discussions'):
            return [permissions.IsAuthenticated()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsRHOrOwnerGestor()]
        return [IsRHOrGestor()]

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=True, methods=['post'], url_path='publish', permission_classes=[IsRHOrGestor])
    def publish(self, request, pk=None):
        course = self.get_object()
        course.publicado = not course.publicado
        course.save()
        return Response({'publicado': course.publicado})

    @action(detail=True, methods=['get'], url_path='discussions')
    def discussions(self, request, pk=None):
        course = self.get_object()
        qs = Discussion.objects.filter(curso=course, resposta_de__isnull=True).prefetch_related('respostas')
        serializer = DiscussionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='drive-sync', permission_classes=[IsRHOrGestor])
    def drive_sync(self, request, pk=None):
        """GET: return current sync state. POST: trigger a new sync."""
        course = self.get_object()

        if request.method == 'GET':
            from .models import DriveFile
            files = DriveFile.objects.filter(course=course)
            return Response({
                'folder_id':  course.drive_folder_id,
                'last_sync':  course.drive_last_sync,
                'file_count': files.count(),
                'files':      DriveFileSerializer(files, many=True).data,
            })

        # POST — trigger sync
        folder_id = (request.data.get('folder_id') or '').strip()
        if not folder_id:
            return Response({'error': 'folder_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .drive_utils import sync_drive_folder
            files = sync_drive_folder(course, folder_id)
            return Response({
                'folder_id':  course.drive_folder_id,
                'last_sync':  course.drive_last_sync,
                'file_count': len(files),
                'files':      DriveFileSerializer(files, many=True).data,
            })
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False, methods=['get'],
        url_path=r'drive-proxy/(?P<drive_id>[^/.]+)',
        permission_classes=[permissions.IsAuthenticated],
    )
    def drive_proxy(self, request, drive_id=None):
        """Proxy a Drive file through the server to avoid iframe cookie issues."""
        from django.http import HttpResponse
        from .models import DriveFile

        try:
            drive_file = DriveFile.objects.select_related('course').get(drive_id=drive_id)
        except DriveFile.DoesNotExist:
            return Response({'error': 'Arquivo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        course = drive_file.course
        user = request.user
        if user.role not in ('rh', 'gestor') and not course.publicado:
            return Response({'error': 'Acesso negado.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            from .drive_utils import get_drive_file_bytes
            content, content_type = get_drive_file_bytes(drive_id, drive_file.mime_type)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response = HttpResponse(content, content_type=content_type)
        safe_name = drive_file.name.encode('ascii', errors='replace').decode()
        response['Content-Disposition'] = f'inline; filename="{safe_name}"'
        response['Cache-Control'] = 'private, max-age=3600'
        return response

    @action(detail=False, methods=['post'], url_path='upload-lesson-files',
            permission_classes=[IsRHOrGestor], parser_classes=[MultiPartParser, FormParser])
    def upload_lesson_files(self, request):
        """Upload multiple files for a lesson"""
        lesson_id = request.data.get('lesson_id')
        if not lesson_id:
            return Response({'error': 'lesson_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'error': 'Aula não encontrada'}, status=status.HTTP_404_NOT_FOUND)
        
        uploaded_files = []
        files = request.FILES.getlist('files')
        
        for index, file in enumerate(files):
            lesson_file = LessonFile.objects.create(
                aula=lesson,
                arquivo=file,
                nome=file.name,
                tipo=file.content_type,
                tamanho=file.size,
                ordem=index
            )
            uploaded_files.append(lesson_file)
        
        serializer = LessonFileSerializer(uploaded_files, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='upload-lesson-file',
            permission_classes=[IsRHOrGestor], parser_classes=[MultiPartParser, FormParser])
    def upload_lesson_file(self, request):
        """Upload a single file to S3 and return URL (for course creation)"""
        file = request.FILES.get('files')
        if not file:
            return Response({'error': 'Nenhum arquivo enviado'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.core.files.storage import default_storage
        from django.conf import settings
        import uuid
        
        # Generate unique filename
        ext = file.name.split('.')[-1] if '.' in file.name else ''
        filename = f"aulas/{uuid.uuid4()}.{ext}"
        
        # Save to S3
        saved_path = default_storage.save(filename, file)
        file_url = default_storage.url(saved_path)
        
        return Response({
            'url': file_url,
            'arquivo': saved_path,
            'nome': file.name,
            'tipo': file.content_type,
            'tamanho': file.size
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'], url_path='delete-lesson-file/(?P<file_id>[^/.]+)',
            permission_classes=[IsRHOrGestor])
    def delete_lesson_file(self, request, file_id=None):
        """Delete a lesson file"""
        try:
            lesson_file = LessonFile.objects.get(id=file_id)
            lesson_file.arquivo.delete()  # Delete from S3
            lesson_file.delete()  # Delete from DB
            return Response(status=status.HTTP_204_NO_CONTENT)
        except LessonFile.DoesNotExist:
            return Response({'error': 'Arquivo não encontrado'}, status=status.HTTP_404_NOT_FOUND)


class DiscussionViewSet(viewsets.ModelViewSet):
    queryset = Discussion.objects.select_related('autor').prefetch_related('respostas__autor').all()
    serializer_class = DiscussionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['curso', 'resposta_de']

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsRH()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)


class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.prefetch_related('questoes__opcoes').select_related('curso__criado_por').all()
    serializer_class = AssessmentSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['titulo']
    ordering_fields = ['titulo']
    ordering = ['titulo']
    permission_classes = [IsRHOrGestor]

    def _check_gestor_ownership(self, assessment):
        user = self.request.user
        if user.role == 'rh':
            return
        curso = getattr(assessment, 'curso', None)
        criado_por = curso.criado_por if curso else None
        if criado_por != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Você só pode modificar avaliações de trilhas que criou.')

    def perform_destroy(self, instance):
        self._check_gestor_ownership(instance)
        super().perform_destroy(instance)

    def perform_create(self, serializer):
        # Create Assessment with nested questions and options
        import copy
        questoes_data = copy.deepcopy(self.request.data.get('questoes', []))
        curso_id = self.request.data.get('curso_id')
        assessment = serializer.save()
        
        # Associate with course if provided
        if curso_id:
            try:
                curso = Course.objects.get(id=curso_id)
                curso.avaliacao = assessment
                curso.save()
            except Course.DoesNotExist:
                pass
        
        from .models import Question, QuestionOption
        for q_data in questoes_data:
            opcoes_data = q_data.pop('opcoes', [])
            question = Question.objects.create(
                avaliacao=assessment,
                texto=q_data.get('texto', ''),
                tipo=q_data.get('tipo', 'aberta'),
                resposta_correta=q_data.get('resposta_correta', ''),
                peso=q_data.get('peso', 1)
            )
            for op_data in opcoes_data:
                QuestionOption.objects.create(
                    questao=question,
                    texto=op_data.get('texto', ''),
                    correta=op_data.get('correta', False)
                )

    def perform_update(self, serializer):
        # Update Assessment with nested questions and options
        import copy
        assessment = self.get_object()
        self._check_gestor_ownership(assessment)
        questoes_data = copy.deepcopy(self.request.data.get('questoes', []))
        curso_id = self.request.data.get('curso_id')
        
        # Update course association
        if curso_id:
            try:
                # Remove from old course if exists
                if hasattr(assessment, 'curso') and assessment.curso:
                    old_course = assessment.curso
                    old_course.avaliacao = None
                    old_course.save()
                
                # Associate with new course
                curso = Course.objects.get(id=curso_id)
                curso.avaliacao = assessment
                curso.save()
            except Course.DoesNotExist:
                pass
        
        # Delete existing questions
        assessment.questoes.all().delete()
        
        # Recreate questions
        from .models import Question, QuestionOption
        for q_data in questoes_data:
            opcoes_data = q_data.pop('opcoes', [])
            question = Question.objects.create(
                avaliacao=assessment,
                texto=q_data.get('texto', ''),
                tipo=q_data.get('tipo', 'aberta'),
                resposta_correta=q_data.get('resposta_correta', ''),
                peso=q_data.get('peso', 1)
            )
            for op_data in opcoes_data:
                QuestionOption.objects.create(
                    questao=question,
                    texto=op_data.get('texto', ''),
                    correta=op_data.get('correta', False)
                )
        
        serializer.save()
