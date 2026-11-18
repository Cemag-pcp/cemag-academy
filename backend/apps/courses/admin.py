from django.contrib import admin
from .models import Course, Module, Lesson, LessonFile, Assessment, Question, QuestionOption, Discussion, DriveFile


class LessonFileInline(admin.TabularInline):
    model = LessonFile
    extra = 0
    readonly_fields = ['tipo', 'tamanho', 'criado_em']


class DriveFileInline(admin.TabularInline):
    model = DriveFile
    extra = 0
    readonly_fields = ['drive_id', 'name', 'mime_type', 'category', 'size', 'modified_at', 'order']
    can_delete = False


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


class ModuleInline(admin.StackedInline):
    model = Module
    extra = 0
    show_change_link = True


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 0


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'nota_minima_aprovacao', 'tentativas_permitidas']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['texto', 'tipo', 'peso', 'avaliacao']
    inlines = [QuestionOptionInline]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display  = ['titulo', 'categoria', 'publicado', 'obrigatorio', 'carga_horaria', 'versao', 'drive_folder_id', 'drive_last_sync', 'criado_em']
    list_filter   = ['publicado', 'obrigatorio', 'categoria']
    search_fields = ['titulo', 'descricao']
    inlines       = [ModuleInline, DriveFileInline]
    readonly_fields = ['criado_em', 'atualizado_em', 'drive_last_sync']


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'curso', 'ordem']
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'modulo', 'tipo', 'duracao', 'ordem']
    inlines = [LessonFileInline]


@admin.register(Discussion)
class DiscussionAdmin(admin.ModelAdmin):
    list_display = ['autor', 'curso', 'criada_em']


@admin.register(DriveFile)
class DriveFileAdmin(admin.ModelAdmin):
    list_display  = ['name', 'category', 'course', 'size', 'modified_at', 'order']
    list_filter   = ['category']
    search_fields = ['name', 'drive_id']
    readonly_fields = ['drive_id', 'name', 'mime_type', 'category', 'web_view_link', 'thumbnail_link', 'size', 'modified_at']
