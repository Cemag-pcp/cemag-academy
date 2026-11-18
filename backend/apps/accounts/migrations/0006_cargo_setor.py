import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_populate_setor_cargo'),
    ]

    operations = [
        migrations.AddField(
            model_name='cargo',
            name='setor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cargos',
                to='accounts.department',
                verbose_name='Setor',
            ),
        ),
    ]
