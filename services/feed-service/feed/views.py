"""
フィードAPI
詳細設計書 3.5 feed-service, FEED-01〜FEED-06 に基づく
"""
import logging
import json
from datetime import timedelta
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import requests

from .models import FeedItem

logger = logging.getLogger(__name__)


def get_user_id(request):
    if request.META.get("HTTP_X_USER_ID"):
        return request.META["HTTP_X_USER_ID"]
    user = getattr(request, "user", None)
    if user and hasattr(user, "user_id") and user.user_id:
        return str(user.user_id)
    return None


def fetch_posts_from_service(post_ids: list) -> list:
    """post-service から投稿データを取得 (内部API使用)"""
    if not post_ids:
        return []
    try:
        resp = requests.get(
            f"{settings.POST_SERVICE_URL}/api/v1/posts/internal/by-ids/",
            params={"ids": ",".join(str(p) for p in post_ids)},
            timeout=5,
        )
        if resp.ok:
            data = resp.json()
            return data if isinstance(data, list) else data.get("results", [])
    except Exception as e:
        logger.warning(f"post-service fetch failed: {e}")
    return []


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def home_feed(request):
    """
    FEED-01: フォロー中アカウントの投稿フィード
    詳細設計書 3.5.1 Push/Pull ハイブリッド方式
    """
    user_id = get_user_id(request)
    if not user_id:
        return Response({"error": "認証が必要です"}, status=status.HTTP_401_UNAUTHORIZED)
    cache_key = f"feed:{user_id}"

    # Redisキャッシュ確認 (詳細設計書 4.3: TTL 5分)
    cached = cache.get(cache_key)
    if cached:
        return Response(json.loads(cached))

    # DBからフィードアイテムを取得
    items = FeedItem.objects.filter(
        user_id=user_id,
        expires_at__gte=timezone.now(),
    ).order_by("-score", "-created_at")[:50]

    post_ids = [str(item.post_id) for item in items]
    posts = fetch_posts_from_service(post_ids)

    result = {"count": len(posts), "results": posts}
    cache.set(cache_key, json.dumps(result), timeout=settings.FEED_CACHE_TTL)
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def explore_feed(request):
    """
    FEED-02: 発見タブ (Explore)
    シンプル版: 最新の人気投稿を返す (本番はAIレコメンド)
    """
    user_id = get_user_id(request)
    if not user_id:
        return Response({"error": "認証が必要です"}, status=status.HTTP_401_UNAUTHORIZED)
    cache_key = f"explore:{user_id}"

    cached = cache.get(cache_key)
    if cached:
        return Response(json.loads(cached))

    # 自分以外の最新高スコア投稿
    items = FeedItem.objects.exclude(author_id=user_id).order_by("-score", "-created_at")[:30]
    post_ids = [str(item.post_id) for item in items]
    posts = fetch_posts_from_service(post_ids)

    result = {"count": len(posts), "results": posts}
    cache.set(cache_key, json.dumps(result), timeout=settings.FEED_CACHE_TTL)
    return Response(result)


@api_view(["POST"])
def push_to_feed(request):
    """
    内部API: post.created イベントを受け取りフォロワーのフィードへ Push
    Celery Worker から呼ばれる
    """
    post_id   = request.data.get("post_id")
    author_id = request.data.get("author_id")
    follower_ids = request.data.get("follower_ids", [])
    score     = request.data.get("score", 1.0)

    expires_at = timezone.now() + timedelta(days=7)
    items = [
        FeedItem(
            user_id=uid,
            post_id=post_id,
            author_id=author_id,
            score=score,
            expires_at=expires_at,
        )
        for uid in follower_ids
    ]
    FeedItem.objects.bulk_create(items, ignore_conflicts=True)

    # フォロワーのフィードキャッシュを無効化
    for uid in follower_ids:
        cache.delete(f"feed:{uid}")

    return Response({"pushed": len(items)}, status=status.HTTP_201_CREATED)
