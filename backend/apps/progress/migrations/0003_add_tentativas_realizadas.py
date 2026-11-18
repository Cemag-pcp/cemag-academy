from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0002_add_arquivos_drive_completos'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseprogress',
            name='tentativas_realizadas',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
