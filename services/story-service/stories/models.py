"""
ストーリーズモデル
要件定義書 POST-04: 24時間で自動削除
"""
import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


def default_expires_at():
    return timezone.now() + timedelta(hours=24)


class Story(models.Model):
    MEDIA_PHOTO = "photo"
    MEDIA_VIDEO = "video"
    MEDIA_CHOICES = [(MEDIA_PHOTO, "Photo"), (MEDIA_VIDEO, "Video")]

    story_id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id    = models.UUIDField(db_index=True)
    media_url  = models.CharField(max_length=512)
    media_type = models.CharField(max_length=10, choices=MEDIA_CHOICES)
    view_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(default=default_expires_at)  # POST-04: 24時間TTL
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stories"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user_id", "-created_at"]),
            models.Index(fields=["expires_at"]),
        ]

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class StoryView(models.Model):
    """ストーリーズ閲覧記録 (詳細設計書 4.3: 24時間TTL)"""
    story     = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="views")
    viewer_id = models.UUIDField()
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "story_views"
        unique_together = [("story", "viewer_id")]
