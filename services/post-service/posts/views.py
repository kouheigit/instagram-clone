"""
投稿API
要件定義書 POST-01〜POST-10, SOC-01/SOC-02/SOC-07 に基づく
"""
import json
import logging
import urllib.request
from django.conf import settings
from django.core.cache import cache
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Post, Like, Comment, SavedPost
from .serializers import PostSerializer, PostCreateSerializer, CommentSerializer

logger = logging.getLogger(__name__)


def _send_notification(payload: dict):
    """notification-service に通知を直接送信 (Kafkaダウン時のフォールバック)"""
    try:
        base_url = getattr(settings, "NOTIFICATION_SERVICE_URL", "http://notification-service:8008")
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/api/v1/notifications/internal/create/",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=2)
    except Exception as e:
        logger.warning(f"notification send failed: {e}")


def get_user_id_from_request(request):
    """JWTペイロードから user_id を取得 (他サービスとの連携)"""
    if hasattr(request, "user") and hasattr(request.user, "user_id"):
        return request.user.user_id
    return getattr(request, "user_id", None) or request.META.get("HTTP_X_USER_ID")


class PostListCreateView(generics.ListCreateAPIView):
    """POST-01〜POST-06: 投稿一覧・作成"""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PostCreateSerializer
        return PostSerializer

    def get_queryset(self):
        return Post.objects.filter(is_deleted=False).prefetch_related("media_files", "likes", "saved_by")

    def perform_create(self, serializer):
        user_id = get_user_id_from_request(self.request)
        post = serializer.save(user_id=user_id)

        # Kafka に post.created イベントを発行 (詳細設計書 3.3.1 Step4)
        try:
            from kafka import KafkaProducer
            producer = KafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            )
            producer.send("post.created", {
                "post_id": str(post.post_id),
                "user_id": str(user_id),
                "media_type": post.media_type,
            })
            producer.flush()
        except Exception as e:
            logger.warning(f"Kafka publish failed: {e}")

        # フォロワーのフィードへ非同期プッシュ (Celery経由)
        try:
            from .tasks import push_post_to_feed
            push_post_to_feed.delay(str(post.post_id), str(user_id))
        except Exception as e:
            logger.warning(f"Celery task dispatch failed: {e}")

        logger.info(f"Post created: {post.post_id} by user {user_id}")
        return post


