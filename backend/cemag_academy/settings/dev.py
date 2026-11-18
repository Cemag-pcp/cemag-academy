from .base import *  # noqa: F401, F403

DEBUG = True

INSTALLED_APPS += ['django_extensions']  # noqa: F405

# Relax CORS in development
CORS_ALLOW_ALL_ORIGINS = True

# Show emails in terminal
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
