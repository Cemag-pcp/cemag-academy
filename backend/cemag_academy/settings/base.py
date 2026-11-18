"""
CEMAG Academy — Base Settings
"""
from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*', cast=lambda v: [s.strip() for s in v.split(',')])

# ── Applications ──────────────────────────────────────────────────────────────

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'storages',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.courses',
    'apps.progress',
    'apps.certificates',
    'apps.library',
    'apps.notifications',
    'apps.audit',
    'apps.dashboard',
    'apps.acervo',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── Middleware ─────────────────────────────────────────────────────────────────

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.audit.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'cemag_academy.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'cemag_academy.wsgi.application'
ASGI_APPLICATION = 'cemag_academy.asgi.application'

# ── Database ───────────────────────────────────────────────────────────────────

DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE', default='django.db.backends.sqlite3'),
        'NAME': config('DB_NAME', default=str(BASE_DIR / 'db.sqlite3')),
        'USER': config('DB_USER', default=''),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default=''),
        'PORT': config('DB_PORT', default=''),
        # Reaproveita a conexão entre requisições (abrir uma nova no RDS custa ~1,5 s)
        'CONN_MAX_AGE': config('DB_CONN_MAX_AGE', default=60, cast=int),
        'CONN_HEALTH_CHECKS': True,
    }
}

# Isola as tabelas do projeto num schema próprio do Postgres (banco compartilhado)
if 'postgresql' in DATABASES['default']['ENGINE']:
    DATABASES['default']['OPTIONS'] = {
        'options': f"-c search_path={config('DB_SCHEMA', default='cemag_academy')}",
    }

# ── Auth ───────────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ───────────────────────────────────────────────────────

LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# ── Static & Media ─────────────────────────────────────────────────────────────

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── AWS S3 Configuration ───────────────────────────────────────────────────────

AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='sa-east-1')
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com'
AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
AWS_DEFAULT_ACL = None  # Bucket does not allow ACLs - use bucket policy instead
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False

# Use S3 for media files if configured
if AWS_ACCESS_KEY_ID and AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'

# ── Django REST Framework ──────────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'cemag_academy.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ── Simple JWT ─────────────────────────────────────────────────────────────────

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── CORS ───────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000',
    cast=lambda v: [s.strip() for s in v.split(',')],
)
CORS_ALLOW_CREDENTIALS = True

# ── drf-spectacular (OpenAPI) ──────────────────────────────────────────────────

SPECTACULAR_SETTINGS = {
    'TITLE': 'CEMAG Academy API',
    'DESCRIPTION': 'API REST para o sistema de LMS da CEMAG',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# ── Documentação ISO: espelho das planilhas da Qualidade ───────────────────────
# Lista Mestra (código → arquivo no Drive) e Matriz de Conhecimentos (cargo → códigos)
ISO_LISTA_MESTRA_ID  = config('ISO_LISTA_MESTRA_ID', default='17uKTzoeq7krGaDl61Hj62yTQpPFPe3MMb7hgOIoZgbc')
ISO_LISTA_MESTRA_ABA = config('ISO_LISTA_MESTRA_ABA', default='LM GQ-001-001 (INTERNOS)')
ISO_MATRIZ_ID        = config('ISO_MATRIZ_ID', default='15ksFskWimXuqgqfOxELIOOUI7dE5pjHRR6FFuNalaWg')
ISO_SYNC_INTERVALO_MIN = config('ISO_SYNC_INTERVALO_MIN', default=15, cast=int)
