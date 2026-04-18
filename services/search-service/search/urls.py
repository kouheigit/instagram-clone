from django.urls import path
from . import views

urlpatterns = [
    path("", views.search, name="search"),
    path("users/", views.search_users, name="search-users"),
    path("hashtags/", views.search_hashtags, name="search-hashtags"),
    path("history/", views.search_history, name="search-history"),
    path("history/<uuid:history_id>/", views.delete_history_item, name="search-history-delete"),
    path("internal/users/", views.upsert_user_index, name="search-internal-user"),
    path("internal/hashtags/", views.upsert_hashtag_index, name="search-internal-hashtag"),
]