class PostDetailView(generics.RetrieveDestroyAPIView):
    """投稿詳細・削除"""
    serializer_class = PostSerializer
    lookup_field = "post_id"

    def get_queryset(self):
        return Post.objects.filter(is_deleted=False).prefetch_related("media_files", "likes", "saved_by")

    def perform_destroy(self, instance):
        user_id = get_user_id_from_request(self.request)
        if str(instance.user_id) != str(user_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("自分の投稿のみ削除できます")
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class UserPostListView(generics.ListAPIView):
    """特定ユーザーの投稿一覧"""
    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs["user_id"]
        return Post.objects.filter(user_id=user_id, is_deleted=False).prefetch_related("media_files")


@api_view(["POST", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def like_post(request, post_id):
    """SOC-01: いいね・いいね解除"""
    post = get_object_or_404(Post, post_id=post_id, is_deleted=False)
    user_id = get_user_id_from_request(request)

    if request.method == "POST":
        _, created = Like.objects.get_or_create(user_id=user_id, post=post)
        if created:
            Post.objects.filter(pk=post_id).update(like_count=post.like_count + 1)

            # Kafka に post.liked イベントを発行
            try:
                from kafka import KafkaProducer
                producer = KafkaProducer(
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                )
                producer.send("post.liked", {"post_id": str(post_id), "user_id": str(user_id)})
                producer.flush()
            except Exception as e:
                logger.warning(f"Kafka publish failed: {e}")

        if created:
            # 自分の投稿へのいいねは通知しない
            if str(post.user_id) != str(user_id):
                _send_notification({
                    "user_id": str(post.user_id),
                    "actor_id": str(user_id),
                    "type": "like",
                    "ref_id": str(post_id),
                })
        return Response({"liked": True, "like_count": post.like_count + (1 if created else 0)})

    else:  # DELETE
        deleted, _ = Like.objects.filter(user_id=user_id, post=post).delete()
        if deleted:
            Post.objects.filter(pk=post_id).update(like_count=max(0, post.like_count - 1))
        return Response({"liked": False, "like_count": max(0, post.like_count - (1 if deleted else 0))})


class CommentListCreateView(generics.ListCreateAPIView):
    """SOC-02: コメント一覧・投稿"""
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(
            post_id=self.kwargs["post_id"],
            parent=None,
            is_deleted=False,
        ).prefetch_related("replies")

    def perform_create(self, serializer):
        post = get_object_or_404(Post, post_id=self.kwargs["post_id"], is_deleted=False)
        user_id = get_user_id_from_request(self.request)
        comment = serializer.save(post=post, user_id=user_id)
        Post.objects.filter(pk=post.pk).update(comment_count=post.comment_count + 1)

        # コメント通知 (自分の投稿へのコメントは通知しない)
        if str(post.user_id) != str(user_id):
            _send_notification({
                "user_id": str(post.user_id),
                "actor_id": str(user_id),
                "type": "comment",
                "ref_id": str(post.post_id),
            })


@api_view(["POST", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def save_post(request, post_id):
    """SOC-07: 保存・保存解除"""
    post = get_object_or_404(Post, post_id=post_id, is_deleted=False)
    user_id = get_user_id_from_request(request)
    collection = request.data.get("collection", "default")

    if request.method == "POST":
        SavedPost.objects.get_or_create(user_id=user_id, post=post, defaults={"collection": collection})
        return Response({"saved": True})
    else:
        SavedPost.objects.filter(user_id=user_id, post=post).delete()
        return Response({"saved": False})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def view_post(request, post_id):
    """動画投稿の再生回数を記録する。ユーザー単位で短時間の重複加算を避ける。"""
    post = get_object_or_404(Post, post_id=post_id, is_deleted=False)
    user_id = get_user_id_from_request(request)

    if post.media_type not in (Post.MEDIA_VIDEO, Post.MEDIA_REEL):
        return Response({"view_count": post.view_count})

    cache_key = f"post_view:{post_id}:{user_id}"
    if cache.get(cache_key):
        return Response({"view_count": post.view_count})

    cache.set(cache_key, True, timeout=60 * 60)
    Post.objects.filter(pk=post_id).update(view_count=F("view_count") + 1)
    post.refresh_from_db(fields=["view_count"])
    return Response({"view_count": post.view_count})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def saved_posts(request):
    """SOC-07: 保存した投稿一覧"""
    user_id = get_user_id_from_request(request)
    post_ids = SavedPost.objects.filter(user_id=user_id).values_list("post_id", flat=True)
    posts = Post.objects.filter(post_id__in=post_ids, is_deleted=False).prefetch_related("media_files")
    serializer = PostSerializer(posts, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def posts_by_hashtag(request, tag):
    """ハッシュタグで投稿を検索"""
    from .models import Hashtag, PostHashtag
    hashtag = Hashtag.objects.filter(name__iexact=tag).first()
    if not hashtag:
        return Response({"count": 0, "results": []})
    post_ids = PostHashtag.objects.filter(hashtag=hashtag).values_list("post_id", flat=True)
    posts = Post.objects.filter(post_id__in=post_ids, is_deleted=False).prefetch_related("media_files").order_by("-created_at")
    serializer = PostSerializer(posts, many=True, context={"request": request})
    return Response({"count": len(serializer.data), "results": serializer.data})


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_comment(request, post_id, comment_id):
    """SOC-02: コメント削除 (投稿者 or コメント作成者のみ)"""
    post = get_object_or_404(Post, post_id=post_id, is_deleted=False)
    comment = get_object_or_404(Comment, comment_id=comment_id, post=post, is_deleted=False)
    user_id = get_user_id_from_request(request)

    if str(comment.user_id) != str(user_id) and str(post.user_id) != str(user_id):
        return Response({"detail": "権限がありません"}, status=status.HTTP_403_FORBIDDEN)

    comment.is_deleted = True
    comment.save(update_fields=["is_deleted"])
    Post.objects.filter(pk=post_id).update(comment_count=max(0, post.comment_count - 1))
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def like_comment(request, post_id, comment_id):
    """SOC-02: コメントいいね・いいね解除 (Redisで二重いいね防止)"""
    comment = get_object_or_404(Comment, comment_id=comment_id, post_id=post_id, is_deleted=False)
    user_id = str(get_user_id_from_request(request))
    cache_key = f"comment_like:{comment_id}:{user_id}"

    if request.method == "POST":
        if cache.get(cache_key):
            return Response({"liked": True, "like_count": comment.like_count}, status=status.HTTP_200_OK)
        cache.set(cache_key, True, timeout=None)
        Comment.objects.filter(comment_id=comment_id).update(like_count=comment.like_count + 1)
        return Response({"liked": True, "like_count": comment.like_count + 1})
    else:
        if not cache.get(cache_key):
            return Response({"liked": False, "like_count": comment.like_count}, status=status.HTTP_200_OK)
        cache.delete(cache_key)
        new_count = max(0, comment.like_count - 1)
        Comment.objects.filter(comment_id=comment_id).update(like_count=new_count)
        return Response({"liked": False, "like_count": new_count})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def post_likes_users(request, post_id):
    """SOC-01: いいねしたユーザーのID一覧"""
    post = get_object_or_404(Post, post_id=post_id, is_deleted=False)
    likes = Like.objects.filter(post=post).values_list("user_id", flat=True)
    return Response({"count": len(likes), "user_ids": [str(uid) for uid in likes]})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def internal_posts_by_ids(request):
    """内部API: post_id リストで投稿を一括取得 (feed-service 用)"""
    ids_param = request.query_params.get("ids", "")
    if not ids_param:
        return Response([])
    post_ids = [pid.strip() for pid in ids_param.split(",") if pid.strip()]
    posts = Post.objects.filter(
        post_id__in=post_ids, is_deleted=False
    ).prefetch_related("media_files")
    serializer = PostSerializer(posts, many=True, context={"request": request})
    return Response(serializer.data)
