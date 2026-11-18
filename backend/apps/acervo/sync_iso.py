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
  • Os códigos são casados SEM a versão: 'FL AL-001-002' na Matriz = 'FL AL- 001-001'
    na Lista Mestra = documento 'FL AL-001'. A versão vigente é a da Lista Mestra
    (se houver mais de uma linha, vale a maior) e fica guardada em Documento.versao.
  • O documento é identificado pelo código (ou, nos antigos, pelo ID do Drive):
    uma nova versão em outro arquivo só troca o arquivo do mesmo documento.
  • Mudou a versão → quem leu a anterior volta a ver o documento como "não lido"
    (nova versão, precisa ler de novo); a leitura antiga fica como histórico.
  • Liberado para os cargos que o têm na Matriz (cargo casado pelo nome).
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

# "IT GP-009-000", "FL AL-001-002" e as variações digitadas na planilha:
# "IT AV 020-002", "FL AL- 001-002", "IT AV-001" (a versão é opcional)
RE_CODIGO = re.compile(r'\b([A-Z]{2,3})\s+([A-Z]{1,4})\s*-?\s*(\d{3})(?:\s*-\s*(\d{3}))?\b')
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
    """Código normalizado e SEM a versão: 'FL AL- 001-002' → 'FL AL-001'."""
    return f'{m.group(1)} {m.group(2)}-{m.group(3)}'


def _versao(m: re.Match) -> str:
    """'FL AL-001-002' → '002' ('' quando a planilha não traz a versão)."""
    return m.group(4) or ''


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

        # Mesmo código em mais de uma linha (versões diferentes): fica a maior
        cod, versao = _codigo(m), _versao(m)
        if cod in lista and lista[cod]['versao'] > versao:
            continue
        lista[cod] = {
            'versao': versao,
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

    cargos_academy = {_norm(c.nome): c for c in Cargo.objects.all()}

    # Agrupa por arquivo do Drive (um mesmo arquivo pode ter mais de um código)
    arquivos = {}
    nao_encontrados = []
    cargos_desconhecidos = set()
    for cod, item in sorted(matriz.items()):
        # Casamento sem a versão; a versão vigente é sempre a da Lista Mestra
        lm = lista.get(cod)
        if not lm:
            nao_encontrados.append(cod)
            continue
        cargos = set()
        for nome in item['cargos']:
            c = cargos_academy.get(_norm(nome))
            if c:
                cargos.add(c.pk)
            else:
                cargos_desconhecidos.add(nome)

        arq = arquivos.setdefault(lm['drive_id'], {
            'codigo': cod, 'nome': item['nome'], 'lm': lm, 'cargos': set(), 'codigos': {},
        })
        arq['cargos'] |= cargos
        arq['codigos'][cod] = lm['versao']
        if not arq['nome'] and item['nome']:
            arq['nome'] = item['nome']

    agora = timezone.now()
    por_codigo, por_drive = {}, {}
    for d in Documento.objects.prefetch_related('cargos').order_by('-ativo', 'criado_em'):
        # prefere o ativo / mais antigo
        if d.codigo:
            por_codigo.setdefault(d.codigo, d)
        por_drive.setdefault(d.drive_id, d)
    usados = set()

    criados = atualizados = 0
    sem_cargo, erros_drive, novas_versoes = [], [], []
    publicados = set()

    for drive_id, arq in arquivos.items():
        if not arq['cargos']:
            sem_cargo.append(arq['codigo'])
            continue

        lm = arq['lm']
        codigos = sorted(arq['codigos'])
        codigo = ' / '.join(codigos)
        versao = ' / '.join(arq['codigos'][c] for c in codigos)
        prefixo = arq['codigo'].split(' ', 1)[0]
        titulo = f"{codigo} - {arq['nome']}" if arq['nome'] else (lm['identificacao'] or codigo)
        descricao = ' · '.join(filter(None, [
            TIPOS.get(prefixo) or lm['tipo'],
            lm['setor'],
            f"Revisão: {lm['revisao']}" if lm['revisao'] and lm['revisao'] != '-' else '',
        ]))

        # Mesmo documento = mesmo código; os antigos (código com versão) são achados pelo arquivo
        doc = por_codigo.get(codigo) or por_drive.get(drive_id)
        if doc is not None and doc.pk in usados:
            doc = None
        if doc is None or doc.drive_id != drive_id:
            # Documento novo, ou nova versão publicada em outro arquivo do Drive
            try:
                info = get_drive_file_info(drive_id)
            except Exception as exc:  # noqa: BLE001
                erros_drive.append({'codigo': codigo, 'drive_id': drive_id, 'erro': str(exc)[:200]})
                if doc is not None:
                    usados.add(doc.pk)
                    publicados.add(doc.pk)  # mantém o arquivo anterior no ar
                continue
            if doc is None:
                doc = Documento()
            doc.drive_id = drive_id
            doc.drive_nome = info['drive_nome']
            doc.drive_mime_type = info['drive_mime_type']
            doc.drive_web_view_link = info['drive_web_view_link']
            doc.drive_thumbnail = info['drive_thumbnail']
            arquivo_trocado = not doc._state.adding
        else:
            arquivo_trocado = False
        usados.add(doc.pk)

        novos_valores = {
            'titulo': titulo[:300], 'descricao': descricao, 'codigo': codigo[:60], 'versao': versao[:30],
            'origem': Documento.ORIGEM_PLANILHA, 'ativo': True,
        }
        # Só grava o que mudou (o banco fica longe: cada consulta custa ~130 ms)
        mudou_campos = (doc._state.adding or arquivo_trocado
                        or any(getattr(doc, k) != v for k, v in novos_valores.items()))
        if not doc._state.adding and doc.versao != versao[:30]:
            novas_versoes.append({'codigo': codigo, 'de': doc.versao, 'para': versao})
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
        # Documentos que mudaram de versão nesta sincronização (quem leu precisa ler de novo)
        'novas_versoes': novas_versoes,
        'pendencias': {
            'codigos_nao_encontrados_na_lista_mestra': nao_encontrados,
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
