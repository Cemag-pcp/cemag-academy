from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import LibraryItem
from .serializers import LibraryItemSerializer
from apps.accounts.permissions import IsRHOrGestor


class LibraryItemViewSet(viewsets.ModelViewSet):
    serializer_class = LibraryItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria']
    search_fields = ['titulo', 'descricao', 'tags', 'categoria']
    ordering_fields = ['titulo', 'criado_em', 'downloads']
    ordering = ['-criado_em']

    def get_queryset(self):
        return LibraryItem.objects.select_related('criado_por').prefetch_related('favoritos')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsRHOrGestor()]
        return [permissions.IsAuthenticated()]

    def _check_ownership(self, item):
        user = self.request.user
        if user.role == 'rh':
            return
        if item.criado_por != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Você só pode modificar materiais que você mesmo publicou.')

    @action(detail=False, methods=['get'], url_path='drive-info')
    def drive_info(self, request):
        drive_id = request.query_params.get('drive_id', '').strip()
        if not drive_id:
            return Response({'detail': 'Informe drive_id.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from apps.courses.drive_utils import get_drive_file_info
            return Response(get_drive_file_info(drive_id))
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'detail': f'Erro ao acessar o Drive: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def perform_update(self, serializer):
        self._check_ownership(self.get_object())
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        self._check_ownership(instance)
        super().perform_destroy(instance)

    @action(detail=True, methods=['post'], url_path='download')
    def download(self, request, pk=None):
        item = self.get_object()
        item.downloads += 1
        item.save()
        return Response({'downloads': item.downloads})

    @action(detail=True, methods=['post'], url_path='toggle-favorite')
    def toggle_favorite(self, request, pk=None):
        item = self.get_object()
        user = request.user
        if item.favoritos.filter(pk=user.pk).exists():
            item.favoritos.remove(user)
            return Response({'favorito': False})
        item.favoritos.add(user)
        return Response({'favorito': True})
