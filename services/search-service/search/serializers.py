from rest_framework import serializers
from .models import UserIndex, HashtagIndex, SearchHistory


class UserIndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserIndex
        fields = [
            "user_id", "username", "name", "bio", "website", "profile_img",
            "is_private", "is_verified", "follower_count",
        ]


class HashtagIndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = HashtagIndex
        fields = ["hashtag_id", "name", "post_count"]


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ["id", "query", "created_at"]
        read_only_fields = ["id", "created_at"]
