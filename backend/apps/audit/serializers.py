from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'usuario', 'usuario_nome', 'acao', 'modulo', 'detalhes', 'ip', 'timestamp']
        read_only_fields = ['timestamp']
