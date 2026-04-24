"""
投稿モデル
要件定義書 POST-01〜POST-10, SOC-01/SOC-02/SOC-07 に基づく
"""
import uuid
from django.db import models


class Post(models.Model):
    MEDIA_PHOTO = "photo"
    MEDIA_VIDEO = "video"
    MEDIA_REEL  = "reel"
    MEDIA_CHOICES = [
        (MEDIA_PHOTO, "Photo"),
        (MEDIA_VIDEO, "Video"),
        (MEDIA_REEL,  "Reel"),
    ]

    post_id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id       = models.UUIDField(db_index=True)           # user-service の user_id
    caption       = models.TextField(max_length=2200, blank=True)  # POST-06
    media_type    = models.CharField(max_length=10, choices=MEDIA_CHOICES)
    location      = models.CharField(max_length=255, blank=True)   # POST-07
    like_count    = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    is_deleted    = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "posts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user_id", "-created_at"]),
        ]

    def __str__(self):
        return f"Post({self.post_id}) by user({self.user_id})"


class PostMedia(models.Model):
    """カルーセル投稿 (POST-01: 最大10枚)"""
    media_id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post          = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="media_files")
    media_url     = models.CharField(max_length=512)
    thumbnail_url = models.CharField(max_length=512, blank=True)  # 動画サムネイル
    media_order   = models.PositiveSmallIntegerField()             # 1〜10
    width         = models.IntegerField(null=True, blank=True)
    height        = models.IntegerField(null=True, blank=True)
    duration      = models.IntegerField(null=True, blank=True)     # 動画: 秒数

    class Meta:
        db_table = "post_media"
        ordering = ["media_order"]
        unique_together = [("post", "media_order")]


class Like(models.Model):
    """いいね (SOC-01)"""
    user_id    = models.UUIDField()
    post       = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "likes"
        unique_together = [("user_id", "post")]
        indexes = [models.Index(fields=["post"])]


class Comment(models.Model):
    """コメント (SOC-02: ネスト2階層)"""
    comment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post       = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    user_id    = models.UUIDField()
    parent     = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies"
    )
    content    = models.TextField(max_length=2200)
    like_count = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comments"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["post", "created_at"]),
            models.Index(fields=["parent"]),
        ]


class SavedPost(models.Model):
    """保存コレクション (SOC-07)"""
    user_id    = models.UUIDField()
    post       = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="saved_by")
    collection = models.CharField(max_length=100, default="default")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_posts"
        unique_together = [("user_id", "post")]


class Hashtag(models.Model):
    hashtag_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name       = models.CharField(max_length=100, unique=True, db_index=True)
    post_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "hashtags"

    def __str__(self):
        return f"#{self.name}"


class PostHashtag(models.Model):
    post    = models.ForeignKey(Post, on_delete=models.CASCADE)
    hashtag = models.ForeignKey(Hashtag, on_delete=models.CASCADE)

    class Meta:
        db_table = "post_hashtags"
        unique_together = [("post", "hashtag")]
