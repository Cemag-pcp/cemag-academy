from django.contrib import admin
from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display  = ['colaborador', 'titulo', 'curso', 'data_conclusao', 'emitido_em']
    search_fields = ['colaborador__nome', 'titulo', 'curso__titulo']
    readonly_fields = ['emitido_em']
