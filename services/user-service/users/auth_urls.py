from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from rest_framework_simplejwt.views import TokenObtainPairView as BaseTokenView
from .views import RegisterView, change_password
from .serializers import EmailOrUsernameTokenSerializer


class EmailOrUsernameTokenView(BaseTokenView):
    """ユーザー名またはメールアドレスでログイン (AUTH-02)"""
    serializer_class = EmailOrUsernameTokenSerializer


urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", EmailOrUsernameTokenView.as_view(), name="auth-login"),  # AUTH-02
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="auth-token-verify"),
    path("password/change/", change_password, name="auth-password-change"),  # AUTH-06
]
