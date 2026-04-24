"""
メディアアップロードAPI
要件定義書 POST-02 に基づく
"""
import json
import logging
import os
import subprocess
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import MediaFile
from .serializers import MediaFileSerializer, MediaUploadSerializer

logger = logging.getLogger(__name__)

MAX_VIDEO_DURATION = 60  # seconds


def get_user_id(request):
    if hasattr(request, "user") and hasattr(request.user, "user_id") and request.user.user_id:
        return str(request.user.user_id)
    return request.META.get("HTTP_X_USER_ID", "")


def _extract_video_duration(file_path: str) -> float | None:
    """ffprobe で動画の長さ（秒）を取得する。ffprobe が無い場合は None を返す。"""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", file_path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            logger.warning(f"ffprobe failed: {result.stderr[:200]}")
            return None
        info = json.loads(result.stdout)
        return float(info.get("format", {}).get("duration", 0))
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError, ValueError) as e:
        logger.warning(f"ffprobe unavailable or failed: {e}")
        return None


def _generate_thumbnail(file_path: str, user_id: str, media_id: str) -> str:
    """ffmpeg で動画の最初のフレームをサムネイルとして保存し、公開URLを返す。失敗時は空文字。"""
    thumb_dir = os.path.dirname(file_path)
    thumb_filename = f"thumb_{media_id}.jpg"
    thumb_path = os.path.join(thumb_dir, thumb_filename)
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", file_path,
                "-vframes", "1", "-q:v", "2",
                thumb_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0 and os.path.exists(thumb_path):
            return f"/media/{user_id}/{thumb_filename}"
        logger.warning(f"ffmpeg thumbnail failed: {result.stderr[:200]}")
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        logger.warning(f"ffmpeg unavailable or failed: {e}")
    return ""


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_media(request):
    """
    POST-02: メディアファイルアップロード
    multipart/form-data で file と media_type を送信
    動画の場合: 最大100MB / 最大60秒 / サムネイル自動生成
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
        status=MediaFile.STATUS_PROCESSING if media_type == "video" else MediaFile.STATUS_READY,
    )
    media.file = file
    media.save()

    media.url = f"/media/{media.file.name}"

    if media_type == "video":
        file_path = media.file.path
        media_id_str = str(media.media_id)

        # 動画の長さを取得してバリデーション
        duration_float = _extract_video_duration(file_path)
        if duration_float is not None:
            if duration_float > MAX_VIDEO_DURATION:
                # ファイルとレコードを削除してエラーを返す
                try:
                    os.remove(file_path)
                except OSError:
                    pass
                media.delete()
                return Response(
                    {"detail": f"動画は{MAX_VIDEO_DURATION}秒以下にしてください（現在: {int(duration_float)}秒）"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            media.duration = int(duration_float)

        # サムネイル生成
        thumb_url = _generate_thumbnail(file_path, user_id, media_id_str)
        if thumb_url:
            media.thumbnail_url = thumb_url

        media.status = MediaFile.STATUS_READY

    media.save()

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

    if media.file and os.path.exists(media.file.path):
        try:
            os.remove(media.file.path)
        except OSError as e:
            logger.warning(f"File delete failed: {e}")

    # サムネイルファイルも削除
    if media.thumbnail_url:
        thumb_path = os.path.join(settings.MEDIA_ROOT, media.thumbnail_url.lstrip("/media/"))
        if os.path.exists(thumb_path):
            try:
                os.remove(thumb_path)
            except OSError:
                pass

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
