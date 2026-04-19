from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
CORS_ALLOW_CREDENTIALS = True

# 開発用: メール出力をコンソールへ
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
