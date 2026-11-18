from django.contrib import admin
from .models import Documento


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display  = ('titulo', 'drive_id', 'criado_por', 'criado_em', 'ativo')
    list_filter   = ('ativo', 'cargos')
    search_fields = ('titulo', 'drive_id', 'drive_nome')
    filter_horizontal = ('cargos',)
