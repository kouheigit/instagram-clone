"""
DMモデル
要件定義書 DM-01〜DM-05 に基づく
"""
import uuid
from django.db import models


class Conversation(models.Model):
    """
    DM スレッド (2人のユーザー間)
    DM-01: 1対1のDM
    """
    conversation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # 最終メッセージ送信時刻でソート

    class Meta:
        db_table = "conversations"
        ordering = ["-updated_at"]


class ConversationMember(models.Model):
    """
    会話参加者
    """
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="members")
    user_id = models.UUIDField(db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)  # DM-04: 既読管理

    class Meta:
        db_table = "conversation_members"
        unique_together = [("conversation", "user_id")]
        indexes = [
            models.Index(fields=["user_id", "conversation"]),
        ]


class Message(models.Model):
    """
    DMメッセージ
    DM-02: テキスト / DM-03: メディア送信
    """
    TYPE_TEXT = "text"
    TYPE_IMAGE = "image"
    TYPE_VIDEO = "video"
    TYPE_CHOICES = [
        (TYPE_TEXT, "テキスト"),
        (TYPE_IMAGE, "画像"),
        (TYPE_VIDEO, "動画"),
    ]

    message_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender_id = models.UUIDField(db_index=True)
    message_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_TEXT)
    content = models.TextField(max_length=2000, blank=True)   # テキスト本文
    media_url = models.CharField(max_length=512, blank=True)  # メディアURL (DM-03)
    is_deleted = models.BooleanField(default=False)            # DM-05: 送信取り消し
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]

    def __str__(self):
        return f"Message({self.message_id}) in {self.conversation_id}"
