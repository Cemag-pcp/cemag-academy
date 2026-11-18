from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_add_cargo_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='matricula',
            field=models.CharField(max_length=20, unique=True, null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
    ]
