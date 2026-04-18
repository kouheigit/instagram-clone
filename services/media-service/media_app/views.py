"""
メディアアップロードAPI
要件定義書 POST-02 に基づく
"""
import logging
import os
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import MediaFile
from .serializers import MediaFileSerializer, MediaUploadSerializer

logger = logging.getLogger(__name__)


def get_user_id(request):
    # JWT認証済みの場合はrequest.user.user_idを優先
    if hasattr(request, "user") and hasattr(request.user, "user_id") and request.user.user_id:
        return str(request.user.user_id)
    return request.META.get("HTTP_X_USER_ID", "")


def build_media_url(request, file_path: str) -> str:
    """Nginx 経由の公開URLを生成"""
    filename = os.path.basename(file_path)
    user_id = os.path.dirname(file_path)
    return f"{settings.MEDIA_BASE_URL}/media/{file_path}"


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_media(request):
    """
    POST-02: メディアファイルアップロード
    multipart/form-data で file と media_type を送信
    """
    user_id = get_user_id(request)

    serializer = MediaUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    file = serializer.validated_data["file"]
    media_type = serializer.validated_data["media_type"]

    media = MediaFile(
        user_id=user_id,
        media_type=media_type,
        file_size=file.size,
        status=MediaFile.STATUS_READY,
    )
    media.file = file
    media.save()

    # 公開URLをセット (Nginx /media/ 経由)
    media.url = f"/media/{media.file.name}"
    media.save(update_fields=["url"])

    logger.info(f"Media uploaded: {media.media_id} by user {user_id} ({media_type})")
    return Response(MediaFileSerializer(media).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_media(request, media_id):
    """メディアファイル情報取得"""
    media = get_object_or_404(MediaFile, media_id=media_id)
    return Response(MediaFileSerializer(media).data)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_media(request, media_id):
    """メディアファイル削除"""
    user_id = get_user_id(request)
    media = get_object_or_404(MediaFile, media_id=media_id)

    if str(media.user_id) != str(user_id):
        return Response({"detail": "権限がありません"}, status=status.HTTP_403_FORBIDDEN)

    # ファイルを削除してからDBレコードを削除
    if media.file and os.path.exists(media.file.path):
        try:
            os.remove(media.file.path)
        except OSError as e:
            logger.warning(f"File delete failed: {e}")

    media.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_user_media(request):
    """自分のアップロード済みメディア一覧"""
    user_id = get_user_id(request)
    media_type = request.query_params.get("type")

    qs = MediaFile.objects.filter(user_id=user_id)
    if media_type in ("image", "video"):
        qs = qs.filter(media_type=media_type)

    return Response(MediaFileSerializer(qs[:50], many=True).data)
