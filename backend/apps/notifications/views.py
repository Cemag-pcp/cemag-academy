from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import Notification
from .serializers import NotificationSerializer
from apps.accounts.permissions import IsRH


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['lida', 'tipo']
    ordering = ['-criada_em']
    pagination_class = None  # Desabilitar paginação para retornar todas as notificações

    def get_queryset(self):
        return Notification.objects.filter(destinatario=self.request.user)

    def get_permissions(self):
        if self.action == 'create':
            return [IsRH()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.lida = True
        notif.save()
        return Response({'lida': True})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        self.get_queryset().filter(lida=False).update(lida=True)
        return Response({'detail': 'Todas as notificações marcadas como lidas.'})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(lida=False).count()
        return Response({'count': count})
