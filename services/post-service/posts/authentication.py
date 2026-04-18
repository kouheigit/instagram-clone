"""
マイクロサービス用JWT認証
user-serviceが発行したJWTトークンを検証し、DBルックアップ不要でuser_idを取得する
"""
import uuid
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class ServiceUser:
    """DBを持たないサービス用の疑似ユーザーオブジェクト"""
    is_authenticated = True
    is_anonymous = False

    def __init__(self, user_id, username):
        self.user_id = uuid.UUID(str(user_id)) if user_id else None
        self.username = username
        self.pk = self.user_id

    def __str__(self):
        return f"@{self.username}"


class MicroserviceJWTAuthentication(JWTAuthentication):
    """
    JWTトークンを検証してServiceUserを返す。
    DBルックアップは行わない（post/feed/dm等のサービス向け）
    """

    def get_user(self, validated_token):
        try:
            user_id = validated_token.get("user_id")
            username = validated_token.get("username", "")
            if not user_id:
                raise InvalidToken("user_id がトークンに含まれていません")
            return ServiceUser(user_id=user_id, username=username)
        except Exception as e:
            raise InvalidToken(str(e))
