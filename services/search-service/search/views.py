"""
検索API
要件定義書 SEARCH-01〜SEARCH-03 に基づく
PostgreSQL pg_trgm による部分一致検索
"""
import logging
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Case, IntegerField, Q, Value, When
from django.db.models.functions import Coalesce, Greatest
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import UserIndex, HashtagIndex, SearchHistory
from .serializers import UserIndexSerializer, HashtagIndexSerializer, SearchHistorySerializer

logger = logging.getLogger(__name__)


def get_user_id(request):
    if request.META.get("HTTP_X_USER_ID"):
        return request.META["HTTP_X_USER_ID"]
    user = getattr(request, "user", None)
    if user and hasattr(user, "user_id") and user.user_id:
        return str(user.user_id)
    return ""


def build_user_search_queryset(query, limit=20):
    user_filter = (
        Q(username__icontains=query) |
        Q(name__icontains=query) |
        Q(email__icontains=query)
    )

    return (
        UserIndex.objects
        .annotate(
            username_similarity=TrigramSimilarity("username", query),
            name_similarity=TrigramSimilarity("name", query),
            email_similarity=TrigramSimilarity("email", query),
        )
        .annotate(
            similarity=Greatest(
                Coalesce("username_similarity", Value(0.0)),
                Coalesce("name_similarity", Value(0.0)),
                Coalesce("email_similarity", Value(0.0)),
            ),
            exact_match=Case(
                When(Q(username__iexact=query) | Q(name__iexact=query) | Q(email__iexact=query), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            ),
            prefix_match=Case(
                When(
                    Q(username__istartswith=query) |
                    Q(name__istartswith=query) |
                    Q(email__istartswith=query),
                    then=Value(1),
                ),
                default=Value(0),
                output_field=IntegerField(),
            ),
            contains_match=Case(
                When(user_filter, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            ),
        )
        .filter(user_filter | Q(similarity__gte=0.1))
        .order_by(
            "-exact_match",
            "-prefix_match",
            "-contains_match",
            "-similarity",
            "-is_verified",
            "-follower_count",
            "username",
        )[:limit]
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search(request):
    """
    SEARCH-01/SEARCH-02: 統合検索 (ユーザー + ハッシュタグ)
    ?q=<query>&type=user|hashtag|all (default: all)
    """
    query = request.query_params.get("q", "").strip()
    search_type = request.query_params.get("type", "all")

    if not query:
        return Response({"detail": "q パラメータは必須です"}, status=status.HTTP_400_BAD_REQUEST)
    if len(query) < 1:
        return Response({"users": [], "hashtags": []})

    # 検索履歴を保存
    user_id = get_user_id(request)
    if user_id and query:
        SearchHistory.objects.create(user_id=user_id, query=query)
        # 同じクエリの履歴は最新1件だけ残す
        old = SearchHistory.objects.filter(user_id=user_id, query=query).order_by("-created_at")[1:]
        SearchHistory.objects.filter(id__in=old.values_list("id", flat=True)).delete()

    result = {}

    if search_type in ("all", "user"):
        users = build_user_search_queryset(query, limit=20)
        result["users"] = UserIndexSerializer(users, many=True).data

    if search_type in ("all", "hashtag"):
        hashtags = (
            HashtagIndex.objects
            .annotate(similarity=TrigramSimilarity("name", query))
            .filter(Q(name__icontains=query) | Q(similarity__gte=0.1))
            .order_by("-post_count", "-similarity")[:20]
        )
        result["hashtags"] = HashtagIndexSerializer(hashtags, many=True).data

    return Response(result)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search_users(request):
    """SEARCH-01: ユーザー検索 ?q=<query>"""
    query = request.query_params.get("q", "").strip()
    if not query:
        return Response({"detail": "q パラメータは必須です"}, status=status.HTTP_400_BAD_REQUEST)

    users = build_user_search_queryset(query, limit=30)
    return Response(UserIndexSerializer(users, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search_hashtags(request):
    """SEARCH-02: ハッシュタグ検索 ?q=<query>"""
    query = request.query_params.get("q", "").strip().lstrip("#")
    if not query:
        return Response({"detail": "q パラメータは必須です"}, status=status.HTTP_400_BAD_REQUEST)

    hashtags = (
        HashtagIndex.objects
        .annotate(similarity=TrigramSimilarity("name", query))
        .filter(Q(name__icontains=query) | Q(similarity__gte=0.1))
        .order_by("-post_count", "-similarity")[:30]
    )
    return Response(HashtagIndexSerializer(hashtags, many=True).data)


@api_view(["GET", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def search_history(request):
    """SEARCH-03: 検索履歴 取得 / 全削除"""
    user_id = get_user_id(request)

    if request.method == "GET":
        history = SearchHistory.objects.filter(user_id=user_id)[:20]
        return Response(SearchHistorySerializer(history, many=True).data)

    # DELETE: 全履歴削除
    SearchHistory.objects.filter(user_id=user_id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_history_item(request, history_id):
    """SEARCH-03: 検索履歴 1件削除"""
    user_id = get_user_id(request)
    deleted, _ = SearchHistory.objects.filter(id=history_id, user_id=user_id).delete()
    if not deleted:
        return Response({"detail": "見つかりません"}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ===== 内部API (他サービスからインデックス同期) =====

@api_view(["POST", "PUT"])
@permission_classes([permissions.AllowAny])
def upsert_user_index(request):
    """内部API: user-service からユーザー情報を同期"""
    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"detail": "user_id は必須です"}, status=status.HTTP_400_BAD_REQUEST)

    defaults = {
        "username":      request.data.get("username", ""),
        "name":          request.data.get("name", "") or request.data.get("username", ""),
        "email":         request.data.get("email", ""),
        "bio":           request.data.get("bio", ""),
        "website":       request.data.get("website", ""),
        "profile_img":   request.data.get("profile_img", ""),
        "is_private":    request.data.get("is_private", False),
        "is_verified":   request.data.get("is_verified", False),
        "follower_count": request.data.get("follower_count", 0),
    }
    obj, created = UserIndex.objects.update_or_create(user_id=user_id, defaults=defaults)
    return Response(
        UserIndexSerializer(obj).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["POST", "PUT"])
@permission_classes([permissions.AllowAny])
def upsert_hashtag_index(request):
    """内部API: post-service からハッシュタグ情報を同期"""
    name = request.data.get("name", "").strip().lstrip("#")
    if not name:
        return Response({"detail": "name は必須です"}, status=status.HTTP_400_BAD_REQUEST)

    defaults = {"post_count": request.data.get("post_count", 0)}
    obj, created = HashtagIndex.objects.update_or_create(name=name, defaults=defaults)
    return Response(
        HashtagIndexSerializer(obj).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )
