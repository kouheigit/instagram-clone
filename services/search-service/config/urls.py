from django.urls import path, include
from django_prometheus import exports
from django.http import JsonResponse

urlpatterns = [
    path("api/v1/search/", include("search.urls")),
    path("health", lambda r: JsonResponse({"status": "ok", "service": "search-service"})),
    path("metrics/", exports.ExportToDjangoView, name="prometheus-django-metrics"),
]
