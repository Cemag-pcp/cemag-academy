import uuid
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs',
    )
    usuario_nome = models.CharField(max_length=200, blank=True)
    acao         = models.CharField(max_length=200)
    modulo       = models.CharField(max_length=100, blank=True)
    detalhes     = models.TextField(blank=True)
    ip           = models.GenericIPAddressField(null=True, blank=True)
    timestamp    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Log de Auditoria'
        verbose_name_plural = 'Logs de Auditoria'
        ordering = ['-timestamp']

    def __str__(self):
        return f'[{self.timestamp:%Y-%m-%d %H:%M}] {self.usuario_nome} — {self.acao}'
