from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Permission, Department, Cargo


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        exclude = ['id']


class UserSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(source='permissions_obj', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'matricula', 'nome', 'email', 'cargo', 'departamento',
            'role', 'status', 'avatar', 'data_admissao',
            'permissions', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'matricula', 'nome', 'email', 'password', 'cargo',
            'departamento', 'role', 'status', 'data_admissao',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['nome', 'cargo', 'departamento', 'role', 'status', 'data_admissao', 'avatar']


AVATAR_MAX_BYTES = 2 * 1024 * 1024


class _AvatarMixin:
    def validate_avatar(self, value):
        if value and value.size > AVATAR_MAX_BYTES:
            raise serializers.ValidationError('A foto deve ter no máximo 2 MB.')
        return value


class MeAvatarSerializer(_AvatarMixin, serializers.ModelSerializer):
    """Usuário básico (colaborador): só pode trocar a própria foto."""
    class Meta:
        model = User
        fields = ['avatar']


class MePerfilSerializer(_AvatarMixin, serializers.ModelSerializer):
    """RH/Gestor no próprio perfil: nome, cargo e foto (nunca role/status)."""
    class Meta:
        model = User
        fields = ['nome', 'cargo', 'avatar']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class CargoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cargo
        fields = ['id', 'nome']


class DepartmentSerializer(serializers.ModelSerializer):
    gestor_nome = serializers.CharField(source='gestor.nome', read_only=True)
    cargos      = CargoMiniSerializer(many=True, read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'nome', 'gestor', 'gestor_nome', 'colaboradores', 'cargos']


class CargoSerializer(serializers.ModelSerializer):
    setores = serializers.PrimaryKeyRelatedField(many=True, queryset=Department.objects.all())
    setores_nomes = serializers.SerializerMethodField()

    class Meta:
        model = Cargo
        fields = ['id', 'nome', 'descricao', 'ativo', 'setores', 'setores_nomes']

    def get_setores_nomes(self, obj):
        return sorted(s.nome for s in obj.setores.all())

    def validate_setores(self, value):
        if not value:
            raise serializers.ValidationError('Informe ao menos um setor.')
        return value
