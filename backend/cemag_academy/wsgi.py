"""
WSGI config for cemag_academy project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cemag_academy.settings.dev')

application = get_wsgi_application()
