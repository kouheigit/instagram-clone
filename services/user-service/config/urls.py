from django.urls import path, include
from django_prometheus import exports

urlpatterns = [
    path("api/v1/users/", include("users.urls")),
    path("api/v1/auth/", include("users.auth_urls")),
    path("health", lambda request: __import__("django.http", fromlist=["JsonResponse"]).JsonResponse({"status": "ok", "service": "user-service"})),
    path("metrics/", exports.ExportToDjangoView, name="prometheus-django-metrics"),
]
