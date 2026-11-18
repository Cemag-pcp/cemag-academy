from rest_framework import serializers
from .models import LibraryItem


class LibraryItemSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True)
    is_favorito     = serializers.SerializerMethodField()

    class Meta:
        model = LibraryItem
        fields = [
            'id', 'titulo', 'descricao', 'categoria', 'arquivo', 'tamanho',
            'drive_id', 'drive_nome', 'drive_web_view_link',
            'roles_permitidas', 'departamentos_permitidos',
            'criado_por', 'criado_por_nome', 'criado_em',
            'downloads', 'tags', 'is_favorito',
        ]
        read_only_fields = ['criado_por', 'criado_em', 'downloads']

    def get_is_favorito(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favoritos.filter(pk=request.user.pk).exists()
        return False
