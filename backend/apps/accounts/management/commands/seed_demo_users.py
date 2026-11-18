"""
Comando: python manage.py seed_demo_users

Cria os usuários demo presentes no mock-data do frontend,
atribuindo a senha padrão 'cemag2025'.
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import User, Permission


DEMO_USERS = [
    {
        'matricula':    '001',
        'email':        'ana.ferreira@cemag.com.br',
        'nome':         'Ana Paula Ferreira',
        'cargo':        'Analista de RH',
        'departamento': 'Recursos Humanos',
        'role':         'rh',
        'data_admissao': '2019-03-15',
        'permissions': {
            'usuarios': True, 'cursos': True, 'relatorios': True,
            'certificados': True, 'avaliacoes': True,
            'biblioteca': True, 'configuracoes': True,
        },
    },
    {
        'matricula':    '002',
        'email':        'carlos.santos@cemag.com.br',
        'nome':         'Carlos Eduardo Santos',
        'cargo':        'Gerente de Produção',
        'departamento': 'Produção',
        'role':         'gestor',
        'data_admissao': '2017-08-01',
        'permissions': {
            'usuarios': False, 'cursos': True, 'relatorios': True,
            'certificados': True, 'avaliacoes': True,
            'biblioteca': True, 'configuracoes': False,
        },
    },
    {
        'matricula':    '003',
        'email':        'marcos.lima@cemag.com.br',
        'nome':         'Marcos Vinícius Lima',
        'cargo':        'Operador de Máquinas',
        'departamento': 'Produção',
        'role':         'colaborador',
        'data_admissao': '2021-06-10',
        'permissions': {
            'usuarios': False, 'cursos': False, 'relatorios': False,
            'certificados': False, 'avaliacoes': False,
            'biblioteca': True, 'configuracoes': False,
        },
    },
    {
        'matricula':    '004',
        'email':        'juliana.mendes@cemag.com.br',
        'nome':         'Juliana Costa Mendes',
        'cargo':        'Técnica de Segurança',
        'departamento': 'Segurança do Trabalho',
        'role':         'colaborador',
        'data_admissao': '2020-01-20',
        'permissions': {
            'usuarios': False, 'cursos': False, 'relatorios': False,
            'certificados': False, 'avaliacoes': False,
            'biblioteca': True, 'configuracoes': False,
        },
    },
    {
        'matricula':    '005',
        'email':        'roberto.pereira@cemag.com.br',
        'nome':         'Roberto Alves Pereira',
        'cargo':        'Analista de Manutenção',
        'departamento': 'Manutenção',
        'role':         'colaborador',
        'status':       'inativo',
        'data_admissao': '2018-11-05',
        'permissions': {
            'usuarios': False, 'cursos': False, 'relatorios': False,
            'certificados': False, 'avaliacoes': False,
            'biblioteca': True, 'configuracoes': False,
        },
    },
    {
        'matricula':    '006',
        'email':        'fernanda.oliveira@cemag.com.br',
        'nome':         'Fernanda Oliveira',
        'cargo':        'Engenheira Agrícola',
        'departamento': 'Engenharia',
        'role':         'gestor',
        'data_admissao': '2016-04-12',
        'permissions': {
            'usuarios': False, 'cursos': True, 'relatorios': True,
            'certificados': True, 'avaliacoes': True,
            'biblioteca': True, 'configuracoes': False,
        },
    },
]

PASSWORD = 'cemag2025'


class Command(BaseCommand):
    help = 'Cria os usuários demo com senha padrão "cemag2025"'

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for data in DEMO_USERS:
            perms_data = data.pop('permissions')
            status     = data.pop('status', 'ativo')
            email      = data['email']

            user, is_new = User.objects.get_or_create(
                matricula=data['matricula'],
                defaults={**data, 'status': status},
            )

            if is_new:
                user.set_password(PASSWORD)
            else:
                # Atualiza campos sem sobrescrever senha
                for field, value in {**data, 'status': status}.items():
                    setattr(user, field, value)

            # Permissões
            perm = user.permissions_obj
            if perm is None:
                perm = Permission.objects.create(**perms_data)
                user.permissions_obj = perm
            else:
                for field, value in perms_data.items():
                    setattr(perm, field, value)
                perm.save()

            user.is_active = (user.status == 'ativo')
            user.save()

            if is_new:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  OK Criado: {user.matricula} - {user.nome}'))
            else:
                updated += 1
                self.stdout.write(f'  -- Atualizado: {user.matricula} - {user.nome}')

        self.stdout.write(
            self.style.SUCCESS(f'\nConcluído: {created} criado(s), {updated} atualizado(s).')
        )
