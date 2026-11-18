from rest_framework import serializers
from .models import (
    Course, Module, Lesson, LessonFile, Assessment, Question, QuestionOption, Discussion, DriveFile,
    NOTA_MAXIMA,
)


class LessonFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = LessonFile
        fields = ['id', 'arquivo', 'url', 'nome', 'tipo', 'tamanho', 'ordem']
        read_only_fields = ['tamanho', 'tipo']

    def get_url(self, obj):
        """Return the full URL of the file"""
        if obj.arquivo:
            return obj.arquivo.url
        return None


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'texto', 'correta']


class QuestionSerializer(serializers.ModelSerializer):
    opcoes = QuestionOptionSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ['id', 'texto', 'tipo', 'resposta_correta', 'peso', 'opcoes']

    def create(self, validated_data):
        opcoes_data = validated_data.pop('opcoes', [])
        questao = Question.objects.create(**validated_data)
        for op in opcoes_data:
            QuestionOption.objects.create(questao=questao, **op)
        return questao


class AssessmentSerializer(serializers.ModelSerializer):
    questoes = QuestionSerializer(many=True, read_only=True)
    curso_id = serializers.SerializerMethodField()
    criado_por_id = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = ['id', 'titulo', 'nota_minima_aprovacao', 'tentativas_permitidas', 'questoes', 'curso_id', 'criado_por_id']

    def validate(self, attrs):
        # A nota do colaborador é a soma dos pontos acertados (escala 0–10), então as
        # questões precisam somar no mínimo a nota mínima e no máximo 10
        nota_minima = attrs.get(
            'nota_minima_aprovacao',
            self.instance.nota_minima_aprovacao if self.instance else 7.0,
        )

        if 'questoes' in self.initial_data:
            questoes = self.initial_data.get('questoes') or []
            pesos = []
            for i, q in enumerate(questoes, start=1):
                try:
                    peso = float(q.get('peso', 1))
                except (TypeError, ValueError):
                    raise serializers.ValidationError({'questoes': f'Questão {i}: pontos inválidos.'})
                if not 0 <= peso <= NOTA_MAXIMA:
                    raise serializers.ValidationError(
                        {'questoes': f'Questão {i}: os pontos devem ficar entre 0 e {NOTA_MAXIMA}.'}
                    )
                pesos.append(peso)
        elif self.instance:
            pesos = list(self.instance.questoes.values_list('peso', flat=True))
        else:
            pesos = []

        if pesos:
            total = round(sum(pesos), 2)
            if total > NOTA_MAXIMA:
                raise serializers.ValidationError(
                    {'questoes': f'A soma dos pontos ({total:g}) passa de {NOTA_MAXIMA}.'}
                )
            if total < nota_minima:
                raise serializers.ValidationError(
                    {'questoes': f'A soma dos pontos ({total:g}) é menor que a nota mínima ({nota_minima:g}).'}
                )
        return attrs

    def get_curso_id(self, obj):
        if hasattr(obj, 'curso') and obj.curso:
            return str(obj.curso.id)

    def get_criado_por_id(self, obj):
        if hasattr(obj, 'curso') and obj.curso and obj.curso.criado_por:
            return str(obj.curso.criado_por_id)
        return None


class LessonSerializer(serializers.ModelSerializer):
    titulo   = serializers.CharField(allow_blank=True, default='')
    conteudo = serializers.CharField(required=False, allow_blank=True, default='')
    arquivos = LessonFileSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ['id', 'titulo', 'descricao', 'tipo', 'conteudo', 'duracao', 'ordem', 'arquivos']


class ModuleSerializer(serializers.ModelSerializer):
    aulas = LessonSerializer(many=True, required=False)

    class Meta:
        model = Module
        fields = ['id', 'titulo', 'descricao', 'ordem', 'aulas']


class CourseListSerializer(serializers.ModelSerializer):
    """Serializer leve para listagem."""
    total_aulas = serializers.SerializerMethodField()
    total_inscritos = serializers.SerializerMethodField()
    media_avaliacao = serializers.SerializerMethodField()

    criado_por_id   = serializers.UUIDField(source='criado_por.id',   read_only=True, default=None)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True, default=None)
    tem_avaliacao   = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'titulo', 'descricao', 'thumbnail', 'carga_horaria',
            'obrigatorio', 'prazo', 'publicado', 'categoria', 'tags',
            'criado_em', 'versao', 'modalidade', 'criado_por_id', 'criado_por_nome',
            'tem_avaliacao',
            'total_aulas', 'total_inscritos', 'media_avaliacao',
        ]

    def get_total_aulas(self, obj):
        from apps.courses.models import Lesson
        return Lesson.objects.filter(modulo__curso=obj).count()

    def get_total_inscritos(self, obj):
        from apps.progress.models import CourseProgress
        return CourseProgress.objects.filter(curso=obj).count()

    def get_media_avaliacao(self, obj):
        from apps.progress.models import CourseProgress
        from django.db.models import Avg
        avg = CourseProgress.objects.filter(curso=obj, nota_avaliacao__isnull=False).aggregate(avg=Avg('nota_avaliacao'))['avg']
        return round(avg, 1) if avg else 0

    def get_tem_avaliacao(self, obj):
        return obj.avaliacao_id is not None


