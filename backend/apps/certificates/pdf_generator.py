"""
Gerador de PDF para certificados CEMAG — layout paisagem
"""
import os
import math
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

# ── Dimensões página ───────────────────────────────────────────────────────────
PAGE_W, PAGE_H = landscape(A4)   # 841.89 × 595.28 pt

# ── Paleta de cores ────────────────────────────────────────────────────────────
ORANGE      = HexColor('#E05020')
GRAY_SHAPE  = HexColor('#C8C8C8')
GOLD        = HexColor('#B8963E')
TEXT_DARK   = HexColor('#2C2C2C')
TEXT_MED    = HexColor('#666666')
LINE_GRAY   = HexColor('#C0C0C0')

# ── Geometria do painel esquerdo ───────────────────────────────────────────────
# Paralelogramo cinza: cobre ~23 % da largura com borda diagonal
PANEL_TOP_RIGHT  = PAGE_W * 0.235   # largura no topo
PANEL_BOT_RIGHT  = PAGE_W * 0.165   # largura na base (cria diagonal)

# Triângulo laranja: canto inferior esquerdo
ORANGE_TOP_Y     = PAGE_H * 0.48    # altura do vértice superior (em coords PDF, y=0 é embaixo)
ORANGE_RIGHT_X   = PAGE_W * 0.180   # largura da base do triângulo

# ── Centro da área de conteúdo (lado direito) ─────────────────────────────────
CONTENT_LEFT  = PAGE_W * 0.27       # onde começa o conteúdo
CONTENT_CTR   = CONTENT_LEFT + (PAGE_W - CONTENT_LEFT) / 2


# ── Helpers ────────────────────────────────────────────────────────────────────

def _logo_path():
    """Resolve o caminho absoluto para cemag-logo.jpg (frontend/public)."""
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(here, '..', '..', '..', 'frontend', 'public', 'cemag-logo.png'))


def _draw_background(c):
    """Painel decorativo esquerdo: polígono cinza + triângulo laranja."""
    # Polígono cinza
    c.setFillColor(GRAY_SHAPE)
    p = c.beginPath()
    p.moveTo(0, PAGE_H)
    p.lineTo(PANEL_TOP_RIGHT, PAGE_H)
    p.lineTo(PANEL_BOT_RIGHT, 0)
    p.lineTo(0, 0)
    p.close()
    c.drawPath(p, fill=1, stroke=0)

    # Triângulo laranja (sobre o cinza)
    c.setFillColor(ORANGE)
    p = c.beginPath()
    p.moveTo(0, ORANGE_TOP_Y)
    p.lineTo(ORANGE_RIGHT_X, 0)
    p.lineTo(0, 0)
    p.close()
    c.drawPath(p, fill=1, stroke=0)


def _draw_logo(c):
    """Logo CEMAG no canto superior esquerdo do painel."""
    logo = _logo_path()
    if not os.path.exists(logo):
        return
    try:
        size = 2.4 * cm
        margin = 0.5 * cm
        c.drawImage(
            ImageReader(logo),
            margin, PAGE_H - margin - size,
            width=size, height=size,
            preserveAspectRatio=True, mask='auto'
        )
    except Exception:
        pass


def _draw_centered_logo(c, cx, top_y, max_w=4.5 * cm, max_h=1.6 * cm):
    """Logo CEMAG centralizada horizontalmente, com altura máxima controlada."""
    logo = _logo_path()
    if not os.path.exists(logo):
        return 0.0
    try:
        from PIL import Image as PilImage
        with PilImage.open(logo) as im:
            iw, ih = im.size
    except Exception:
        iw, ih = 1, 1

    ratio = iw / ih
    draw_h = min(max_h, max_w / ratio)
    draw_w = draw_h * ratio
    if draw_w > max_w:
        draw_w = max_w
        draw_h = draw_w / ratio

    x = cx - draw_w / 2
    y = top_y - draw_h
    try:
        c.drawImage(
            ImageReader(logo),
            x, y,
            width=draw_w, height=draw_h,
            preserveAspectRatio=True, mask='auto'
        )
    except Exception:
        pass
    return draw_h


def _draw_wreath(c, cx, cy, radius):
    """Coroa de louros dourada desenhada programaticamente."""
    c.setFillColor(GOLD)
    c.setStrokeColor(GOLD)
    n_leaves = 8

    for side in (-1, 1):   # -1 = esquerda, 1 = direita
        for i in range(n_leaves):
            progress = i / (n_leaves - 1)
            # Arco de -90° (baixo) até +80° (quase topo), espelhado para cada lado
            base_angle_deg = -90 + 170 * progress * side * -1 if side == 1 else -90 + 170 * progress
            base_rad = math.radians(base_angle_deg)

            # Posição do centro da folha no arco
            lx = cx + side * radius * abs(math.cos(base_rad)) * 0.9
            ly = cy + radius * math.sin(base_rad)

            # Orientação da folha (perpendicular ao arco)
            leaf_angle = math.degrees(math.atan2(
                math.sin(base_rad), side * abs(math.cos(base_rad))
            )) + 90

            lw = radius * 0.22
            lh = radius * 0.42

            c.saveState()
            c.translate(lx, ly)
            c.rotate(leaf_angle)
            c.ellipse(-lw / 2, -lh / 2, lw / 2, lh / 2, fill=1, stroke=0)
            c.restoreState()

    # Ponto central de ligação (pequeno círculo)
    c.circle(cx, cy - radius * 0.05, radius * 0.10, fill=1, stroke=0)


