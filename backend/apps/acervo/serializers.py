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
    nova_versao     = serializers.SerializerMethodField()

    class Meta:
        model  = Documento
        fields = [
            'id', 'titulo', 'descricao',
            'drive_id', 'drive_nome', 'drive_mime_type',
            'drive_web_view_link', 'drive_thumbnail',
            'cargos', 'cargos_ids',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em', 'ativo',
            'codigo', 'versao', 'origem', 'sincronizado_em',
            'is_visto', 'nova_versao',
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def _versoes_lidas(self, obj) -> set:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return set()
        # A view pré-carrega (documento_id, versão) das leituras do usuário numa única consulta
        vistos = self.context.get('vistos')
        if vistos is not None:
            return {v for d, v in vistos if d == obj.pk}
        return set(DocumentoVisto.objects.filter(documento=obj, usuario=request.user)
                   .values_list('versao', flat=True))

    def get_is_visto(self, obj):
        """Lido na versão atual."""
        return obj.versao in self._versoes_lidas(obj)

    def get_nova_versao(self, obj):
        """Leu uma versão anterior, mas não a atual: precisa ler de novo (re-treino)."""
        lidas = self._versoes_lidas(obj)
        return bool(lidas) and obj.versao not in lidas
