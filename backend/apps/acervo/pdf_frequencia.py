"""
Gerador de PDF — Lista de Frequência de Treinamento (Acervo)
Layout A4 retrato, fiel ao modelo CEMAG RQ GP-004-001.
"""
import os
from io import BytesIO
from datetime import date

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors

PAGE_W, PAGE_H = A4          # 595.28 × 841.89 pt

ORANGE      = HexColor('#F07820')
ORANGE_DARK = HexColor('#D06010')
GRAY_LIGHT  = HexColor('#F2F2F2')
GRAY_MED    = HexColor('#C8C8C8')
GRAY_DARK   = HexColor('#888888')
TEXT_DARK   = HexColor('#1A1A1A')
BLUE_LINK   = HexColor('#0563C1')

MARGIN_L = 1.5 * cm
MARGIN_R = 1.5 * cm
MARGIN_T = 1.5 * cm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

ORANGE_BAR_W = 0.7 * cm   # faixa laranja vertical esquerda


def _logo_path():
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(
        os.path.join(here, '..', '..', '..', 'frontend', 'public', 'cemag-logo.png')
    )


def _draw_logo(c_obj, x, y, max_w, max_h):
    path = _logo_path()
    if not os.path.exists(path):
        return
    try:
        from PIL import Image as PilImage
        with PilImage.open(path) as im:
            iw, ih = im.size
        ratio  = iw / ih
        draw_h = min(max_h, max_w / ratio)
        draw_w = draw_h * ratio
        c_obj.drawImage(
            ImageReader(path),
            x, y, width=draw_w, height=draw_h,
            preserveAspectRatio=True, mask='auto',
        )
    except Exception:
        pass


def _cell(c_obj, x, y, w, h, text='', font='Helvetica', size=8,
          align='left', fill_color=None, text_color=None,
          border=True, bold=False):
    """Desenha uma célula retangular com texto (suporta múltiplas linhas via \\n)."""
    if fill_color:
        c_obj.setFillColor(fill_color)
        c_obj.rect(x, y, w, h, fill=1, stroke=0)

    if border:
        c_obj.setStrokeColor(GRAY_MED)
        c_obj.setLineWidth(0.4)
        c_obj.rect(x, y, w, h, fill=0, stroke=1)

    if text:
        c_obj.setFillColor(text_color or TEXT_DARK)
        fn = 'Helvetica-Bold' if bold else font
        c_obj.setFont(fn, size)
        pad  = 0.18 * cm
        lines = text.split('\n')
        line_h = size * 1.25   # espaçamento entre linhas em pt
        total_h = line_h * len(lines)
        y_start = y + h / 2 + total_h / 2 - size * 0.9

        for i, line in enumerate(lines):
            ly = y_start - i * line_h
            if align == 'center':
                c_obj.drawCentredString(x + w / 2, ly, line)
            elif align == 'right':
                c_obj.drawRightString(x + w - pad, ly, line)
            else:
                c_obj.drawString(x + pad, ly, line)


