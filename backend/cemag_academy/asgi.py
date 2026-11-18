"""
ASGI config for cemag_academy project.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cemag_academy.settings.dev')

application = get_asgi_application()
