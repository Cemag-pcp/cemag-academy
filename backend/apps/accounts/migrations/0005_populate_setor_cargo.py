from django.db import migrations

SETORES_CARGOS = [
    ("GESTÃO DE PESSOAS", [
        "AUXILIAR DE GESTÃO DE PESSOAS",
        "AUXILIAR DE DEPARTAMENTO PESSOAL",
        "ASSISTENTE DE RH 1",
        "ANALISTA DE DEPARTAMENTO PESSOAL III",
        "COORDENADOR (A) DE GESTÃO DE PESSOAS",
    ]),
    ("CONTABILIDADE", [
        "AUXILIAR FISCAL",
        "ASSISTENTE FISCAL",
        "ANALISTA CONTABIL",
        "CONTADOR (A)",
    ]),
    ("FINANCEIRO", [
        "AUXILIAR ADMINISTRATIVO 1",
        "ANALISTA FINANCEIRO",
        "SUPERVISOR (A) FINANCEIRO",
    ]),
    ("GESTÃO INDUSTRIAL", [
        "ASSISTENTE INDUSTRIAL",
        "SUPERVISOR DE PROCESSOS 1",
        "PROCURADOR (A)",
        "GERENTE DE PRODUÇÃO",
        "GERENTE",
        "DIRETOR",
    ]),
    ("PCP", [
        "AUXILIAR PCP",
        "ASSISTENTE DE PCP",
        "ANALISTA DE PCP I",
        "ANALISTA DE PCP III",
        "SUPERVISOR DE PCP",
    ]),
    ("SESMT", [
        "ESTAGIÁRIO DE SESMT",
        "AUXILIAR DE SEGURANÇA DO TRABALHO",
        "TÉCNICO DE SEGURANÇA DO TRABALHO",
        "SUPERVISOR ADMINISTRATIVO",
    ]),
    ("T.I - MANUNTENÇÃO -  REDE", [
        "APRENDIZ ADMINISTRATIVO",
        "SUPERVISOR DE TI",
    ]),
    ("T.I - DESENVOLVIMENTO", [
        "ESTAGIÁRIO (A) T.I",
        "ANALISTA DE SISTEMA",
        "COORDENADOR DE DESENVOLVIMENTO DE SISTEMAS",
    ]),
    ("CARPINTARIA", [
        "AJUDANTE DE CARPINTARIA",
        "CARPINTEIRO",
        "SUPERVISOR DE CARPINTARIA",
    ]),
    ("ALMOXARIFADO", [
        "APRENDIZ DE ALMOXARIFADO",
        "ALMOXARIFE 1 E AUXILIAR",
        "ASSISTENTE DE ALMOXARIFADO",
        "SUPERVISOR DE ALMOXARIFADO 1",
    ]),
    ("COMPRAS", [
        "AUXILIAR DE COMPRAS",
        "ASSISTENTE DE COMPRAS",
        "COORDENADOR DE COMPRAS",
    ]),
    ("CORTE/ ESTAMPARIA", [
        "AJUDANTE DE ESTAMPARIA",
        "OPERADOR DE MÁQUINA ESTAMPARIA",
        "OPERADOR DE EMPILHADEIRA",
        "SUPERVISOR OPERACIONAL 5",
    ]),
    ("PROJETOS", [
        "DESENHISTA",
        "ANALISTA DE PROJETOS",
        "SUPERVISOR DE PROJETOS",
        "COORDENADOR DE ENGENHARIA DE PRODUTOS",
    ]),
    ("QUALIDADE", [
        "APRENDIZ QUALIDADE",
        "ESTAGIÁRIO DE QUALIDADE",
        "INSPETOR DE CONTROLE DE QUALIDADE (RECEBIMENTO)",
        "INSPETOR DE CONTROLE DE QUALIDADE (EXPEDIÇÃO)",
        "INSPETOR DE CONTROLE DE QUALIDADE (PINTURA)",
        "INSPETOR DE CONTROLE DE QUALIDADE (SOLDA)",
        "INSPETOR DE CONTROLE DE QUALIDADE (USINAGEM)",
        "ASSISTENTE CONTROLE DE QUALIDADE",
        "ANALISTA DE QUALIDADE",
        "SUPERVISOR DE QUALIDADE",
    ]),
    ("PROTÓTIPOS", [
        "APRENDIZ DE PROTÓTIPOS",
        "AJUDANTE DE PROTÓTIPOS",
        "SOLDADOR PROTÓTIPOS",
        "SERRALHEIRO PROTÓTIPOS",
        "SUPERVISOR DE PROTÓTIPOS",
    ]),
    ("EXPEDIÇÃO", [
        "APRENDIZ EXPEDIÇÃO",
        "AJUDANTE DE EXPEDIÇÃO",
        "EXPEDIDOR",
        "SUPERVISOR DE OPERAÇÃO 6",
    ]),
    ("MANUTENÇÃO", [
        "APRENDIZ MANUTENÇÃO",
        "ESTAGIÁRIO (A) MANUTENÇÃO",
        "ASSISTENTE DE MANUTENÇÃO",
        "ELETRICISTA DE MANUTENÇÃO",
        "MECÂNICO DE MANUTENÇÃO",
        "SUPERVISOR (A) DE MANUTENÇÃO",
        "COORDENADOR DE MANUTENÇÃO",
    ]),
    ("PREDIAL", [
        "AUXILIAR DE MANUTENÇÃO PREDIAL",
        "AUXILIAR ADMINISTRATIVO",
        "SERVENTE",
        "PEDREIRO",
        "SERRALHEIRO",
    ]),
    ("FORJARIA", [
        "AJUDANTE DE FORJARIA",
        "OPERADOR DE MÁQUINA FORJARIA",
    ]),
    ("PINTURA", [
        "AJUDANTE DE PINTURA",
        "PINTOR",
        "SUPERVISOR DE PINTURA 1",
    ]),
    ("PORTARIA", [
        "PORTEIRO",
    ]),
    ("SOLDA", [
        "AUXILIAR DE SOLDADOR",
        "SOLDADOR",
        "SERRALHEIRO",
        "SUPERVISOR DE OPERACIONAL 7",
    ]),
    ("PROCESSOS", [
        "OPERADOR DE ROBÔ DE SOLDA",
        "ANALISTA DE PROCESSOS",
    ]),
    ("USINAGEM", [
        "OPERADOR DE MÁQUINA USINAGEM",
        "OPERADOR DE CNC",
        "SUPERVISOR OPERACIONAL 4",
    ]),
    ("COMERCIAL", [
        "APRENDIZ ADMINISTRATIVO",
        "AUXILIAR COMERCIAL",
        "ASSISTENTE COMERCIAL",
        "SUPERVISOR (A) COMERCIAL",
        "GERENTE DE VENDAS",
    ]),
    ("MARKETING", [
        "ASSISTENTE ADMINISTRATIVO 1",
        "SUPERVISOR (A) SGQ/MARKETING",
    ]),
    ("PÓS-VENDAS", [
        "APRENDIZ ADMINISTRATIVO",
        "ANALISTA COMERCIAL",
    ]),
]


def populate(apps, schema_editor):
    Department = apps.get_model('accounts', 'Department')
    Cargo = apps.get_model('accounts', 'Cargo')

    for setor_nome, cargos in SETORES_CARGOS:
        Department.objects.get_or_create(nome=setor_nome)
        for cargo_nome in cargos:
            Cargo.objects.get_or_create(nome=cargo_nome)


def depopulate(apps, schema_editor):
    Department = apps.get_model('accounts', 'Department')
    Cargo = apps.get_model('accounts', 'Cargo')

    setor_nomes = {s for s, _ in SETORES_CARGOS}
    cargo_nomes = {c for _, cargos in SETORES_CARGOS for c in cargos}

    Department.objects.filter(nome__in=setor_nomes).delete()
    Cargo.objects.filter(nome__in=cargo_nomes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_alter_user_matricula'),
    ]

    operations = [
        migrations.RunPython(populate, depopulate),
    ]
