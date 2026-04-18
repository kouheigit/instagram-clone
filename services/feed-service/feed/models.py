"""
フィードタイムラインモデル (コンパクト版: PostgreSQLで管理)
詳細設計書 3.5 feed-service に基づく
本番では Cassandra の feed_timeline テーブルを使用
"""
import uuid
from django.db import models


class FeedItem(models.Model):
    """
    ユーザーのフィードキャッシュ
    Push/Pull ハイブリッド方式の Push 側 (フォロワー < 10,000)
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id    = models.UUIDField(db_index=True)   # フィードを受け取るユーザー
    post_id    = models.UUIDField()
    author_id  = models.UUIDField()
    score      = models.FloatField(default=0.0)    # スコアリング (詳細設計書 3.5.2)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()             # TTL: 7日

    class Meta:
        db_table = "feed_items"
        ordering = ["-score", "-created_at"]
        indexes = [
            models.Index(fields=["user_id", "-score", "-created_at"]),
        ]
        unique_together = [("user_id", "post_id")]
