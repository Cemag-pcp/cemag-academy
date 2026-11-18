import uuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.conf import settings

# Escala de notas: 0 a 10. A nota do colaborador é a soma dos pontos acertados.
NOTA_MAXIMA = 10
VALIDADORES_NOTA = [MinValueValidator(0), MaxValueValidator(NOTA_MAXIMA)]


class LessonFile(models.Model):
    """Arquivos anexados a uma aula (imagens, PDFs, etc)"""
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aula    = models.ForeignKey('Lesson', on_delete=models.CASCADE, related_name='arquivos')
    arquivo = models.FileField(upload_to='aulas/', help_text='Arquivo da aula')
    nome    = models.CharField(max_length=255, blank=True, help_text='Nome do arquivo')
    tipo    = models.CharField(max_length=50, blank=True, help_text='Tipo MIME')
    tamanho = models.PositiveIntegerField(default=0, help_text='Tamanho em bytes')
    ordem   = models.PositiveSmallIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Arquivo da Aula'
        verbose_name_plural = 'Arquivos das Aulas'
        ordering = ['ordem', 'criado_em']

    def __str__(self):
        return self.nome or f'Arquivo {self.id}'


class Lesson(models.Model):
    class Type(models.TextChoices):
        VIDEO  = 'video',  'Vídeo'
        PDF    = 'pdf',    'PDF'
        IMAGEM = 'imagem', 'Imagem'
        EXCEL  = 'excel',  'Excel'
        TEXTO  = 'texto',  'Texto'
        DRIVE  = 'drive',  'Drive'

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    modulo    = models.ForeignKey('Module', on_delete=models.CASCADE, related_name='aulas')
    titulo    = models.CharField(max_length=300)
    descricao = models.TextField(blank=True)
    tipo      = models.CharField(max_length=10, choices=Type.choices, default=Type.VIDEO)
    conteudo  = models.TextField(blank=True, help_text='URL ou conteúdo da aula')
    duracao   = models.PositiveIntegerField(default=0, help_text='Duração em minutos')
    ordem     = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        ordering = ['ordem']

    def __str__(self):
        return self.titulo


class Module(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    curso     = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='modulos')
    titulo    = models.CharField(max_length=300)
    descricao = models.TextField(blank=True)
    ordem     = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'Módulo'
        verbose_name_plural = 'Módulos'
        ordering = ['ordem']

    def __str__(self):
        return self.titulo


class QuestionOption(models.Model):
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    questao = models.ForeignKey('Question', on_delete=models.CASCADE, related_name='opcoes')
    texto   = models.CharField(max_length=500)
    correta = models.BooleanField(default=False)

    def __str__(self):
        return self.texto


class Question(models.Model):
    class Type(models.TextChoices):
        MULTIPLA_ESCOLHA = 'multipla_escolha', 'Múltipla Escolha'
        ABERTA           = 'aberta',           'Aberta'

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    avaliacao         = models.ForeignKey('Assessment', on_delete=models.CASCADE, related_name='questoes')
    texto             = models.TextField()
    tipo              = models.CharField(max_length=20, choices=Type.choices, default=Type.MULTIPLA_ESCOLHA)
    resposta_correta  = models.TextField(blank=True, help_text='Para questões abertas')
    peso              = models.FloatField(default=1.0, validators=VALIDADORES_NOTA)  # pontos da questão

    class Meta:
        verbose_name = 'Questão'
        verbose_name_plural = 'Questões'

    def __str__(self):
        return self.texto[:80]


class Assessment(models.Model):
    id                     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo                 = models.CharField(max_length=300)
    nota_minima_aprovacao  = models.FloatField(default=7.0, validators=VALIDADORES_NOTA)
    tentativas_permitidas  = models.PositiveSmallIntegerField(default=3)

    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'

    def __str__(self):
        return self.titulo


class Course(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo              = models.CharField(max_length=300)
    descricao           = models.TextField(blank=True)
    thumbnail           = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    carga_horaria       = models.PositiveIntegerField(default=0, help_text='Horas')
    avaliacao           = models.OneToOneField(
        Assessment, on_delete=models.SET_NULL, null=True, blank=True, related_name='curso'
    )
    obrigatorio         = models.BooleanField(default=False)
    prazo               = models.DateField(null=True, blank=True)
    departamentos_alvo  = models.JSONField(default=list, blank=True)  # ids de Department (setores)
    cargos_alvo         = models.JSONField(default=list, blank=True)  # ids de Cargo
    roles_alvo          = models.JSONField(default=list, blank=True)
    colaboradores_alvo  = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='cursos_atribuidos'
    )
    versao              = models.PositiveSmallIntegerField(default=1)
    publicado           = models.BooleanField(default=False)
    criado_por          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='cursos_criados',
    )
    criado_em           = models.DateTimeField(auto_now_add=True)
    atualizado_em       = models.DateTimeField(auto_now=True)
    categoria           = models.CharField(max_length=100, blank=True)
    tags                = models.JSONField(default=list, blank=True)
    instrutor           = models.CharField(max_length=200, blank=True, help_text='Nome do instrutor do curso')

    class Modalidade(models.TextChoices):
        INTERNO  = 'interno',  'Interno'
        EXTERNO  = 'externo',  'Externo'

    modalidade          = models.CharField(
        max_length=10, choices=Modalidade.choices, default=Modalidade.INTERNO
    )
    # Google Drive sync
    drive_folder_id     = models.CharField(max_length=200, null=True, blank=True, help_text='ID da pasta no Google Drive')
    drive_last_sync     = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo


class DriveFile(models.Model):
    """Arquivo sincronizado do Google Drive vinculado a um curso."""
    class MimeCategory(models.TextChoices):
        VIDEO       = 'video',   'Vídeo'
        PDF         = 'pdf',     'PDF'
        SHEET       = 'sheet',   'Planilha'
        DOC         = 'doc',     'Documento'
        SLIDE       = 'slide',   'Apresentação'
        IMAGE       = 'image',   'Imagem'
        OTHER       = 'other',   'Outro'

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course         = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='drive_files')
    drive_id       = models.CharField(max_length=200)
    name           = models.CharField(max_length=500)
    mime_type      = models.CharField(max_length=200)
    category       = models.CharField(max_length=10, choices=MimeCategory.choices, default=MimeCategory.OTHER)
    web_view_link  = models.URLField(max_length=1000, blank=True)
    thumbnail_link = models.URLField(max_length=1000, blank=True)
    size           = models.BigIntegerField(null=True, blank=True)
    modified_at    = models.DateTimeField(null=True, blank=True)
    order          = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'Arquivo Drive'
        verbose_name_plural = 'Arquivos Drive'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Discussion(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    curso       = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='discussoes')
    autor       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='discussoes')
    mensagem    = models.TextField()
    resposta_de = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='respostas')
    criada_em   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Discussão'
        verbose_name_plural = 'Discussões'
        ordering = ['criada_em']

    def __str__(self):
        return f'{self.autor} em {self.curso}'