def _wrap_text(text, max_chars=55):
    """Divide texto em linhas com no máximo max_chars caracteres."""
    if len(text) <= max_chars:
        return [text]
    words = text.split()
    lines, current = [], []
    for word in words:
        if len(' '.join(current + [word])) > max_chars:
            if current:
                lines.append(' '.join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(' '.join(current))
    return lines


# ── Gerador principal ──────────────────────────────────────────────────────────

def generate_certificate_pdf(certificate):
    """
    Gera PDF em paisagem A4 com o layout visual da CEMAG.

    Args:
        certificate: instância do modelo Certificate

    Returns:
        BytesIO com o PDF gerado
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))

    # ── 1. Fundo decorativo ────────────────────────────────────────────────────
    _draw_background(c)
    _draw_logo(c)

    # ── 2. Logo centralizada ───────────────────────────────────────────────────
    logo_top = PAGE_H - 1.8 * cm
    logo_h = _draw_centered_logo(c, CONTENT_CTR, logo_top, max_w=5.5 * cm, max_h=2.0 * cm)

    # ── 3. Subtítulo ───────────────────────────────────────────────────────────
    y = logo_top - logo_h - 0.7 * cm
    c.setFont('Helvetica', 9.5)
    c.setFillColor(TEXT_MED)
    c.drawCentredString(CONTENT_CTR, y, 'Certificamos que, para os devidos fins, o(a) funcionário(a)')

    # ── 5. Nome do colaborador ─────────────────────────────────────────────────
    y -= 1.1 * cm
    nome = certificate.colaborador.nome.upper()
    c.setFont('Helvetica-Bold', 17)
    c.setFillColor(TEXT_DARK)
    c.drawCentredString(CONTENT_CTR, y, nome)

    # Linha decorativa sob o nome
    name_w = c.stringWidth(nome, 'Helvetica-Bold', 17)
    lx1 = CONTENT_CTR - name_w / 2 - 0.4 * cm
    lx2 = CONTENT_CTR + name_w / 2 + 0.4 * cm
    c.setStrokeColor(LINE_GRAY)
    c.setLineWidth(0.5)
    c.line(lx1, y - 0.22 * cm, lx2, y - 0.22 * cm)

    # ── 6. Texto de conclusão ──────────────────────────────────────────────────
    y -= 1.05 * cm
    c.setFont('Helvetica', 9.5)
    c.setFillColor(TEXT_MED)
    c.drawCentredString(CONTENT_CTR, y, 'Concluiu o treinamento em')

    # ── 7. Nome do curso + data ────────────────────────────────────────────────
    data_str = certificate.data_conclusao.strftime('%d/%m/%Y') if certificate.data_conclusao else ''
    curso_titulo = certificate.titulo

    y -= 0.65 * cm
    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(TEXT_DARK)
    linhas_curso = _wrap_text(curso_titulo, max_chars=55)
    for linha in linhas_curso:
        c.drawCentredString(CONTENT_CTR, y, linha)
        y -= 0.55 * cm

    c.setFont('Helvetica', 9.5)
    c.setFillColor(TEXT_MED)
    c.drawCentredString(CONTENT_CTR, y, f'no dia {data_str},')

    # ── 8. Empresa + cidade ────────────────────────────────────────────────────
    y -= 0.65 * cm
    c.drawCentredString(CONTENT_CTR, y, 'na CEMAG - Ceará Máquinas Agrícolas Ltda.')

    y -= 0.60 * cm
    c.drawCentredString(CONTENT_CTR, y, 'Fortaleza,')

    # ── 8b. Módulos do curso ───────────────────────────────────────────────────
    modulos = list(
        certificate.curso.modulos.order_by('ordem').values_list('titulo', flat=True)
    )
    if modulos:
        sep_x1   = CONTENT_LEFT + 0.5 * cm
        sep_x2   = PAGE_W - 1.0 * cm
        col_gap  = 0.5 * cm
        col_w    = (sep_x2 - sep_x1 - col_gap) / 2
        row_h    = 0.40 * cm
        max_mod  = 14   # 7 por coluna
        displayed = modulos[:max_mod]

        y -= 0.70 * cm
        c.setStrokeColor(LINE_GRAY)
        c.setLineWidth(0.4)
        c.line(sep_x1, y, sep_x2, y)

        y -= 0.45 * cm
        c.setFont('Helvetica-Bold', 8)
        c.setFillColor(TEXT_DARK)
        c.drawString(sep_x1, y, 'Conteúdo programático:')
        y -= 0.45 * cm

        # Dois itens por linha (coluna esquerda / direita)
        for i in range(0, len(displayed), 2):
            left_titulo  = displayed[i]
            right_titulo = displayed[i + 1] if i + 1 < len(displayed) else None

            left_label = f'• {left_titulo}'
            if len(left_label) > 40:
                left_label = left_label[:38] + '…'

            c.setFont('Helvetica', 7.5)
            c.setFillColor(TEXT_MED)
            c.drawString(sep_x1, y, left_label)

            if right_titulo:
                right_label = f'• {right_titulo}'
                if len(right_label) > 40:
                    right_label = right_label[:38] + '…'
                c.drawString(sep_x1 + col_w + col_gap, y, right_label)

            y -= row_h

        if len(modulos) > max_mod:
            c.setFont('Helvetica', 7)
            c.setFillColor(LINE_GRAY)
            c.drawString(sep_x1, y, f'+ {len(modulos) - max_mod} módulo(s) adicionais')
            y -= row_h

    # ── 8c. Arquivos do Drive vinculados ao curso ──────────────────────────────
    drive_files = list(
        certificate.curso.drive_files.order_by('order', 'name').values_list('name', flat=True)
    )
    if drive_files:
        sep_x1  = CONTENT_LEFT + 0.5 * cm
        sep_x2  = PAGE_W - 1.0 * cm
        row_h   = 0.40 * cm
        max_arq = 14
        displayed_arq = drive_files[:max_arq]

        y -= 0.50 * cm
        c.setStrokeColor(LINE_GRAY)
        c.setLineWidth(0.4)
        c.line(sep_x1, y, sep_x2, y)

        y -= 0.45 * cm
        c.setFont('Helvetica-Bold', 8)
        c.setFillColor(TEXT_DARK)
        c.drawString(sep_x1, y, 'Materiais de apoio:')
        y -= 0.45 * cm

        col_gap = 0.5 * cm
        col_w   = (sep_x2 - sep_x1 - col_gap) / 2

        for i in range(0, len(displayed_arq), 2):
            left_name  = displayed_arq[i]
            right_name = displayed_arq[i + 1] if i + 1 < len(displayed_arq) else None

            left_label = f'▸ {left_name}'
            if len(left_label) > 40:
                left_label = left_label[:38] + '…'

            c.setFont('Helvetica', 7.5)
            c.setFillColor(TEXT_MED)
            c.drawString(sep_x1, y, left_label)

            if right_name:
                right_label = f'▸ {right_name}'
                if len(right_label) > 40:
                    right_label = right_label[:38] + '…'
                c.drawString(sep_x1 + col_w + col_gap, y, right_label)

            y -= row_h

        if len(drive_files) > max_arq:
            c.setFont('Helvetica', 7)
            c.setFillColor(LINE_GRAY)
            c.drawString(sep_x1, y, f'+ {len(drive_files) - max_arq} arquivo(s) adicional(is)')
            y -= row_h

    # ── 9. Assinaturas ─────────────────────────────────────────────────────────
    sig_y     = 2.8 * cm
    sig_w     = 5.2 * cm
    sig_left  = CONTENT_CTR - sig_w - 0.8 * cm   # centro linha esquerda
    sig_right = CONTENT_CTR + sig_w * 0.05        # centro linha direita

    c.setStrokeColor(LINE_GRAY)
    c.setLineWidth(0.5)

    # Linha e texto — gestor (esquerda)
    c.line(sig_left - sig_w / 2, sig_y, sig_left + sig_w / 2, sig_y)
    c.setFont('Helvetica', 8)
    c.setFillColor(TEXT_MED)
    c.drawCentredString(sig_left, sig_y - 0.38 * cm, certificate.gestor_nome or 'Gestor RH')
    c.setFont('Helvetica', 7)
    c.drawCentredString(sig_left, sig_y - 0.72 * cm, certificate.gestor_cargo or 'Recursos Humanos')

    # Linha e texto — colaborador (direita)
    c.line(sig_right - sig_w / 2, sig_y, sig_right + sig_w / 2, sig_y)
    c.setFont('Helvetica', 8)
    c.setFillColor(TEXT_MED)
    c.drawCentredString(sig_right, sig_y - 0.38 * cm, certificate.colaborador.nome)
    c.setFont('Helvetica', 7)
    c.drawCentredString(sig_right, sig_y - 0.72 * cm, 'Colaborador(a)')

    # ── 10. Rodapé (ID) ────────────────────────────────────────────────────────
    c.setFont('Helvetica', 6.5)
    c.setFillColor(LINE_GRAY)
    emitido = certificate.emitido_em.strftime('%d/%m/%Y') if certificate.emitido_em else ''
    c.drawCentredString(
        CONTENT_CTR, 0.6 * cm,
        f'Certificado Nº {str(certificate.id).upper()} · Emitido em {emitido}'
    )

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
