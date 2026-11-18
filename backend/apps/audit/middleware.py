"""
Middleware that auto-records write operations (POST, PUT, PATCH, DELETE)
in the AuditLog table.
"""
import threading

_local = threading.local()

WRITE_METHODS = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})

# URL prefixes to skip (e.g. token refresh, admin static)
SKIP_PATHS = ('/api/v1/auth/token/', '/admin/', '/static/', '/media/')


def _get_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only log authenticated write requests
        if (
            request.method in WRITE_METHODS
            and hasattr(request, 'user')
            and request.user.is_authenticated
            and not any(request.path.startswith(p) for p in SKIP_PATHS)
            and response.status_code < 500
        ):
            try:
                from .models import AuditLog
                path_parts = request.path.strip('/').split('/')
                modulo = path_parts[2] if len(path_parts) > 2 else request.path

                AuditLog.objects.create(
                    usuario=request.user,
                    usuario_nome=request.user.nome,
                    acao=f'{request.method} {request.path}',
                    modulo=modulo,
                    detalhes=f'Status: {response.status_code}',
                    ip=_get_ip(request),
                )
            except Exception:
                pass  # Never break the request cycle due to audit failure

        return response
