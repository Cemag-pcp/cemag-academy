from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['titulo', 'tipo', 'destinatario', 'lida', 'criada_em']
    list_filter   = ['tipo', 'lida']
    search_fields = ['titulo', 'mensagem']
    readonly_fields = ['criada_em']
