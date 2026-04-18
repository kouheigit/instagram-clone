from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

# 開発用: メール出力をコンソールへ
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
