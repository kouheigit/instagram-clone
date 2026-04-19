from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import User, Follow
from .tokens import UserRefreshToken


class EmailOrUsernameTokenSerializer(TokenObtainPairSerializer):
    """ユーザー名またはメールアドレスでログインできるカスタムシリアライザー"""

    @classmethod
    def get_token(cls, user):
        return UserRefreshToken.for_user(user)

    def validate(self, attrs):
        username_or_email = (attrs.get(self.username_field) or "").strip()
        password = attrs.get("password") or ""

        if not username_or_email or not password:
            raise AuthenticationFailed("No active account found with the given credentials")

        # メールアドレスで入力された場合はユーザー名に変換
        if "@" in username_or_email:
            try:
                user_obj = User.objects.get(email__iexact=username_or_email)
                attrs[self.username_field] = user_obj.username
            except User.DoesNotExist:
                raise AuthenticationFailed("No active account found with the given credentials")

        return super().validate(attrs)


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "phone", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "user_id", "username", "bio", "profile_img",
            "is_private", "is_verified", "follower_count",
            "following_count", "created_at",
        ]
        read_only_fields = ["user_id", "is_verified", "created_at"]

    def get_follower_count(self, obj):
        return obj.followers.filter(status="active").count()

    def get_following_count(self, obj):
        return obj.following.filter(status="active").count()


class FollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Follow
        fields = ["follower", "followee", "status", "created_at"]
        read_only_fields = ["status", "created_at"]
