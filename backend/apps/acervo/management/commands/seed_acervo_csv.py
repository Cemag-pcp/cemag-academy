"""
Comando: python manage.py seed_acervo_csv <caminho_csv>

Cria documentos do Acervo a partir do CSV de controle de ITs
(colunas: Setor, Cargo, Código da IT, ID do Drive).

Linhas com o mesmo ID do Drive são agrupadas em um único documento,
cujo título é o código da IT e cujos "cargos com acesso" são a união
dos cargos de todas as linhas do grupo.

Linhas sem ID do Drive (vazio ou "nao encontrei") são ignoradas.
Documentos cujo drive_id já existe no Acervo são mantidos como estão
(não são recriados nem alterados).
"""
import csv

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Cargo
from apps.acervo.models import Documento


# Correções de IDs com erro de digitação identificados no CSV.
DRIVE_ID_FIXES = {
    'h1CmtZ7qggmT2s41XIcUc_mvEh2IgceHUj': '1CmtZ7qggmT2s41XIcUc_mvEh2IgceHUj',
}


class Command(BaseCommand):
    help = 'Cria documentos do Acervo a partir do CSV de controle de ITs.'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str)

    def handle(self, *args, **options):
        path = options['csv_path']

        groups = {}
        skipped = []

        try:
            with open(path, encoding='utf-8') as f:
                reader = csv.reader(f)
                for i, row in enumerate(reader, 1):
                    if len(row) < 4:
                        skipped.append((i, row))
                        continue
                    setor, cargo, it_code, drive_id = (c.strip() for c in row[:4])
                    if not it_code or not drive_id or drive_id.lower() == 'nao encontrei':
                        skipped.append((i, row))
                        continue
                    drive_id = DRIVE_ID_FIXES.get(drive_id, drive_id)
                    g = groups.setdefault(drive_id, {'titulo': it_code, 'cargos': set()})
                    g['cargos'].add(cargo)
        except FileNotFoundError:
            raise CommandError(f'Arquivo não encontrado: {path}')

        existentes = set(Documento.objects.values_list('drive_id', flat=True))

        from apps.courses.drive_utils import get_drive_file_info

        criados, ja_existiam, erros = [], [], []

        for drive_id, g in groups.items():
            if drive_id in existentes:
                ja_existiam.append((drive_id, g['titulo']))
                continue

            cargos_qs = Cargo.objects.filter(nome__in=g['cargos'])
            faltando = g['cargos'] - set(cargos_qs.values_list('nome', flat=True))
            if faltando:
                erros.append((drive_id, g['titulo'], f'Cargos não encontrados: {sorted(faltando)}'))
                continue

            try:
                info = get_drive_file_info(drive_id)
            except Exception as exc:
                erros.append((drive_id, g['titulo'], f'Drive: {exc}'))
                continue

            doc = Documento.objects.create(
                titulo=g['titulo'],
                drive_id=info['drive_id'],
                drive_nome=info['drive_nome'],
                drive_mime_type=info['drive_mime_type'],
                drive_web_view_link=info['drive_web_view_link'],
                drive_thumbnail=info['drive_thumbnail'],
            )
            doc.cargos.set(cargos_qs)
            criados.append((drive_id, g['titulo'], doc.drive_nome, sorted(g['cargos'])))

        self.stdout.write(self.style.SUCCESS(f'\nCriados: {len(criados)}'))
        for drive_id, titulo, nome, cargos in criados:
            self.stdout.write(f'  + {titulo} -> "{nome}" ({drive_id}) cargos={cargos}')

        self.stdout.write(self.style.WARNING(f'\nJá existiam (mantidos): {len(ja_existiam)}'))
        for drive_id, titulo in ja_existiam:
            self.stdout.write(f'  = {titulo} ({drive_id})')

        self.stdout.write(self.style.ERROR(f'\nErros / não criados: {len(erros)}'))
        for drive_id, titulo, msg in erros:
            self.stdout.write(f'  ! {titulo} ({drive_id}): {msg}')

        self.stdout.write(self.style.WARNING(f'\nLinhas ignoradas do CSV (sem ID do Drive): {len(skipped)}'))
        for i, row in skipped:
            self.stdout.write(f'  - linha {i}: {row}')
