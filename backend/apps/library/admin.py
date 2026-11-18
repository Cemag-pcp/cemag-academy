from django.contrib import admin
from .models import LibraryItem


@admin.register(LibraryItem)
class LibraryItemAdmin(admin.ModelAdmin):
    list_display  = ['titulo', 'categoria', 'downloads', 'criado_em']
    search_fields = ['titulo', 'descricao']
    list_filter   = ['categoria']
    readonly_fields = ['criado_em', 'downloads']
