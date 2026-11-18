from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseprogress',
            name='arquivos_drive_completos',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista de drive_id de arquivos Drive concluídos',
            ),
        ),
    ]
