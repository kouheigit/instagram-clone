import re
from rest_framework import serializers
from .models import Post, PostMedia, Like, Comment, SavedPost, Hashtag


class PostMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostMedia
        fields = ["media_id", "media_url", "thumbnail_url", "media_order", "width", "height", "duration"]


class PostSerializer(serializers.ModelSerializer):
    media_files = PostMediaSerializer(many=True, read_only=True)
    is_liked    = serializers.SerializerMethodField()
    is_saved    = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "post_id", "user_id", "caption", "media_type", "location",
            "like_count", "comment_count", "media_files",
            "is_liked", "is_saved", "created_at",
        ]
        read_only_fields = ["post_id", "user_id", "like_count", "comment_count", "created_at"]

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and hasattr(request.user, "user_id"):
            return obj.likes.filter(user_id=request.user.user_id).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and hasattr(request.user, "user_id"):
            return obj.saved_by.filter(user_id=request.user.user_id).exists()
        return False


class PostCreateSerializer(serializers.ModelSerializer):
    media_files = PostMediaSerializer(many=True)

    class Meta:
        model = Post
        fields = ["post_id", "caption", "media_type", "location", "media_files"]
        read_only_fields = ["post_id"]

    def validate_media_type(self, value):
        # 'image' → 'photo' の正規化（フロントエンドとの互換）
        if value == "image":
            return "photo"
        return value

    def validate_media_files(self, value):
        if not value:
            raise serializers.ValidationError("メディアファイルは1つ以上必要です")
        if len(value) > 10:
            raise serializers.ValidationError("カルーセルは最大10枚です (POST-01)")
        return value

    def create(self, validated_data):
        media_data = validated_data.pop("media_files")
        post = Post.objects.create(**validated_data)
        for i, media in enumerate(media_data, start=1):
            media.pop("media_order", None)  # 重複を避けてインデックスで上書き
            PostMedia.objects.create(post=post, media_order=i, **media)

        # ハッシュタグ解析
        caption = validated_data.get("caption", "")
        tags = re.findall(r"#(\w+)", caption)
        for tag_name in set(tags):
            hashtag, _ = Hashtag.objects.get_or_create(name=tag_name.lower())
            Hashtag.objects.filter(pk=hashtag.pk).update(post_count=hashtag.post_count + 1)
            post.posthashtag_set.create(hashtag=hashtag)

        return post


class CommentSerializer(serializers.ModelSerializer):
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["comment_id", "user_id", "content", "like_count", "parent_id", "replies", "created_at"]
        read_only_fields = ["comment_id", "user_id", "like_count", "created_at"]

    def get_replies(self, obj):
        if obj.parent is None:  # 2階層まで (SOC-02)
            return CommentSerializer(
                obj.replies.filter(is_deleted=False), many=True, context=self.context
            ).data
        return []
