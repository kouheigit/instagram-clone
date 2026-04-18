from django.urls import path, include
from django_prometheus import exports
from django.http import JsonResponse

urlpatterns = [
    path("api/v1/media/", include("media_app.urls")),
    path("health", lambda r: JsonResponse({"status": "ok", "service": "media-service"})),
    path("metrics/", exports.ExportToDjangoView, name="prometheus-django-metrics"),
]
