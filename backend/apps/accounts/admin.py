from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Permission, Department, Cargo


@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display  = ['nome', 'ativo', 'descricao']
    list_filter   = ['ativo']
    search_fields = ['nome', 'descricao']
    ordering      = ['nome']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuarios', 'cursos', 'relatorios', 'certificados', 'avaliacoes', 'biblioteca', 'configuracoes']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['matricula', 'nome', 'email', 'role', 'status', 'departamento', 'is_staff']
    list_filter   = ['role', 'status', 'is_staff']
    search_fields = ['matricula', 'nome', 'email', 'cargo', 'departamento']
    ordering      = ['nome']
    fieldsets = (
        (None,          {'fields': ('matricula', 'password')}),
        ('Dados',       {'fields': ('nome', 'email', 'cargo', 'departamento', 'role', 'status', 'avatar', 'data_admissao')}),
        ('Permissões',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'permissions_obj')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('matricula', 'nome', 'email', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ['nome', 'gestor']
    search_fields = ['nome']