def generate_frequencia_pdf(documento) -> BytesIO:
    """
    Gera o PDF de lista de frequência para um documento do Acervo.

    Args:
        documento: instância de Documento (com prefetch de vistos__usuario)

    Returns:
        BytesIO com o PDF gerado
    """
    from django.utils import timezone

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))

    hoje      = date.today()
    emissao   = documento.criado_em.strftime('%d/%m/%Y') if documento.criado_em else hoje.strftime('%d/%m/%Y')
    revisao   = documento.atualizado_em.strftime('%d/%m/%Y') if documento.atualizado_em else hoje.strftime('%d/%m/%Y')
    instrutor = documento.criado_por.nome if documento.criado_por else '—'

    # Registros de visualização ordenados por nome
    vistos = list(
        documento.vistos.filter(versao=documento.versao)  # só quem leu a versão atual
        .select_related('usuario').order_by('usuario__nome')
    )

    # ── Faixa laranja vertical (margem esquerda) ───────────────────────────────
    c.setFillColor(ORANGE)
    c.rect(MARGIN_L - ORANGE_BAR_W, MARGIN_T, ORANGE_BAR_W, PAGE_H - MARGIN_T * 2, fill=1, stroke=0)

    x0    = MARGIN_L           # início do conteúdo (após barra laranja)
    y_cur = PAGE_H - MARGIN_T  # cursor Y, de cima para baixo

    # ── Bloco 1: Cabeçalho (logo | título | info) ─────────────────────────────
    hdr_h       = 3.0 * cm
    logo_col_w  = 3.2 * cm
    title_col_w = CONTENT_W - logo_col_w - 5.2 * cm
    info_col_w  = 5.2 * cm

    y_cur -= hdr_h

    # Célula logo
    _cell(c, x0, y_cur, logo_col_w, hdr_h, border=True)
    _draw_logo(c, x0 + 0.3 * cm, y_cur + 0.3 * cm, logo_col_w - 0.6 * cm, hdr_h - 0.6 * cm)

    # Célula título
    tx = x0 + logo_col_w
    _cell(c, tx, y_cur, title_col_w, hdr_h, border=True)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 10)
    c.drawCentredString(tx + title_col_w / 2, y_cur + hdr_h * 0.62, 'FREQUÊNCIA DE TREINAMENTO')
    c.setFont('Helvetica-Bold', 10)
    c.drawCentredString(tx + title_col_w / 2, y_cur + hdr_h * 0.35, 'E DESENVOLVIMENTO')

    # Célula info (CÓDIGO / DATA EMISSÃO / DATA REVISÃO / PÁGINA)
    ix     = tx + title_col_w
    row_h  = hdr_h / 4
    labels = ['CÓDIGO:', 'DATA EMISSÃO:', 'DATA DA ÚLTIMA\nREVISÃO:', 'PÁGINA:']
    values = ['RQ GP-004-001', emissao, revisao, '1/1']
    lw, vw = info_col_w * 0.45, info_col_w * 0.55

    for i, (lbl, val) in enumerate(zip(labels, values)):
        iy = y_cur + hdr_h - row_h * (i + 1)
        _cell(c, ix,      iy, lw, row_h, lbl, size=7, bold=True, fill_color=GRAY_LIGHT, border=True)
        _cell(c, ix + lw, iy, vw, row_h, val, size=7, border=True)

    # ── Bloco 2: SESMT ─────────────────────────────────────────────────────────
    sesmt_h = 0.7 * cm
    y_cur  -= sesmt_h
    _cell(c, x0, y_cur, logo_col_w + title_col_w, sesmt_h, border=True)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(x0 + (logo_col_w + title_col_w) / 2, y_cur + sesmt_h / 2 - 4, 'SESMT')
    # célula info vazia
    _cell(c, x0 + logo_col_w + title_col_w, y_cur, info_col_w, sesmt_h, border=True)

    # ── Bloco 3: CURSO/TREINAMENTO ────────────────────────────────────────────
    row_h2 = 0.75 * cm
    y_cur -= row_h2
    titulo_txt = f'CURSO/TREINAMENTO: {documento.titulo}' + (f' (versão {documento.versao})' if documento.versao else '')
    _cell(c, x0, y_cur, CONTENT_W, row_h2, titulo_txt, size=8, bold=False, border=True)

    # ── Bloco 4: DATA / INSTRUTOR ─────────────────────────────────────────────
    y_cur -= row_h2
    data_w = CONTENT_W * 0.45
    inst_w = CONTENT_W - data_w
    _cell(c, x0,            y_cur, data_w, row_h2,
          f'DATA/HORÁRIO:  {hoje.strftime("%d/%m/%Y")} de 08 às 17h', size=8, border=True)
    _cell(c, x0 + data_w,   y_cur, inst_w, row_h2,
          f'INSTRUTOR: {instrutor}', size=8, border=True)

    # ── Bloco 5: LOCAL / SETOR / INTERNO ─────────────────────────────────────
    y_cur -= row_h2
    loc_w  = CONTENT_W * 0.25
    set_w  = CONTENT_W * 0.40
    int_w  = CONTENT_W - loc_w - set_w
    _cell(c, x0,                   y_cur, loc_w, row_h2, 'LOCAL: CEMAG', size=8, border=True)
    cargos_nomes = ', '.join(c2.nome for c2 in documento.cargos.all()) or 'GERAL'
    _cell(c, x0 + loc_w,           y_cur, set_w, row_h2, f'SETOR: {cargos_nomes}', size=8, border=True)
    _cell(c, x0 + loc_w + set_w,   y_cur, int_w, row_h2, 'INTERNO', size=8, align='center', border=True)

    # ── Bloco 6: CARGA HORÁRIA ────────────────────────────────────────────────
    y_cur -= row_h2
    ch_w = CONTENT_W * 0.45
    dl_w = CONTENT_W - ch_w
    _cell(c, x0,          y_cur, ch_w, row_h2, 'CARGA HORÁRIA:', size=8, border=True)
    _cell(c, x0 + ch_w,   y_cur, dl_w, row_h2, 'DATA LIMITE DA AVALIAÇÃO:', size=8, border=True)

    # ── Tabela de participantes ────────────────────────────────────────────────
    col_nome  = CONTENT_W * 0.34
    col_ass   = CONTENT_W * 0.20
    col_vis   = CONTENT_W * 0.18
    col_sim   = CONTENT_W * 0.09
    col_nao   = CONTENT_W * 0.09
    col_dt    = CONTENT_W - col_nome - col_ass - col_vis - col_sim - col_nao

    # Cabeçalho duplo: NOME e ASSINATURA abrangem as 2 linhas; demais colunas têm 2 linhas
    th1 = 0.58 * cm   # 1ª linha (rótulos gerais)
    th2 = 0.52 * cm   # 2ª linha (sub-rótulos)
    th  = th1 + th2   # altura total do cabeçalho

    y_cur -= th

    # NOME e ASSINATURA — célula única de altura total
    _cell(c, x0, y_cur, col_nome, th, 'NOME', size=8, bold=True,
          align='center', fill_color=ORANGE, text_color=white, border=True)
    _cell(c, x0 + col_nome, y_cur, col_ass, th, 'ASSINATURA', size=8, bold=True,
          align='center', fill_color=ORANGE, text_color=white, border=True)

    # "DATA DE" na linha superior (col_vis)
    x_vis = x0 + col_nome + col_ass
    _cell(c, x_vis, y_cur + th2, col_vis, th1, 'DATA DE', size=7, bold=True,
          align='center', fill_color=ORANGE, text_color=white, border=True)
    # "VISUALIZAÇÃO" na linha inferior (col_vis)
    _cell(c, x_vis, y_cur, col_vis, th2, 'VISUALIZAÇÃO', size=7, bold=True,
          align='center', fill_color=ORANGE, text_color=white, border=True)

    # "Avaliação Gestor" na linha superior (restante)
    aval_w = col_sim + col_nao + col_dt
    x_aval = x_vis + col_vis
    _cell(c, x_aval, y_cur + th2, aval_w, th1, 'Avaliação Gestor', size=8, bold=True,
          align='center', fill_color=ORANGE, text_color=white, border=True)

    # Sub-colunas na linha inferior
    _cell(c, x_aval, y_cur, col_sim, th2, 'Foi eficaz?\nSIM', size=6.5,
          align='center', fill_color=ORANGE, text_color=white, border=True)
    _cell(c, x_aval + col_sim, y_cur, col_nao, th2, 'NÃO', size=6.5,
          align='center', fill_color=ORANGE, text_color=white, border=True)
    _cell(c, x_aval + col_sim + col_nao, y_cur, col_dt, th2, 'Data de\nAvaliação', size=6.5,
          align='center', fill_color=ORANGE, text_color=white, border=True)

    # Linhas de participantes
    row_h3    = 0.80 * cm
    min_rows  = max(10, len(vistos) + 3)   # mínimo de linhas em branco

    for i in range(min_rows):
        y_cur -= row_h3
        if y_cur < MARGIN_T + 1.5 * cm:   # nova página se necessário
            c.showPage()
            c.setFillColor(ORANGE)
            c.rect(MARGIN_L - ORANGE_BAR_W, MARGIN_T, ORANGE_BAR_W, PAGE_H - MARGIN_T * 2, fill=1, stroke=0)
            y_cur = PAGE_H - MARGIN_T - row_h3

        visto = vistos[i] if i < len(vistos) else None
        nome_txt  = visto.usuario.nome.upper() if visto else ''
        data_txt  = visto.visto_em.strftime('%d/%m/%Y %H:%M') if visto else ''
        bg = GRAY_LIGHT if i % 2 == 0 else None

        _cell(c, x0, y_cur, col_nome, row_h3, nome_txt, size=8, border=True, fill_color=bg)
        _cell(c, x0 + col_nome, y_cur, col_ass, row_h3, '', border=True, fill_color=bg)
        _cell(c, x0 + col_nome + col_ass, y_cur, col_vis, row_h3, data_txt, size=7,
              align='center', border=True, fill_color=bg)
        # Checkbox SIM
        cx_sim = x0 + col_nome + col_ass + col_vis + col_sim / 2 - 0.18 * cm
        cy_box = y_cur + row_h3 / 2 - 0.18 * cm
        c.setStrokeColor(GRAY_MED)
        c.setLineWidth(0.5)
        c.rect(cx_sim, cy_box, 0.36 * cm, 0.36 * cm, fill=0, stroke=1)
        # Checkbox NÃO
        cx_nao = x0 + col_nome + col_ass + col_vis + col_sim + col_nao / 2 - 0.18 * cm
        c.rect(cx_nao, cy_box, 0.36 * cm, 0.36 * cm, fill=0, stroke=1)
        # Data avaliação
        _cell(c, x0 + col_nome + col_ass + col_vis + col_sim + col_nao, y_cur, col_dt,
              row_h3, '', border=True, fill_color=bg)

    # ── Rodapé ────────────────────────────────────────────────────────────────
    c.setFont('Helvetica', 6.5)
    c.setFillColor(GRAY_DARK)
    c.drawCentredString(PAGE_W / 2, MARGIN_T - 0.3 * cm,
                        f'Documento: {documento.titulo} · Gerado em {hoje.strftime("%d/%m/%Y")} · CEMAG Treinamentos')

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
