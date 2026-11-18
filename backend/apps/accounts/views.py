from rest_framework import generics, status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from .models import User, Department, Cargo
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, CustomTokenObtainPairSerializer,
    DepartmentSerializer, CargoSerializer,
    MeAvatarSerializer, MePerfilSerializer,
)
from .permissions import IsRH, IsRHOrGestor


class LoginView(TokenObtainPairView):
    """Login — retorna access + refresh token + dados do usuário."""
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(generics.GenericAPIView):
    """Invalida o refresh token (blacklist)."""

    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    """Retorna / atualiza o perfil do usuário autenticado."""
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            # Ninguém altera o próprio perfil de acesso/status por aqui;
            # colaborador só troca a foto.
            if self.request.user.role in ('rh', 'gestor'):
                return MePerfilSerializer
            return MeAvatarSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response(UserSerializer(self.get_object(), context=self.get_serializer_context()).data)


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Senha alterada com sucesso.'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('permissions_obj').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'status', 'departamento']
    search_fields = ['matricula', 'nome', 'email', 'cargo', 'departamento']
    ordering_fields = ['nome', 'date_joined', 'data_admissao']
    ordering = ['nome']

    @action(detail=False, methods=['get'], url_path='resumo')
    def resumo(self, request):
        """Totais para os cards da tela de usuários (sem baixar a lista inteira)."""
        from django.db.models import Count, Q
        dados = User.objects.aggregate(
            total=Count('id'),
            ativos=Count('id', filter=Q(status='ativo')),
            inativos=Count('id', filter=Q(status='inativo')),
        )
        return Response(dados)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsRHOrGestor()]
        return [IsRH()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    @action(detail=True, methods=['patch'], url_path='permissions')
    def update_permissions(self, request, pk=None):
        user = self.get_object()
        perm = user.permissions_obj
        for field, value in request.data.items():
            if hasattr(perm, field):
                setattr(perm, field, value)
        perm.save()
        return Response({'detail': 'Permissões atualizadas.'})

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.status = 'inativo' if user.status == 'ativo' else 'ativo'
        user.is_active = user.status == 'ativo'
        user.save()
        return Response(UserSerializer(user).data)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.prefetch_related('colaboradores', 'cargos').select_related('gestor').all()
    serializer_class = DepartmentSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nome', 'gestor__nome']
    ordering_fields = ['nome']
    ordering = ['nome']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsRH()]


class CargoViewSet(viewsets.ModelViewSet):
    queryset = Cargo.objects.prefetch_related('setores')
    serializer_class = CargoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nome', 'descricao']
    ordering_fields = ['nome']
    ordering = ['nome']

    def get_queryset(self):
        qs = super().get_queryset()
        # ?setor=<id> ou ?setor_nome=<nome> → só cargos daquele setor
        setor = self.request.query_params.get('setor')
        setor_nome = self.request.query_params.get('setor_nome')
        if setor:
            qs = qs.filter(setores__id=setor)
        if setor_nome:
            qs = qs.filter(setores__nome=setor_nome)
        return qs.distinct()

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsRH()]
