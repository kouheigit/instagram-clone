"""
通知モデル
要件定義書 5.1 Notification エンティティ に基づく
"""
import uuid
from django.db import models


class Notification(models.Model):
    TYPE_LIKE           = "like"
    TYPE_COMMENT        = "comment"
    TYPE_FOLLOW         = "follow"
    TYPE_FOLLOW_REQUEST = "follow_request"
    TYPE_MENTION        = "mention"
    TYPE_STORY_VIEW     = "story_view"

    TYPE_CHOICES = [
        (TYPE_LIKE,           "いいね"),
        (TYPE_COMMENT,        "コメント"),
        (TYPE_FOLLOW,         "フォロー"),
        (TYPE_FOLLOW_REQUEST, "フォローリクエスト"),
        (TYPE_MENTION,        "メンション"),
        (TYPE_STORY_VIEW,     "ストーリーズ閲覧"),
    ]

    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id         = models.UUIDField(db_index=True)   # 通知を受け取るユーザー
    actor_id        = models.UUIDField(null=True)        # 通知を発生させたユーザー
    type            = models.CharField(max_length=30, choices=TYPE_CHOICES)
    ref_id          = models.UUIDField(null=True, blank=True)  # 参照先ID (post_id等)
    is_read         = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user_id", "is_read", "-created_at"]),
        ]
