from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'tipo', 'titulo', 'mensagem', 'destinatario', 'lida', 'criada_em', 'link']
        read_only_fields = ['criada_em']
