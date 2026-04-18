from django.urls import path
from . import views

urlpatterns = [
    path("", views.StoryCreateView.as_view(), name="story-create"),
    path("by-users/", views.stories_by_users, name="stories-by-users"),
    path("user/<uuid:user_id>/", views.UserStoryListView.as_view(), name="user-stories"),
    path("<uuid:story_id>/view/", views.view_story, name="story-view"),
    path("<uuid:story_id>/viewers/", views.story_viewers, name="story-viewers"),
    path("<uuid:story_id>/", views.delete_story, name="story-delete"),
]
