"""
ユーザー管理API
要件定義書 AUTH-01〜AUTH-08, SOC-04/SOC-05 に基づく
"""
import json
import logging
import urllib.request
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .tokens import UserRefreshToken

from .models import User, Follow
from .serializers import UserRegisterSerializer, UserProfileSerializer, FollowSerializer

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


def _sync_to_search(user):
    """search-service の UserIndex にユーザー情報を同期する"""
    try:
        base_url = getattr(settings, "SEARCH_SERVICE_URL", "http://search-service:8006").rstrip("/")
        follower_count = Follow.objects.filter(followee=user, status="active").count()
        payload = {
            "user_id": str(user.user_id),
            "username": user.username,
            "name": user.username,
            "email": user.email,
            "bio": user.bio or "",
            "website": getattr(user, "website", "") or "",
            "profile_img": user.profile_img or "",
            "is_private": user.is_private,
            "is_verified": getattr(user, "is_verified", False),
            "follower_count": follower_count,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/api/v1/search/internal/users/",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=2)
    except Exception as e:
        logger.warning(f"search sync failed: {e}")


class RegisterView(generics.CreateAPIView):
    """AUTH-01: メールアドレス・電話番号でのアカウント登録"""
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _sync_to_search(user)
        refresh = UserRefreshToken.for_user(user)
        return Response({
            "user": UserProfileSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """AUTH-07: プロフィール取得・編集"""
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    lookup_field = "username"

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        user = serializer.save()
        _sync_to_search(user)


class MeView(generics.RetrieveUpdateAPIView):
    """現在のユーザー情報取得・更新"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = serializer.save()
        _sync_to_search(user)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def follow_user(request, username):
    """SOC-04/SOC-05: フォロー・フォローリクエスト"""
    followee = get_object_or_404(User, username=username)
    follower = request.user

    if follower == followee:
        return Response({"detail": "自分自身をフォローできません"}, status=status.HTTP_400_BAD_REQUEST)

    follow, created = Follow.objects.get_or_create(
        follower=follower,
        followee=followee,
        defaults={"status": "pending" if followee.is_private else "active"},
    )

    if not created:
        return Response({"detail": "すでにフォロー済みです"}, status=status.HTTP_400_BAD_REQUEST)

    # 通知送信 (アクティブフォローのみ)
    if follow.status == Follow.STATUS_ACTIVE:
        _sync_to_search(followee)
        _send_notification({
            "user_id": str(followee.user_id),
            "actor_id": str(follower.user_id),
            "type": "follow",
            "ref_id": str(follower.user_id),
        })
    else:
        _send_notification({
            "user_id": str(followee.user_id),
            "actor_id": str(follower.user_id),
            "type": "follow_request",
            "ref_id": str(follower.user_id),
        })

    return Response(FollowSerializer(follow).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def unfollow_user(request, username):
    """SOC-04: アンフォロー"""
    followee = get_object_or_404(User, username=username)
    deleted, _ = Follow.objects.filter(follower=request.user, followee=followee).delete()
    if deleted == 0:
        return Response({"detail": "フォローしていません"}, status=status.HTTP_404_NOT_FOUND)
    _sync_to_search(followee)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def users_by_ids(request):
    """内部API: user_id リストでユーザーを一括取得 (フロントエンド・他サービス用)"""
    ids_param = request.query_params.get("ids", "")
    if not ids_param:
        return Response([])
    user_ids = [uid.strip() for uid in ids_param.split(",") if uid.strip()]
    users = User.objects.filter(user_id__in=user_ids)
    return Response(UserProfileSerializer(users, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def internal_follower_ids(request, user_id):
    """内部API: 指定ユーザーのアクティブフォロワーIDリストを返す (post-service Celery用)"""
    follower_ids = list(
        Follow.objects.filter(followee_id=user_id, status="active")
        .values_list("follower_id", flat=True)
    )
    return Response({"follower_ids": [str(fid) for fid in follower_ids]})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def following_ids(request):
    """フォロー中ユーザーのIDリストを返す (ストーリーバー用)"""
    user = request.user
    ids = list(
        Follow.objects.filter(follower=user, status="active")
        .values_list("followee_id", flat=True)
    )
    # 自分自身も含める
    ids = [str(user.user_id)] + [str(i) for i in ids]
    return Response({"ids": ids})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def is_following(request, username):
    """特定ユーザーをフォロー中か確認"""
    followee = get_object_or_404(User, username=username)
    exists = Follow.objects.filter(
        follower=request.user, followee=followee, status="active"
    ).exists()
    return Response({"is_following": exists})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def suggested_users(request):
    """フォロー提案: まだフォローしていないアクティブユーザーをランダムに返す"""
    user = request.user
    following_ids_qs = Follow.objects.filter(follower=user, status="active").values_list("followee_id", flat=True)
    excluded = list(following_ids_qs) + [user.user_id]
    suggestions = User.objects.exclude(user_id__in=excluded).order_by("?")[:5]
    return Response(UserProfileSerializer(suggestions, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def followers_list(request, username):
    """SOC-04: フォロワー一覧"""
    user = get_object_or_404(User, username=username)
    follows = Follow.objects.filter(followee=user, status="active").select_related("follower")
    followers = [f.follower for f in follows]
    return Response(UserProfileSerializer(followers, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def following_list(request, username):
    """SOC-04: フォロー中一覧"""
    user = get_object_or_404(User, username=username)
    follows = Follow.objects.filter(follower=user, status="active").select_related("followee")
    following = [f.followee for f in follows]
    return Response(UserProfileSerializer(following, many=True).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """AUTH-06: パスワード変更"""
    user = request.user
    old_password = request.data.get("old_password", "")
    new_password = request.data.get("new_password", "")

    if not old_password or not new_password:
        return Response(
            {"detail": "old_password と new_password は必須です"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(old_password):
        return Response({"detail": "現在のパスワードが正しくありません"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response({"detail": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return Response({"detail": "パスワードを変更しました"})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def pending_follow_requests(request):
    """SOC-05: 自分へのフォローリクエスト一覧 (非公開アカウント用)"""
    follows = Follow.objects.filter(followee=request.user, status="pending").select_related("follower")
    requesters = [f.follower for f in follows]
    return Response(UserProfileSerializer(requesters, many=True).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def approve_follow_request(request, username):
    """SOC-05: フォローリクエスト承認"""
    requester = get_object_or_404(User, username=username)
    follow = get_object_or_404(Follow, follower=requester, followee=request.user, status="pending")
    follow.status = Follow.STATUS_ACTIVE
    follow.save(update_fields=["status"])
    _sync_to_search(request.user)

    _send_notification({
        "user_id": str(requester.user_id),
        "actor_id": str(request.user.user_id),
        "type": "follow",
        "ref_id": str(request.user.user_id),
    })
    return Response({"detail": "フォローリクエストを承認しました"})


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def reject_follow_request(request, username):
    """SOC-05: フォローリクエスト拒否"""
    requester = get_object_or_404(User, username=username)
    deleted, _ = Follow.objects.filter(follower=requester, followee=request.user, status="pending").delete()
    if not deleted:
        return Response({"detail": "リクエストが見つかりません"}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_account(request):
    """AUTH-08: アカウント削除（30日間の猶予期間は本番で実装）"""
    request.user.is_active = False
    request.user.save(update_fields=["is_active"])
    return Response({"detail": "アカウントを無効化しました。30日後に完全削除されます。"}, status=status.HTTP_200_OK)
