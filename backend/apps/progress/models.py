from django.db import models
from django.conf import settings


class CourseProgress(models.Model):
    class Status(models.TextChoices):
        NAO_INICIADO = 'nao_iniciado', 'Não Iniciado'
        EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
        CONCLUIDO    = 'concluido',    'Concluído'
        REPROVADO    = 'reprovado',    'Reprovado'

    class EvaluationStatus(models.TextChoices):
        PENDENTE  = 'pendente',  'Pendente'
        APROVADO  = 'aprovado',  'Aprovado'
        REPROVADO = 'reprovado', 'Reprovado'

    colaborador         = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='progresso_cursos'
    )
    curso               = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, related_name='progressos'
    )
    status              = models.CharField(max_length=20, choices=Status.choices, default=Status.NAO_INICIADO)
    percentual          = models.FloatField(default=0.0)
    aulas_completas          = models.JSONField(default=list, blank=True, help_text='Lista de IDs de aulas')
    arquivos_drive_completos = models.JSONField(default=list, blank=True, help_text='Lista de drive_id de arquivos Drive concluídos')
    tempo_gasto         = models.PositiveIntegerField(default=0, help_text='Minutos gastos')
    nota_avaliacao      = models.FloatField(null=True, blank=True)
    status_avaliacao    = models.CharField(
        max_length=20, choices=EvaluationStatus.choices, null=True, blank=True
    )
    respostas_abertas   = models.JSONField(default=list, blank=True)
    tentativas_realizadas = models.PositiveSmallIntegerField(default=0)
    feedback_gestor     = models.TextField(blank=True)
    data_inicio         = models.DateField(null=True, blank=True)
    data_conclusao      = models.DateField(null=True, blank=True)
    certificado_gerado  = models.BooleanField(default=False)
    atualizado_em       = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Progresso de Curso'
        verbose_name_plural = 'Progressos de Cursos'
        unique_together = [('colaborador', 'curso')]
        ordering = ['-atualizado_em']

    def __str__(self):
        return f'{self.colaborador} — {self.curso} ({self.percentual:.0f}%)'
