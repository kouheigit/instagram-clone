from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]
CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
CORS_ALLOW_CREDENTIALS = True
