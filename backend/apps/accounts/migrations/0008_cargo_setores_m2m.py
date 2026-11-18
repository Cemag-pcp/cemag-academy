from django.db import migrations, models


class Migration(migrations.Migration):
    """Estrutura: cria Cargo.setores (M2M). O FK antigo vira setor_legado até a cópia em 0009."""

    dependencies = [
        ('accounts', '0007_set_cargo_setor'),
    ]

    operations = [
        migrations.RenameField('cargo', 'setor', 'setor_legado'),
        migrations.AlterField(
            model_name='cargo',
            name='setor_legado',
            field=models.ForeignKey(
                null=True, blank=True, on_delete=models.SET_NULL,
                related_name='+', to='accounts.department',
            ),
        ),
        migrations.AddField(
            model_name='cargo',
            name='setores',
            field=models.ManyToManyField(
                blank=True, related_name='cargos', to='accounts.department', verbose_name='Setores',
            ),
        ),
    ]
