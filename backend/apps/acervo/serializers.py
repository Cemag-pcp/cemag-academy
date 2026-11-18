from rest_framework import serializers
from .models import Documento, DocumentoVisto
from apps.accounts.models import Cargo


class CargoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Cargo
        fields = ['id', 'nome']


class DocumentoSerializer(serializers.ModelSerializer):
    cargos          = CargoMiniSerializer(many=True, read_only=True)
    cargos_ids      = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Cargo.objects.all(),
        write_only=True,
        required=False,
        source='cargos',
    )
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True)
    is_visto        = serializers.SerializerMethodField()

    class Meta:
        model  = Documento
        fields = [
            'id', 'titulo', 'descricao',
            'drive_id', 'drive_nome', 'drive_mime_type',
            'drive_web_view_link', 'drive_thumbnail',
            'cargos', 'cargos_ids',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em', 'ativo',
            'codigo', 'origem', 'sincronizado_em',
            'is_visto',
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def get_is_visto(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # A view pré-carrega os ids vistos pelo usuário numa única consulta
        vistos_ids = self.context.get('vistos_ids')
        if vistos_ids is not None:
            return obj.pk in vistos_ids
        return DocumentoVisto.objects.filter(documento=obj, usuario=request.user).exists()
