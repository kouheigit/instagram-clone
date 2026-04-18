from django.urls import path
from . import views

urlpatterns = [
    path("", views.PostListCreateView.as_view(), name="post-list-create"),
    # 固定パスを先に定義してUUID衝突を防ぐ
    path("saved/", views.saved_posts, name="post-saved"),
    path("user/<uuid:user_id>/", views.UserPostListView.as_view(), name="user-posts"),
    path("hashtag/<str:tag>/", views.posts_by_hashtag, name="posts-by-hashtag"),
    path("internal/by-ids/", views.internal_posts_by_ids, name="internal-posts-by-ids"),
    # 投稿詳細・操作
    path("<uuid:post_id>/", views.PostDetailView.as_view(), name="post-detail"),
    path("<uuid:post_id>/like/", views.like_post, name="post-like"),
    path("<uuid:post_id>/likes/", views.post_likes_users, name="post-likes-users"),
    path("<uuid:post_id>/save/", views.save_post, name="post-save"),
    path("<uuid:post_id>/comments/", views.CommentListCreateView.as_view(), name="post-comments"),
    path("<uuid:post_id>/comments/<uuid:comment_id>/", views.delete_comment, name="post-comment-delete"),
    path("<uuid:post_id>/comments/<uuid:comment_id>/like/", views.like_comment, name="post-comment-like"),
]
