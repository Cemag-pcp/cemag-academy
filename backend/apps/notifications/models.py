import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Type(models.TextChoices):
        CURSO_ATRIBUIDO     = 'curso_atribuido',     'Curso Atribuído'
        PRAZO_PROXIMO       = 'prazo_proximo',       'Prazo Próximo'
        AVALIACAO_PENDENTE  = 'avaliacao_pendente',  'Avaliação Pendente'
        AVALIACAO_REVISAO   = 'avaliacao_revisao',   'Avaliação Aguardando Revisão'
        CERTIFICADO_EMITIDO = 'certificado_emitido', 'Certificado Emitido'
        AVALIACAO_RESULTADO = 'avaliacao_resultado', 'Resultado de Avaliação'

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tipo         = models.CharField(max_length=30, choices=Type.choices)
    titulo       = models.CharField(max_length=300)
    mensagem     = models.TextField()
    destinatario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificacoes'
    )
    lida         = models.BooleanField(default=False)
    criada_em    = models.DateTimeField(auto_now_add=True)
    link         = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-criada_em']

    def __str__(self):
        return f'{self.titulo} → {self.destinatario}'
