from rest_framework import serializers
from .models import MediaFile

# 画像: 10MB, 動画: 100MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_VIDEO_SIZE = 100 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-m4v", "video/avi", "video/x-msvideo"}


class MediaFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaFile
        fields = [
            "media_id", "user_id", "media_type", "url", "thumbnail_url",
            "width", "height", "duration", "file_size",
            "status", "created_at",
        ]
        read_only_fields = ["media_id", "user_id", "url", "thumbnail_url", "file_size", "status", "created_at"]


class MediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    media_type = serializers.ChoiceField(choices=["image", "video"])

    def validate(self, data):
        file = data["file"]
        media_type = data["media_type"]
        content_type = getattr(file, "content_type", "")

        if media_type == "image":
            if content_type not in ALLOWED_IMAGE_TYPES:
                raise serializers.ValidationError(
                    f"画像は JPEG/PNG/WebP/GIF のみ対応しています (受信: {content_type})"
                )
            if file.size > MAX_IMAGE_SIZE:
                raise serializers.ValidationError("画像は10MB以下にしてください")
        else:
            if content_type not in ALLOWED_VIDEO_TYPES:
                raise serializers.ValidationError(
                    f"動画は MP4/MOV/AVI のみ対応しています (受信: {content_type})"
                )
            if file.size > MAX_VIDEO_SIZE:
                raise serializers.ValidationError("動画は100MB以下にしてください")

        return data
