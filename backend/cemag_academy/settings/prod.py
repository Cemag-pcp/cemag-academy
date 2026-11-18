from .base import *  # noqa: F401, F403
import os

DEBUG = False

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()]
# Domínio que o Render dá ao serviço (ex.: cemag-academy-api.onrender.com)
if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ['RENDER_EXTERNAL_HOSTNAME'])

# Banco: herdado do base.py (DB_ENGINE=postgresql + DB_SCHEMA no ambiente)

# O Render termina o HTTPS no proxy e repassa a requisição em HTTP com este cabeçalho;
# sem isso o SECURE_SSL_REDIRECT entra em loop de redirecionamento.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SECURE_REDIRECT_EXEMPT = [r'^api/health/$']  # health check interno do Render
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [f'https://{h}' for h in ALLOWED_HOSTS if h and not h.startswith('.')]
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Estáticos (admin, Swagger) servidos pelo whitenoise, comprimidos e com hash no nome
STORAGES['staticfiles'] = {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'}  # noqa: F405

# Logs no stdout (aparecem no painel do Render)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {'django': {'handlers': ['console'], 'level': 'INFO', 'propagate': False}},
}
