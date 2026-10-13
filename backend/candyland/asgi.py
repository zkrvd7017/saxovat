"""
ASGI config for Candy Land project.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "candyland.settings")
application = get_asgi_application()
