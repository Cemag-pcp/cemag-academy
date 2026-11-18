from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.accounts.permissions import IsRH


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Logs de auditoria — somente leitura, acesso restrito a RH."""
    queryset = AuditLog.objects.select_related('usuario').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsRH]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['modulo', 'usuario']
    search_fields = ['acao', 'usuario_nome', 'modulo', 'detalhes']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
