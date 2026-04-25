"""
メディアファイル管理モデル
要件定義書 POST-02: 画像/動画アップロード
"""
import uuid
import os
from django.db import models


def media_upload_path(instance, filename):
    """アップロードパスを user_id / ファイル名 で整理"""
    ext = os.path.splitext(filename)[1].lower()
    return f"{instance.user_id}/{instance.media_id}{ext}"


class MediaFile(models.Model):
    """
    アップロード済みメディアファイル
    POST-02: 画像最大10枚、動画最大60秒
    """
    TYPE_IMAGE = "image"
    TYPE_VIDEO = "video"
    TYPE_CHOICES = [(TYPE_IMAGE, "画像"), (TYPE_VIDEO, "動画")]

    STATUS_PENDING    = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_READY      = "ready"
    STATUS_FAILED     = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING,    "アップロード待ち"),
        (STATUS_PROCESSING, "処理中"),
        (STATUS_READY,      "完了"),
        (STATUS_FAILED,     "失敗"),
    ]

    media_id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id       = models.UUIDField(db_index=True)
    media_type    = models.CharField(max_length=10, choices=TYPE_CHOICES)
    file          = models.FileField(upload_to=media_upload_path)
    url           = models.CharField(max_length=512, blank=True)            # 公開URL (Nginx経由)
    thumbnail_url = models.CharField(max_length=512, blank=True)            # 動画サムネイル
    hls_url       = models.CharField(max_length=512, blank=True)            # HLS playlist URL
    width         = models.IntegerField(null=True, blank=True)
    height        = models.IntegerField(null=True, blank=True)
    duration      = models.IntegerField(null=True, blank=True)              # 動画: 秒数
    file_size     = models.PositiveIntegerField(default=0)                  # bytes
    status        = models.CharField(max_length=15, choices=STATUS_CHOICES, default=STATUS_READY)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "media_files"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user_id", "-created_at"]),
        ]

    def __str__(self):
        return f"MediaFile({self.media_id}) {self.media_type}"
