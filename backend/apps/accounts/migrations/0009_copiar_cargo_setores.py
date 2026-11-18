from django.db import migrations

# Cargos que aparecem em mais de um setor no setor_cargo.csv. Com o FK antigo
# só um dos setores ficava gravado; aqui completamos os demais vínculos.
CARGOS_MULTISSETOR = {
    'APRENDIZ ADMINISTRATIVO': ['COMERCIAL', 'PÓS-VENDAS', 'T.I - MANUNTENÇÃO -  REDE'],
    'SERRALHEIRO': ['PREDIAL', 'SOLDA'],
}


def copiar_setor_para_setores(apps, schema_editor):
    Cargo = apps.get_model('accounts', 'Cargo')
    Department = apps.get_model('accounts', 'Department')
    Through = Cargo.setores.through

    pares = set(
        Cargo.objects.exclude(setor_legado__isnull=True).values_list('id', 'setor_legado_id')
    )
    for nome_cargo, nomes_setores in CARGOS_MULTISSETOR.items():
        cargo_id = Cargo.objects.filter(nome=nome_cargo).values_list('id', flat=True).first()
        if not cargo_id:
            continue
        for setor_id in Department.objects.filter(nome__in=nomes_setores).values_list('id', flat=True):
            pares.add((cargo_id, setor_id))

    Through.objects.bulk_create(
        [Through(cargo_id=c, department_id=d) for c, d in pares],
        ignore_conflicts=True,
    )


def copiar_setores_para_setor(apps, schema_editor):
    Cargo = apps.get_model('accounts', 'Cargo')
    for cargo in Cargo.objects.all():
        primeiro = cargo.setores.order_by('nome').first()
        if primeiro:
            cargo.setor_legado = primeiro
            cargo.save(update_fields=['setor_legado'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_cargo_setores_m2m'),
    ]

    operations = [
        migrations.RunPython(copiar_setor_para_setores, copiar_setores_para_setor),
        migrations.RemoveField('cargo', 'setor_legado'),
    ]
