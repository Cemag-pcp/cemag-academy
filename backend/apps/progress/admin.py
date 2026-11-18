from django.contrib import admin
from .models import CourseProgress


@admin.register(CourseProgress)
class CourseProgressAdmin(admin.ModelAdmin):
    list_display  = ['colaborador', 'curso', 'status', 'percentual', 'nota_avaliacao', 'data_conclusao']
    list_filter   = ['status', 'status_avaliacao']
    search_fields = ['colaborador__nome', 'curso__titulo']
    readonly_fields = ['atualizado_em']
