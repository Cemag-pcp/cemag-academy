"""
Tabelas da tela de Relatórios, paginadas e agregadas no banco.

Antes o frontend baixava todos os progressos/usuários/trilhas e calculava
as métricas no navegador; aqui cada página traz só as linhas exibidas.
"""
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework import generics, serializers
from rest_framework.filters import SearchFilter

from apps.accounts.models import User
from apps.accounts.permissions import IsRHOrGestor
from apps.courses.models import Course


def _taxa(concluidos, total):
    return round(concluidos / total * 100) if total else 0


class ColaboradorRelatorioSerializer(serializers.ModelSerializer):
    concluidos = serializers.IntegerField()
    total = serializers.IntegerField()
    taxa = serializers.SerializerMethodField()
    tempo_total = serializers.IntegerField()
    media = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'nome', 'matricula', 'cargo', 'departamento',
                  'concluidos', 'total', 'taxa', 'tempo_total', 'media']

    def get_taxa(self, obj):
        return _taxa(obj.concluidos, obj.total)

    def get_media(self, obj):
        return round(obj.media, 1) if obj.media is not None else None


class TrilhaRelatorioSerializer(serializers.ModelSerializer):
    inscritos = serializers.IntegerField()
    concluidos = serializers.IntegerField()
    taxa = serializers.SerializerMethodField()
    media_nota = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'titulo', 'categoria', 'carga_horaria', 'obrigatorio',
                  'publicado', 'inscritos', 'concluidos', 'taxa', 'media_nota']

    def get_taxa(self, obj):
        return _taxa(obj.concluidos, obj.inscritos)

    def get_media_nota(self, obj):
        return round(obj.media_nota, 1) if obj.media_nota is not None else None


class RelatorioColaboradoresView(generics.ListAPIView):
    """GET /dashboard/relatorios/colaboradores/?departamento=&search=&page="""
    permission_classes = [IsRHOrGestor]
    serializer_class = ColaboradorRelatorioSerializer
    filter_backends = [SearchFilter]
    search_fields = ['nome', 'matricula', 'cargo']

    def get_queryset(self):
        qs = User.objects.filter(role='colaborador')
        departamento = self.request.query_params.get('departamento')
        if departamento:
            qs = qs.filter(departamento=departamento)
        return qs.annotate(
            total=Count('progresso_cursos'),
            concluidos=Count('progresso_cursos', filter=Q(progresso_cursos__status='concluido')),
            tempo_total=Coalesce(Sum('progresso_cursos__tempo_gasto'), 0),
            media=Avg('progresso_cursos__nota_avaliacao'),
        ).order_by('nome')


class RelatorioTrilhasView(generics.ListAPIView):
    """GET /dashboard/relatorios/trilhas/?search=&page="""
    permission_classes = [IsRHOrGestor]
    serializer_class = TrilhaRelatorioSerializer
    filter_backends = [SearchFilter]
    search_fields = ['titulo', 'categoria']

    def get_queryset(self):
        return Course.objects.annotate(
            inscritos=Count('progressos'),
            concluidos=Count('progressos', filter=Q(progressos__status='concluido')),
            media_nota=Avg('progressos__nota_avaliacao'),
        ).order_by('titulo')
