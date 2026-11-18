"""
Sincronização da Documentação ISO com as planilhas da Qualidade.

As planilhas são a fonte da verdade; o Academy é só um espelho para o
colaborador abrir os arquivos sem entrar com o e-mail do Google.

  • Lista Mestra (aba INTERNOS) ...... código do documento → arquivo no Drive
      a coluna IDENTIFICAÇÃO traz o link do Drive embutido na célula
      (ou o próprio ID digitado); o ID é extraído daí.
  • Matriz de Conhecimentos .......... setor/cargo → códigos que o cargo deve ler
      uma aba por setor, cabeçalho "SETOR | CARGOS | ITs | PQs | DQs | RQs | FLUXOG | NRs | CURSOS".

Regras:
  • O documento é identificado pelo ID do Drive (assim "lido" e a lista de
    frequência continuam valendo entre sincronizações).
  • Liberado para os cargos que o têm na Matriz (cargo casado pelo nome).
  • Código da Matriz com versão diferente da Lista Mestra → vale a da Lista Mestra.
  • Documento sem nenhum cargo reconhecido NÃO é publicado (senão ficaria
    visível para todos); aparece nas pendências.
  • Documento que saiu das planilhas é desativado (ativo=False), não apagado.
"""
import logging
import re
import threading
import unicodedata
from collections import defaultdict
from datetime import timedelta

from django.conf import settings
from django.db import close_old_connections, transaction
from django.utils import timezone

from apps.accounts.models import Cargo
from .models import Documento, SincronizacaoISO

log = logging.getLogger(__name__)

# "IT GP-009-000", "PQ GP-001-004", "FL AL-001-002"…
RE_CODIGO = re.compile(r'\b([A-Z]{2,3})\s+([A-Z]{1,4})-(\d{3})-(\d{3})\b')
RE_DRIVE_URL = re.compile(r'/d/([A-Za-z0-9_-]{20,})|[?&]id=([A-Za-z0-9_-]{20,})')
RE_DRIVE_ID = re.compile(r'^[A-Za-z0-9_-]{25,}$')

# Colunas da Matriz que listam documentos (CURSOS fica de fora: trilhas são do Academy)
COLUNAS_DOCUMENTOS = ('ITS', 'PQS', 'DQS', 'RQS', 'FLUXOG', 'NRS')

TIPOS = {
    'IT': 'Instrução de Trabalho', 'PQ': 'Procedimento da Qualidade', 'DQ': 'Documento da Qualidade',
    'RQ': 'Registro da Qualidade', 'FL': 'Fluxograma', 'NR': 'Norma Regulamentadora',
}


def _norm(texto: str) -> str:
    """Maiúsculas, sem acentos e espaços repetidos — para casar nomes de cargos."""
    texto = unicodedata.normalize('NFD', texto or '').encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', texto).strip().upper()


def _codigo(m: re.Match) -> str:
    return f'{m.group(1)} {m.group(2)}-{m.group(3)}-{m.group(4)}'


def _base(codigo: str) -> str:
    """Código sem a versão: 'IT GP-009-000' → 'IT GP-009'."""
    return codigo.rsplit('-', 1)[0]


def _sheets():
    from googleapiclient.discovery import build
    from apps.courses.drive_utils import _get_drive_service
    drive = _get_drive_service()
    return drive, build('sheets', 'v4', credentials=drive._http.credentials, cache_discovery=False)


# ── Leitura das planilhas ──────────────────────────────────────────────────────

def ler_lista_mestra(sheets) -> dict:
    """{código: {'drive_id', 'tipo', 'setor', 'revisao', 'identificacao'}}"""
    aba = settings.ISO_LISTA_MESTRA_ABA
    res = sheets.spreadsheets().get(
        spreadsheetId=settings.ISO_LISTA_MESTRA_ID,
        ranges=[f"'{aba}'!A1:E2000"],
        includeGridData=True,
        fields='sheets(data(rowData(values(formattedValue,hyperlink,'
               'chipRuns(chip(richLinkProperties(uri))),textFormatRuns(format(link(uri)))))))',
    ).execute()
    linhas = res['sheets'][0]['data'][0].get('rowData', [])

    lista = {}
    for row in linhas:
        v = row.get('values', [])
        if len(v) < 4:
            continue
        texto_codigo = (v[0].get('formattedValue') or '').strip()
        if 'OBSOLETO' in texto_codigo.upper():
            continue
        m = RE_CODIGO.search(texto_codigo)
        if not m:
            continue

        cel = v[3]
        ident = (cel.get('formattedValue') or '').strip()
        uris = [cel.get('hyperlink')]
        uris += [r['format']['link']['uri'] for r in cel.get('textFormatRuns', []) if r.get('format', {}).get('link')]
        uris += [c['chip']['richLinkProperties']['uri'] for c in cel.get('chipRuns', [])
                 if c.get('chip', {}).get('richLinkProperties')]
        drive_id = ident if RE_DRIVE_ID.match(ident) else None  # ID digitado direto na célula
        for uri in filter(None, uris):
            if drive_id:
                break
            mu = RE_DRIVE_URL.search(uri)
            if mu:
                drive_id = mu.group(1) or mu.group(2)
        if not drive_id:
            continue

        lista[_codigo(m)] = {
            'drive_id': drive_id,
            'tipo': (v[1].get('formattedValue') or '').strip() if len(v) > 1 else '',
            'setor': (v[2].get('formattedValue') or '').strip() if len(v) > 2 else '',
            'revisao': (v[4].get('formattedValue') or '').strip() if len(v) > 4 else '',
            'identificacao': ident,
        }
    return lista


