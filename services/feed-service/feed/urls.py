from django.urls import path
from . import views

urlpatterns = [
    path("", views.home_feed, name="feed-home"),
    path("explore/", views.explore_feed, name="feed-explore"),
    path("push/", views.push_to_feed, name="feed-push"),
]
