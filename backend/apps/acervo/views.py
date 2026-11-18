from django.db import models as dj_models
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Documento, DocumentoVisto, SincronizacaoISO
from .serializers import DocumentoSerializer
from apps.accounts.permissions import IsRH, IsRHOrGestor


def _drive_proxy_response(drive_id: str):
    """Baixa um arquivo do Drive via service account e retorna como HttpResponse."""
    try:
        from apps.courses.drive_utils import _get_drive_service, get_drive_file_bytes

        service = _get_drive_service()
        meta = service.files().get(
            fileId=drive_id,
            fields='name,mimeType',
            supportsAllDrives=True,
        ).execute()

        content, content_type = get_drive_file_bytes(drive_id, meta.get('mimeType', ''))
        safe_name = meta.get('name', 'arquivo').encode('ascii', errors='replace').decode()
        resp = HttpResponse(content, content_type=content_type or 'application/octet-stream')
        resp['Content-Disposition'] = f'inline; filename="{safe_name}"'
        resp['Cache-Control'] = 'private, max-age=3600'
        return resp
    except ValueError as exc:
        from rest_framework.response import Response
        return Response({'detail': str(exc)}, status=400)
    except Exception as exc:
        from rest_framework.response import Response
        return Response({'detail': f'Erro ao acessar o Drive: {exc}'}, status=502)


# Tipo de arquivo exibido na tela, derivado do mime type (mesma regra do frontend:
# a ordem importa, ex.: planilhas do Office também contêm "document" no mime).
TIPOS_ARQUIVO = [
    ('PDF',          ['pdf']),
    ('Planilha',     ['spreadsheet', 'excel']),
    ('Apresentação', ['presentation', 'powerpoint']),
    ('Documento',    ['document', 'word']),
    ('Vídeo',        ['video']),
    ('Imagem',       ['image']),
]


def tipo_arquivo(mime: str) -> str:
    mime = (mime or '').lower()
    for label, termos in TIPOS_ARQUIVO:
        if any(t in mime for t in termos):
            return label
    return 'Arquivo'


def _q_mime(termos):
    q = dj_models.Q()
    for t in termos:
        q |= dj_models.Q(drive_mime_type__icontains=t)
    return q


def _q_tipo(tipo: str):
    """Q que seleciona os documentos de um tipo, respeitando a precedência de TIPOS_ARQUIVO."""
    anteriores = dj_models.Q()
    for label, termos in TIPOS_ARQUIVO:
        q = _q_mime(termos)
        if label == tipo:
            return q & ~anteriores if anteriores else q
        anteriores |= q
    # 'Arquivo' = nenhum dos tipos conhecidos
    return ~anteriores


class DocumentoViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentoSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields    = ['titulo', 'descricao', 'drive_nome']
    ordering_fields  = ['titulo', 'criado_em']
    ordering         = ['-criado_em']

    def _visiveis(self):
        """Documentos que o usuário pode ver (sem os filtros da tela)."""
        user = self.request.user
        qs   = Documento.objects.filter(ativo=True)
        if user.role == 'rh':
            return qs
        # Colaborador/Gestor: documentos sem restrição de cargo OU que incluem o cargo do usuário
        return qs.filter(
            dj_models.Q(cargos__isnull=True) | dj_models.Q(cargos__nome=user.cargo)
        ).distinct()

    def get_queryset(self):
        qs = self._visiveis().prefetch_related('cargos').select_related('criado_por')
        if self.action != 'list':
            return qs

        # Filtros da tela (?leitura= &tipo= &setor= &cargo=); busca e ordenação via DRF
        p = self.request.query_params
        vistos = DocumentoVisto.objects.filter(usuario=self.request.user).values('documento_id')
        if p.get('leitura') == 'lidos':
            qs = qs.filter(id__in=vistos)
        elif p.get('leitura') == 'nao_lidos':
            qs = qs.exclude(id__in=vistos)
        if p.get('tipo'):
            qs = qs.filter(_q_tipo(p['tipo']))
        if p.get('setor'):
            qs = qs.filter(cargos__setores__nome=p['setor'])
        if p.get('cargo'):
            qs = qs.filter(cargos__id=p['cargo'])
        return qs.distinct()

    @action(detail=False, methods=['get'], url_path='resumo')
    def resumo(self, request):
        """Totais e opções dos filtros, considerando só o que o usuário pode ver."""
        from apps.accounts.models import Cargo

        ids = list(self._visiveis().values_list('id', flat=True))
        nao_lidos = len(ids) - DocumentoVisto.objects.filter(usuario=request.user, documento_id__in=ids).count()

        mimes = Documento.objects.filter(id__in=ids).values_list('drive_mime_type', flat=True).distinct()
        tipos = sorted({tipo_arquivo(m) for m in mimes})

        cargos = (
            Cargo.objects.filter(documentos__id__in=ids)
            .distinct().prefetch_related('setores').order_by('nome')
        )
        cargos_out = [
            {'id': str(c.id), 'nome': c.nome, 'setores': sorted(s.nome for s in c.setores.all())}
            for c in cargos
        ]
        setores = sorted({s for c in cargos_out for s in c['setores']})

        return Response({
            'total': len(ids),
            'nao_lidos': nao_lidos,
            'tipos': tipos,
            'setores': setores,
            'cargos': cargos_out,
            'sincronizacao': self._status_sincronizacao(),
        })

    # ── Espelho das planilhas da Qualidade ────────────────────────────────────
    # Os documentos vêm da Lista Mestra + Matriz de Conhecimentos (sync_iso.py);
    # o Academy não cria/edita/exclui documentos.

    def _status_sincronizacao(self):
        from .sync_iso import ultima_sincronizacao, sincronizacao_em_andamento
        ultima = ultima_sincronizacao()
        ok = SincronizacaoISO.objects.filter(status=SincronizacaoISO.STATUS_OK).first()
        dados = {
            'em_andamento': sincronizacao_em_andamento(),
            'ultima_ok_em': ok.concluido_em if ok else None,
            'ultima_status': ultima.status if ultima else None,
            'ultima_erro': ultima.erro if ultima and ultima.status == SincronizacaoISO.STATUS_ERRO else '',
        }
        if self.request.user.role == 'rh' and ok:
            dados['resumo'] = ok.resumo  # inclui as pendências para o RH corrigir nas planilhas
        return dados

    @action(detail=False, methods=['post'], url_path='sincronizar', permission_classes=[IsRH])
    def sincronizar(self, request):
        """Sincroniza agora (botão do RH)."""
        from .sync_iso import sincronizar, sincronizacao_em_andamento
        if sincronizacao_em_andamento():
            return Response({'detail': 'Já existe uma sincronização em andamento.'}, status=status.HTTP_409_CONFLICT)
        reg = sincronizar(origem='manual')
        if reg.status != SincronizacaoISO.STATUS_OK:
            return Response({'detail': f'Erro ao sincronizar: {reg.erro}'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(reg.resumo)

    def list(self, request, *args, **kwargs):
        # Ao abrir a tela, dispara a sincronização em segundo plano se estiver vencida
        if request.query_params.get('page', '1') == '1':
            from .sync_iso import sincronizar_se_preciso
            try:
                sincronizar_se_preciso()
            except Exception:  # noqa: BLE001 — nunca impedir a listagem
                pass
        return super().list(request, *args, **kwargs)

    def _somente_planilha(self):
        return Response(
            {'detail': 'Os documentos vêm da Lista Mestra e da Matriz de Conhecimentos. '
                       'Altere as planilhas; o Academy é atualizado na próxima sincronização.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def create(self, request, *args, **kwargs):
        return self._somente_planilha()

    def update(self, request, *args, **kwargs):
        return self._somente_planilha()

    def destroy(self, request, *args, **kwargs):
        return self._somente_planilha()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated and self.action in ('list', 'retrieve'):
            context['vistos_ids'] = set(
                DocumentoVisto.objects.filter(usuario=user).values_list('documento_id', flat=True)
            )
        return context

    def get_permissions(self):
        # Este método substitui o permission_classes das @action, então as
        # restritas ao RH precisam estar listadas aqui
        if self.action in ('sincronizar', 'frequencia_pdf'):
            return [IsRH()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsRHOrGestor()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=False, methods=['get'], url_path='drive-info')
    def drive_info(self, request):
        """Busca metadados de um arquivo do Drive pelo ID sem salvá-lo."""
        drive_id = request.query_params.get('drive_id', '').strip()
        if not drive_id:
            return Response({'detail': 'Informe drive_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.courses.drive_utils import get_drive_file_info
            info = get_drive_file_info(drive_id)
            return Response(info)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'detail': f'Erro ao acessar o Drive: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=['get'], url_path='frequencia-pdf', permission_classes=[IsRH])
    def frequencia_pdf(self, request, pk=None):
        """Gera e retorna o PDF de lista de frequência do documento."""
        import django.http as http
        from .pdf_frequencia import generate_frequencia_pdf

        documento = self.get_object()
        # prefetch para evitar N+1
        documento.vistos.prefetch_related('usuario')

        try:
            buf      = generate_frequencia_pdf(documento)
            filename = f'frequencia_{documento.id}.pdf'
            response = http.HttpResponse(buf.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as exc:
            return Response({'detail': f'Erro ao gerar PDF: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='marcar-visto')
    def marcar_visto(self, request, pk=None):
        """Marca/desmarca o documento como visto pelo usuário autenticado."""
        documento = self.get_object()
        visto, created = DocumentoVisto.objects.get_or_create(
            documento=documento,
            usuario=request.user,
        )
        if not created:
            visto.delete()
            return Response({'is_visto': False})
        return Response({'is_visto': True})

    @action(detail=True, methods=['get'], url_path='proxy')
    def proxy(self, request, pk=None):
        """Proxy do arquivo do Drive via service account — resolve o problema de login do Google."""
        documento = self.get_object()
        return _drive_proxy_response(documento.drive_id)

    @action(detail=False, methods=['get'], url_path=r'drive-proxy/(?P<drive_id>[^/.]+)',
            permission_classes=[permissions.IsAuthenticated])
    def drive_proxy_by_id(self, request, drive_id=None):
        """Proxy genérico por drive_id — usado pelas aulas tipo 'drive' dos cursos."""
        return _drive_proxy_response(drive_id)
