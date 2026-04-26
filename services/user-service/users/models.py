"""
ユーザーモデル
詳細設計書 3.2.1 データモデル に基づく
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError("メールアドレスは必須です")
        if not username:
            raise ValueError("ユーザー名は必須です")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    users テーブル
    詳細設計書 3.2.1・要件定義書 5.1 User エンティティ
    """
    user_id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username    = models.CharField(max_length=30, unique=True, db_index=True)
    email       = models.EmailField(unique=True, db_index=True)
    phone       = models.CharField(max_length=20, null=True, blank=True)
    GENDER_CHOICES = [
        ("male", "男性"),
        ("female", "女性"),
        ("custom", "カスタム"),
        ("prefer_not", "回答しない"),
    ]

    bio         = models.TextField(max_length=150, blank=True)
    website     = models.CharField(max_length=200, blank=True)
    gender      = models.CharField(max_length=20, choices=GENDER_CHOICES, default="male", blank=True)
    profile_img = models.CharField(max_length=512, blank=True)  # S3 URL
    is_private  = models.BooleanField(default=False)
    show_account_suggestions = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_staff    = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["username"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"@{self.username}"


class Follow(models.Model):
    """
    follows テーブル
    要件定義書 SOC-04/SOC-05
    """
    STATUS_ACTIVE  = "active"
    STATUS_PENDING = "pending"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_PENDING, "Pending"),
    ]

    follower  = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following", db_column="follower_id")
    followee  = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers", db_column="followee_id")
    status    = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "follows"
        unique_together = [("follower", "followee")]
        indexes = [
            models.Index(fields=["followee", "status"]),
            models.Index(fields=["follower", "status"]),
        ]
