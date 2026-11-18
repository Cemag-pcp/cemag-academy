import uuid
from django.db import models
from django.conf import settings


class Documento(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo              = models.CharField(max_length=300)
    descricao           = models.TextField(blank=True)
    drive_id            = models.CharField(max_length=200)
    drive_nome          = models.CharField(max_length=300, blank=True)
    drive_mime_type     = models.CharField(max_length=200, blank=True)
    drive_web_view_link = models.CharField(max_length=500, blank=True)
    drive_thumbnail     = models.CharField(max_length=500, blank=True)
    cargos              = models.ManyToManyField(
        'accounts.Cargo',
        blank=True,
        related_name='documentos',
        verbose_name='Cargos com acesso',
        help_text='Deixe vazio para liberar a todos os cargos.',
    )
    criado_por          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='documentos_criados',
    )
    criado_em           = models.DateTimeField(auto_now_add=True)
    atualizado_em       = models.DateTimeField(auto_now=True)
    ativo               = models.BooleanField(default=True)

    # Espelho das planilhas da Qualidade (Lista Mestra + Matriz de Conhecimentos)
    ORIGEM_MANUAL   = 'manual'
    ORIGEM_PLANILHA = 'planilha'
    origem              = models.CharField(
        max_length=20,
        choices=[(ORIGEM_MANUAL, 'Cadastro manual'), (ORIGEM_PLANILHA, 'Planilha da Qualidade')],
        default=ORIGEM_MANUAL,
    )
    codigo              = models.CharField(max_length=60, blank=True, db_index=True,
                                           help_text='Código na Lista Mestra sem a versão, ex.: IT GP-009')
    versao              = models.CharField(max_length=30, blank=True, default='',
                                           help_text='Versão vigente na Lista Mestra, ex.: 002. '
                                                     'Quando muda, quem leu a anterior precisa ler de novo.')
    sincronizado_em     = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Documento'
        verbose_name_plural = 'Documentos'
        ordering            = ['-criado_em']

    def __str__(self):
        return self.titulo


class DocumentoVisto(models.Model):
    documento  = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='vistos')
    usuario    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documentos_vistos')
    visto_em   = models.DateTimeField(auto_now_add=True)
    # Versão do documento que foi lida: uma nova versão exige nova leitura (re-treino);
    # o registro das versões anteriores fica como histórico.
    versao     = models.CharField(max_length=30, blank=True, default='')

    class Meta:
        unique_together = [('documento', 'usuario', 'versao')]
        verbose_name        = 'Documento Visto'
        verbose_name_plural = 'Documentos Vistos'

    def __str__(self):
        return f'{self.usuario} — {self.documento}'


class SincronizacaoISO(models.Model):
    """Registro de cada sincronização com as planilhas (Lista Mestra + Matriz)."""
    STATUS_EXECUTANDO = 'executando'
    STATUS_OK         = 'ok'
    STATUS_ERRO       = 'erro'

    iniciado_em  = models.DateTimeField(auto_now_add=True)
    concluido_em = models.DateTimeField(null=True, blank=True)
    status       = models.CharField(max_length=20, default=STATUS_EXECUTANDO)
    origem       = models.CharField(max_length=20, default='automatica')  # automatica | manual | comando
    resumo       = models.JSONField(default=dict, blank=True)
    erro         = models.TextField(blank=True)

    class Meta:
        ordering            = ['-iniciado_em']
        verbose_name        = 'Sincronização ISO'
        verbose_name_plural = 'Sincronizações ISO'

    def __str__(self):
        return f'{self.iniciado_em:%d/%m/%Y %H:%M} — {self.status}'
