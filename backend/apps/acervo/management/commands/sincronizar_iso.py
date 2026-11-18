"""
python manage.py sincronizar_iso

Sincroniza a Documentação ISO com a Lista Mestra e a Matriz de Conhecimentos
(ver apps/acervo/sync_iso.py). Pode ser agendado num cron, se desejado.
"""
import json

from django.core.management.base import BaseCommand

from apps.acervo.sync_iso import sincronizar


class Command(BaseCommand):
    help = 'Sincroniza a Documentação ISO com as planilhas da Qualidade.'

    def handle(self, *args, **options):
        reg = sincronizar(origem='comando')
        if reg.status != 'ok':
            self.stderr.write(self.style.ERROR(f'Erro: {reg.erro}'))
            return
        r = dict(reg.resumo)
        pend = r.pop('pendencias', {})
        self.stdout.write(self.style.SUCCESS(json.dumps(r, ensure_ascii=False, indent=2)))
        for chave, itens in pend.items():
            self.stdout.write(self.style.WARNING(f'\n{chave}: {len(itens)}'))
            for i in itens[:50]:
                self.stdout.write(f'  - {i}')
