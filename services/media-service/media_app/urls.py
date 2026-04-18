from django.urls import path
from . import views

urlpatterns = [
    path("upload/", views.upload_media, name="media-upload"),
    path("", views.list_user_media, name="media-list"),
    path("<uuid:media_id>/", views.get_media, name="media-detail"),
    path("<uuid:media_id>/delete/", views.delete_media, name="media-delete"),
]
