from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthLoginTests(APITestCase):
    def setUp(self):
        self.password = "Pass1234!"
        self.user = User.objects.create_user(
            username="alice_photo",
            email="alice@example.com",
            password=self.password,
        )

    def test_login_with_username_returns_tokens(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_email_returns_tokens(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_identifier_whitespace_returns_tokens(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": f"  {self.user.email}  ", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_login_with_wrong_password_is_rejected(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "wrong-pass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_mixed_case_username_returns_tokens(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "Alice_Photo", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_login_with_mixed_case_email_returns_tokens(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "ALICE@EXAMPLE.COM", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
