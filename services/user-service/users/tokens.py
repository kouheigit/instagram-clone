from rest_framework_simplejwt.tokens import RefreshToken


class UserRefreshToken(RefreshToken):
    """user_id をUUIDで扱うカスタムトークン"""

    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        # user_id (UUID) をペイロードに追加
        token["user_id"] = str(user.user_id)
        token["username"] = user.username
        return token