class DriveFileSerializer(serializers.ModelSerializer):
    embed_url = serializers.SerializerMethodField()

    class Meta:
        model = DriveFile
        fields = [
            'id', 'drive_id', 'name', 'mime_type', 'category',
            'web_view_link', 'thumbnail_link', 'embed_url',
            'size', 'modified_at', 'order',
        ]

    def get_embed_url(self, obj):
        """Return a Drive embed/preview URL based on file type."""
        fid = obj.drive_id
        if obj.category in ('video', 'pdf', 'image', 'other'):
            return f'https://drive.google.com/file/d/{fid}/preview'
        if obj.category == 'sheet':
            return f'https://docs.google.com/spreadsheets/d/{fid}/preview'
        if obj.category == 'doc':
            return f'https://docs.google.com/document/d/{fid}/preview'
        if obj.category == 'slide':
            return f'https://docs.google.com/presentation/d/{fid}/preview'
        return obj.web_view_link


class CourseDetailSerializer(serializers.ModelSerializer):
    modulos      = ModuleSerializer(many=True, required=False)
    avaliacao    = AssessmentSerializer(required=False, allow_null=True)
    drive_files  = DriveFileSerializer(many=True, read_only=True)
    drive_folder_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Course
        fields = [
            'id', 'titulo', 'descricao', 'thumbnail', 'carga_horaria',
            'modulos', 'avaliacao', 'obrigatorio', 'prazo',
            'departamentos_alvo', 'cargos_alvo', 'roles_alvo', 'colaboradores_alvo',
            'versao', 'publicado', 'criado_por', 'criado_em', 'atualizado_em',
            'categoria', 'tags', 'instrutor', 'modalidade',
            'drive_folder_id', 'drive_last_sync', 'drive_files',
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'drive_last_sync', 'drive_files']

    def create(self, validated_data):
        modulos_data   = validated_data.pop('modulos', [])
        avaliacao_data = validated_data.pop('avaliacao', None)
        colaboradores  = validated_data.pop('colaboradores_alvo', [])

        if avaliacao_data:
            questoes_data = avaliacao_data.pop('questoes', [])
            avaliacao = Assessment.objects.create(**avaliacao_data)
            for q in questoes_data:
                opcoes = q.pop('opcoes', [])
                questao = Question.objects.create(avaliacao=avaliacao, **q)
                for op in opcoes:
                    QuestionOption.objects.create(questao=questao, **op)
            validated_data['avaliacao'] = avaliacao

        course = Course.objects.create(**validated_data)
        course.colaboradores_alvo.set(colaboradores)

        for mod_data in modulos_data:
            aulas_data = mod_data.pop('aulas', [])
            aulas_data = [a for a in aulas_data if a.get('titulo', '').strip()]
            if not aulas_data and validated_data.get('drive_folder_id'):
                continue
            modulo = Module.objects.create(curso=course, **mod_data)
            for aula_data in aulas_data:
                Lesson.objects.create(modulo=modulo, **aula_data)

        return course

    def update(self, instance, validated_data):
        modulos_data   = validated_data.pop('modulos', None)
        avaliacao_data = validated_data.pop('avaliacao', None)
        colaboradores  = validated_data.pop('colaboradores_alvo', None)

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update colaboradores
        if colaboradores is not None:
            instance.colaboradores_alvo.set(colaboradores)

        # Update or create assessment
        if avaliacao_data is not None:
            questoes_data = avaliacao_data.pop('questoes', [])
            if instance.avaliacao:
                # Update existing assessment
                for attr, value in avaliacao_data.items():
                    setattr(instance.avaliacao, attr, value)
                instance.avaliacao.save()
                # Clear and recreate questions
                instance.avaliacao.questoes.all().delete()
            else:
                # Create new assessment
                instance.avaliacao = Assessment.objects.create(**avaliacao_data)
                instance.save()
            
            # Create questions
            for q in questoes_data:
                opcoes = q.pop('opcoes', [])
                questao = Question.objects.create(avaliacao=instance.avaliacao, **q)
                for op in opcoes:
                    QuestionOption.objects.create(questao=questao, **op)

        # Update modules
        if modulos_data is not None:
            # Delete existing modules and lessons
            instance.modulos.all().delete()
            
            # Create new modules and lessons (ignora aulas sem título)
            for mod_data in modulos_data:
                aulas_data = mod_data.pop('aulas', [])
                aulas_data = [a for a in aulas_data if a.get('titulo', '').strip()]
                if not aulas_data and instance.drive_folder_id:
                    continue
                modulo = Module.objects.create(curso=instance, **mod_data)
                for aula_data in aulas_data:
                    Lesson.objects.create(modulo=modulo, **aula_data)

        return instance


class DiscussionSerializer(serializers.ModelSerializer):
    autor_nome   = serializers.CharField(source='autor.nome', read_only=True)
    autor_avatar = serializers.ImageField(source='autor.avatar', read_only=True)
    respostas    = serializers.SerializerMethodField()

    class Meta:
        model = Discussion
        fields = ['id', 'curso', 'autor', 'autor_nome', 'autor_avatar', 'mensagem', 'resposta_de', 'respostas', 'criada_em']
        read_only_fields = ['autor', 'criada_em']

    def get_respostas(self, obj):
        qs = obj.respostas.select_related('autor').all()
        return DiscussionSerializer(qs, many=True).data
