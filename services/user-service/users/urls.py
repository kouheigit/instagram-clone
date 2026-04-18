from django.urls import path
from . import views

urlpatterns = [
    path("internal/follower-ids/<str:user_id>/", views.internal_follower_ids, name="user-internal-follower-ids"),
    path("me/", views.MeView.as_view(), name="user-me"),
    path("me/following-ids/", views.following_ids, name="user-following-ids"),
    path("me/delete/", views.delete_account, name="user-delete"),
    path("me/follow-requests/", views.pending_follow_requests, name="user-follow-requests"),
    path("suggestions/", views.suggested_users, name="user-suggestions"),
    path("by-ids/", views.users_by_ids, name="users-by-ids"),
    path("<str:username>/", views.UserProfileView.as_view(), name="user-profile"),
    path("<str:username>/followers/", views.followers_list, name="user-followers"),
    path("<str:username>/following/", views.following_list, name="user-following"),
    path("<str:username>/follow/", views.follow_user, name="user-follow"),
    path("<str:username>/unfollow/", views.unfollow_user, name="user-unfollow"),
    path("<str:username>/is-following/", views.is_following, name="user-is-following"),
    path("<str:username>/follow-request/approve/", views.approve_follow_request, name="user-follow-request-approve"),
    path("<str:username>/follow-request/reject/", views.reject_follow_request, name="user-follow-request-reject"),
]
