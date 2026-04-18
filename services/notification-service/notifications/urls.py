from django.urls import path
from . import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("read-all/", views.mark_all_read, name="notification-read-all"),
    path("unread/", views.unread_count, name="notification-unread"),
    path("internal/create/", views.create_notification, name="notification-create-internal"),
    path("<uuid:notification_id>/read/", views.mark_single_read, name="notification-read-single"),
    path("<uuid:notification_id>/", views.delete_notification, name="notification-delete"),
]
