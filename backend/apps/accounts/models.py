import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, matricula, password=None, **extra_fields):
        if not matricula:
            raise ValueError('A matrícula é obrigatória.')
        user = self.model(matricula=matricula, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, matricula, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.RH)
        return self.create_user(matricula, password, **extra_fields)


class Permission(models.Model):
    """Permissões granulares por módulo do sistema."""
    usuarios      = models.BooleanField(default=False)
    cursos        = models.BooleanField(default=False)
    relatorios    = models.BooleanField(default=False)
    certificados  = models.BooleanField(default=False)
    avaliacoes    = models.BooleanField(default=False)
    biblioteca    = models.BooleanField(default=True)
    configuracoes = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Permissão'
        verbose_name_plural = 'Permissões'

    def __str__(self):
        return f'Permissões #{self.pk}'


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        RH          = 'rh',          'RH'
        GESTOR      = 'gestor',      'Gestor'
        COLABORADOR = 'colaborador', 'Colaborador'

    class Status(models.TextChoices):
        ATIVO   = 'ativo',   'Ativo'
        INATIVO = 'inativo', 'Inativo'

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matricula       = models.CharField(max_length=20, unique=True)
    nome            = models.CharField(max_length=200)
    email           = models.EmailField(blank=True, default='')
    cargo           = models.CharField(max_length=200, blank=True)
    departamento    = models.CharField(max_length=200, blank=True)
    role            = models.CharField(max_length=20, choices=Role.choices, default=Role.COLABORADOR)
    status          = models.CharField(max_length=10, choices=Status.choices, default=Status.ATIVO)
    avatar          = models.ImageField(upload_to='avatars/', null=True, blank=True)
    data_admissao   = models.DateField(null=True, blank=True)
    permissions_obj = models.OneToOneField(
        Permission,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='user',
    )

    # Django internals
    is_staff  = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'matricula'
    REQUIRED_FIELDS = ['nome']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome} [{self.matricula}]'

    def save(self, *args, **kwargs):
        # Auto-create permission object if missing
        if not self.permissions_obj_id:
            perm = Permission.objects.create()
            self.permissions_obj = perm
        super().save(*args, **kwargs)


class Cargo(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome      = models.CharField(max_length=200, unique=True)
    descricao = models.TextField(blank=True)
    ativo     = models.BooleanField(default=True)
    # Um cargo pode existir em vários setores (ex.: Serralheiro em Predial e Solda)
    setores   = models.ManyToManyField(
        'Department',
        blank=True,
        related_name='cargos',
        verbose_name='Setores',
    )

    class Meta:
        verbose_name = 'Cargo'
        verbose_name_plural = 'Cargos'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Department(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome         = models.CharField(max_length=200, unique=True)
    gestor       = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='departamentos_gerenciados',
    )
    colaboradores = models.ManyToManyField(User, blank=True, related_name='departamentos')

    class Meta:
        verbose_name = 'Departamento'
        verbose_name_plural = 'Departamentos'
        ordering = ['nome']

    def __str__(self):
        return self.nome
