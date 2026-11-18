from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CourseProgress

# Serializers for Course Progress


class CourseProgressSerializer(serializers.ModelSerializer):
    colaborador_nome     = serializers.CharField(source='colaborador.nome', read_only=True)
    colaborador          = serializers.PrimaryKeyRelatedField(read_only=True)
    curso_titulo         = serializers.CharField(source='curso.titulo',     read_only=True)
    respostas_com_texto  = serializers.SerializerMethodField()

    def get_respostas_com_texto(self, obj):
        from apps.courses.models import Question
        result = []
        for item in obj.respostas_abertas:
            questao_id = item.get('questao_id')
            resposta   = item.get('resposta', '')
            try:
                q = Question.objects.get(id=questao_id)
                texto = q.texto
            except Exception:
                texto = 'Questão'
            result.append({'questao_id': questao_id, 'questao_texto': texto, 'resposta': resposta})
        return result

    class Meta:
        model = CourseProgress
        fields = [
            'id', 'colaborador', 'colaborador_nome', 'curso', 'curso_titulo',
            'status', 'percentual', 'aulas_completas', 'arquivos_drive_completos', 'tempo_gasto',
            'nota_avaliacao', 'status_avaliacao', 'respostas_abertas',
            'tentativas_realizadas',
            'respostas_com_texto', 'feedback_gestor', 'data_inicio',
            'data_conclusao', 'certificado_gerado', 'atualizado_em',
        ]
        read_only_fields = ['atualizado_em']


class MarkLessonCompleteSerializer(serializers.Serializer):
    aula_id    = serializers.UUIDField()
    tempo_gasto = serializers.IntegerField(min_value=0, default=0)


class SubmitAssessmentSerializer(serializers.Serializer):
    respostas = serializers.ListField(
        child=serializers.DictField()
    )
