"""
検索インデックスモデル
要件定義書 SEARCH-01〜SEARCH-03 に基づく
PostgreSQL の全文検索 (pg_trgm) を活用
"""
import uuid
from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField


class UserIndex(models.Model):
    """
    ユーザー検索インデックス (SEARCH-01: ユーザー名・プロフィール検索)
    user-service から同期 / Kafka user.updated イベントで更新
    """
    user_id     = models.UUIDField(primary_key=True)
    username    = models.CharField(max_length=30, db_index=True)
    name        = models.CharField(max_length=150, blank=True, default="")
    email       = models.EmailField(blank=True, default="")
    bio         = models.TextField(max_length=150, blank=True)
    website     = models.CharField(max_length=200, blank=True, default="")
    profile_img = models.CharField(max_length=512, blank=True)
    is_private  = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    follower_count = models.PositiveIntegerField(default=0)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "search_users"
        indexes = [
            GinIndex(fields=["username"], name="search_users_username_gin",
                     opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name"], name="search_users_name_gin",
                     opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["email"], name="search_users_email_gin",
                     opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return f"@{self.username}"


class HashtagIndex(models.Model):
    """
    ハッシュタグ検索インデックス (SEARCH-02)
    post-service から同期
    """
    hashtag_id  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=100, unique=True, db_index=True)
    post_count  = models.PositiveIntegerField(default=0)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "search_hashtags"
        indexes = [
            GinIndex(fields=["name"], name="search_hashtags_name_gin",
                     opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return f"#{self.name}"


class SearchHistory(models.Model):
    """
    検索履歴 (SEARCH-03: 最近の検索)
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id    = models.UUIDField(db_index=True)
    query      = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "search_history"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user_id", "-created_at"]),
        ]