def ler_matriz(sheets):
    """
    Retorna ({código: {'cargos': {nome do cargo}, 'nome': 'Aplicação de Entrevista'}},
             [abas ignoradas])
    """
    meta = sheets.spreadsheets().get(spreadsheetId=settings.ISO_MATRIZ_ID, fields='sheets(properties(title))').execute()
    abas = [s['properties']['title'] for s in meta['sheets']]
    ranges = [f"'{a}'!A1:I2000" for a in abas]
    dados = sheets.spreadsheets().values().batchGet(spreadsheetId=settings.ISO_MATRIZ_ID, ranges=ranges).execute()

    codigos = defaultdict(lambda: {'cargos': set(), 'nome': ''})
    ignoradas = []
    for aba, vr in zip(abas, dados.get('valueRanges', [])):
        vals = vr.get('values', [])
        hi = next((i for i, l in enumerate(vals) if l and _norm(l[0]) == 'SETOR'), None)
        if hi is None:
            ignoradas.append(aba)  # OPERADORES / INSPETORES: por pessoa, códigos incompletos
            continue
        cab = [_norm(c) for c in vals[hi]]
        cols = [j for j, c in enumerate(cab) if any(c.startswith(p) for p in COLUNAS_DOCUMENTOS)]
        cargo = ''
        for linha in vals[hi + 1:]:
            linha = linha + [''] * (len(cab) - len(linha))
            if len(linha) > 1 and linha[1].strip():
                cargo = linha[1].strip()
            if not cargo:
                continue
            for j in cols:
                for parte in linha[j].splitlines():
                    m = RE_CODIGO.search(parte)
                    if not m:
                        continue
                    item = codigos[_codigo(m)]
                    item['cargos'].add(cargo)
                    # "IT GP-009-000 - Aplicação de Entrevista" → "Aplicação de Entrevista"
                    resto = parte[m.end():].strip(' -–—\t')
                    if resto and not item['nome']:
                        item['nome'] = resto
    return codigos, ignoradas


# ── Sincronização ──────────────────────────────────────────────────────────────

def sincronizar(origem: str = 'manual') -> SincronizacaoISO:
    """Executa a sincronização e devolve o registro com o resumo."""
    registro = SincronizacaoISO.objects.create(origem=origem)
    try:
        resumo = _sincronizar()
        registro.status = SincronizacaoISO.STATUS_OK
        registro.resumo = resumo
    except Exception as exc:  # noqa: BLE001 — o erro fica registrado para o RH ver
        log.exception('Falha na sincronização ISO')
        registro.status = SincronizacaoISO.STATUS_ERRO
        registro.erro = str(exc)[:2000]
    registro.concluido_em = timezone.now()
    registro.save()
    return registro


