from rest_framework import serializers
from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    colaborador_nome = serializers.CharField(source='colaborador.nome', read_only=True)
    curso_titulo     = serializers.CharField(source='curso.titulo',     read_only=True)

    class Meta:
        model = Certificate
        fields = [
            'id', 'colaborador', 'colaborador_nome', 'curso', 'curso_titulo',
            'titulo', 'carga_horaria', 'data_conclusao',
            'gestor_nome', 'gestor_cargo', 'emitido_em', 'arquivo',
        ]
        read_only_fields = ['emitido_em']
