import uuid
from django.db import models
from django.conf import settings


class Certificate(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    colaborador      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificados'
    )
    curso            = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, related_name='certificados'
    )
    titulo           = models.CharField(max_length=300)
    carga_horaria    = models.PositiveIntegerField(default=0)
    data_conclusao   = models.DateField()
    gestor_nome      = models.CharField(max_length=200, blank=True)
    gestor_cargo     = models.CharField(max_length=200, blank=True)
    emitido_em       = models.DateTimeField(auto_now_add=True)
    arquivo          = models.FileField(upload_to='certificados/', null=True, blank=True)

    class Meta:
        verbose_name = 'Certificado'
        verbose_name_plural = 'Certificados'
        ordering = ['-emitido_em']
        unique_together = [('colaborador', 'curso')]

    def __str__(self):
        return f'{self.colaborador.nome} — {self.titulo}'