def _sincronizar() -> dict:
    from apps.courses.drive_utils import get_drive_file_info

    drive, sheets = _sheets()
    lista = ler_lista_mestra(sheets)
    matriz, abas_ignoradas = ler_matriz(sheets)
    # Proteção: planilha renomeada/vazia não pode tirar tudo do ar
    if not lista:
        raise RuntimeError(f'Nenhum documento lido da Lista Mestra (aba "{settings.ISO_LISTA_MESTRA_ABA}").')
    if not matriz:
        raise RuntimeError('Nenhum código lido da Matriz de Conhecimentos.')

    por_base = defaultdict(list)
    for cod in lista:
        por_base[_base(cod)].append(cod)

    cargos_academy = {_norm(c.nome): c for c in Cargo.objects.all()}

    # Agrupa por arquivo do Drive (um mesmo arquivo pode ter mais de um código)
    arquivos = {}
    nao_encontrados, outra_versao = [], []
    cargos_desconhecidos = set()
    for cod, item in sorted(matriz.items()):
        cod_lm = cod if cod in lista else None
        if not cod_lm and por_base.get(_base(cod)):
            cod_lm = sorted(por_base[_base(cod)])[-1]  # versão vigente da Lista Mestra
            outra_versao.append({'matriz': cod, 'lista_mestra': cod_lm})
        if not cod_lm:
            nao_encontrados.append(cod)
            continue

        lm = lista[cod_lm]
        cargos = set()
        for nome in item['cargos']:
            c = cargos_academy.get(_norm(nome))
            if c:
                cargos.add(c.pk)
            else:
                cargos_desconhecidos.add(nome)

        arq = arquivos.setdefault(lm['drive_id'], {
            'codigo': cod_lm, 'nome': item['nome'], 'lm': lm, 'cargos': set(), 'codigos': set(),
        })
        arq['cargos'] |= cargos
        arq['codigos'].add(cod_lm)
        if not arq['nome'] and item['nome']:
            arq['nome'] = item['nome']

    agora = timezone.now()
    existentes = {}
    for d in Documento.objects.prefetch_related('cargos').order_by('-ativo', 'criado_em'):
        existentes.setdefault(d.drive_id, d)  # prefere o ativo / mais antigo

    criados = atualizados = 0
    sem_cargo, erros_drive = [], []
    publicados = set()

    for drive_id, arq in arquivos.items():
        if not arq['cargos']:
            sem_cargo.append(arq['codigo'])
            continue

        lm = arq['lm']
        codigo = ' / '.join(sorted(arq['codigos']))
        prefixo = arq['codigo'].split(' ', 1)[0]
        titulo = f"{codigo} - {arq['nome']}" if arq['nome'] else (lm['identificacao'] or codigo)
        descricao = ' · '.join(filter(None, [
            TIPOS.get(prefixo) or lm['tipo'],
            lm['setor'],
            f"Revisão: {lm['revisao']}" if lm['revisao'] and lm['revisao'] != '-' else '',
        ]))

        doc = existentes.get(drive_id)
        if doc is None:
            try:
                info = get_drive_file_info(drive_id)
            except Exception as exc:  # noqa: BLE001
                erros_drive.append({'codigo': codigo, 'drive_id': drive_id, 'erro': str(exc)[:200]})
                continue
            doc = Documento(
                drive_id=drive_id,
                drive_nome=info['drive_nome'],
                drive_mime_type=info['drive_mime_type'],
                drive_web_view_link=info['drive_web_view_link'],
                drive_thumbnail=info['drive_thumbnail'],
            )
        novos_valores = {
            'titulo': titulo[:300], 'descricao': descricao, 'codigo': codigo[:60],
            'origem': Documento.ORIGEM_PLANILHA, 'ativo': True,
        }
        # Só grava o que mudou (o banco fica longe: cada consulta custa ~130 ms)
        mudou_campos = doc._state.adding or any(getattr(doc, k) != v for k, v in novos_valores.items())
        mudou_cargos = doc._state.adding or {c.pk for c in doc.cargos.all()} != arq['cargos']
        if mudou_campos or mudou_cargos:
            for k, v in novos_valores.items():
                setattr(doc, k, v)
            with transaction.atomic():
                if mudou_campos:
                    if doc._state.adding:
                        criados += 1
                    else:
                        atualizados += 1
                    doc.save()
                if mudou_cargos:
                    if not mudou_campos:
                        atualizados += 1
                    doc.cargos.set(arq['cargos'])
        publicados.add(doc.pk)

    Documento.objects.filter(pk__in=publicados).update(sincronizado_em=agora)
    # O que não está mais nas planilhas sai do ar (registros de leitura são mantidos)
    desativados = Documento.objects.filter(ativo=True).exclude(pk__in=publicados).update(ativo=False)

    return {
        'documentos_publicados': len(publicados),
        'criados': criados,
        'atualizados': atualizados,
        'desativados': desativados,
        'codigos_na_matriz': len(matriz),
        'codigos_na_lista_mestra': len(lista),
        'pendencias': {
            'codigos_nao_encontrados_na_lista_mestra': nao_encontrados,
            'codigos_com_outra_versao': outra_versao,
            'cargos_nao_cadastrados_no_academy': sorted(cargos_desconhecidos),
            'documentos_sem_cargo_reconhecido': sem_cargo,
            'arquivos_sem_acesso_no_drive': erros_drive,
            'abas_ignoradas': abas_ignoradas,
        },
    }


# ── Disparo automático ─────────────────────────────────────────────────────────

_lock = threading.Lock()


def ultima_sincronizacao():
    return SincronizacaoISO.objects.order_by('-iniciado_em').first()


def sincronizacao_em_andamento() -> bool:
    # Execução "presa" há mais de 60 min é considerada abandonada
    # (a primeira carga, que cria tudo e consulta o Drive arquivo a arquivo, leva ~15 min)
    limite = timezone.now() - timedelta(minutes=60)
    return SincronizacaoISO.objects.filter(
        status=SincronizacaoISO.STATUS_EXECUTANDO, iniciado_em__gte=limite,
    ).exists()


def sincronizar_se_preciso():
    """
    Chamado ao abrir a Documentação ISO: se a última sincronização tem mais de
    ISO_SYNC_INTERVALO_MIN minutos, roda outra em segundo plano (não trava a tela).
    """
    ultima = ultima_sincronizacao()
    intervalo = timedelta(minutes=settings.ISO_SYNC_INTERVALO_MIN)
    if ultima and timezone.now() - ultima.iniciado_em < intervalo:
        return False
    if sincronizacao_em_andamento() or not _lock.acquire(blocking=False):
        return False

    def _rodar():
        try:
            sincronizar(origem='automatica')
        finally:
            close_old_connections()
            _lock.release()

    threading.Thread(target=_rodar, daemon=True, name='sync-iso').start()
    return True
