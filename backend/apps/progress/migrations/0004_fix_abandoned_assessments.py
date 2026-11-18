from django.db import migrations


def fix_abandoned_assessments(apps, schema_editor):
    CourseProgress = apps.get_model('progress', 'CourseProgress')
    # Pendente com respostas_abertas vazias = abandono anterior ao fix
    qs = CourseProgress.objects.filter(
        status_avaliacao='pendente',
        respostas_abertas=[],
    )
    qs.update(
        status_avaliacao='reprovado',
        status='reprovado',
        nota_avaliacao=0,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0003_add_tentativas_realizadas'),
    ]

    operations = [
        migrations.RunPython(fix_abandoned_assessments, migrations.RunPython.noop),
    ]
