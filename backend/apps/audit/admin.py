from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ['timestamp', 'usuario_nome', 'acao', 'modulo', 'ip']
    list_filter   = ['modulo']
    search_fields = ['usuario_nome', 'acao', 'detalhes']
    readonly_fields = ['timestamp', 'usuario', 'usuario_nome', 'acao', 'modulo', 'detalhes', 'ip']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
