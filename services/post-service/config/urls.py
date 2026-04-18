from django.urls import path, include
from django_prometheus import exports
from django.http import JsonResponse

urlpatterns = [
    path("api/v1/posts/", include("posts.urls")),
    path("health", lambda r: JsonResponse({"status": "ok", "service": "post-service"})),
    path("metrics/", exports.ExportToDjangoView, name="prometheus-django-metrics"),
]
