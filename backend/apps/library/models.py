import uuid
from django.db import models
from django.conf import settings


class LibraryItem(models.Model):
    id                       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo                   = models.CharField(max_length=300)
    descricao                = models.TextField(blank=True)
    categoria                = models.CharField(max_length=100, blank=True)
    arquivo                  = models.FileField(upload_to='biblioteca/', blank=True, null=True)
    tamanho                  = models.CharField(max_length=30, blank=True)
    drive_id                 = models.CharField(max_length=200, blank=True)
    drive_nome               = models.CharField(max_length=300, blank=True)
    drive_web_view_link      = models.CharField(max_length=500, blank=True)
    roles_permitidas         = models.JSONField(default=list, blank=True)
    departamentos_permitidos = models.JSONField(default=list, blank=True)
    criado_por               = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='biblioteca_items'
    )
    criado_em                = models.DateTimeField(auto_now_add=True)
    downloads                = models.PositiveIntegerField(default=0)
    favoritos                = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='biblioteca_favoritos'
    )
    tags                     = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = 'Item da Biblioteca'
        verbose_name_plural = 'Itens da Biblioteca'
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo
