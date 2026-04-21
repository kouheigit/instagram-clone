import uuid

from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from .models import UserIndex
from .views import search, search_users


class AuthenticatedServiceUser:
    is_authenticated = True

    def __init__(self):
        self.user_id = uuid.uuid4()
        self.username = "viewer"


class SearchUserApiTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth_user = AuthenticatedServiceUser()

        UserIndex.objects.create(
            user_id=uuid.uuid4(),
            username="testuser1",
            name="Test User One",
            email="testuser1@example.com",
            bio="primary match",
            follower_count=1,
        )
        for i in range(25):
            UserIndex.objects.create(
                user_id=uuid.uuid4(),
                username=f"poweruser{i}",
                name=f"Power User {i}",
                email=f"power{i}@example.com",
                bio="noise",
                is_verified=True,
                follower_count=1000 - i,
            )

    def _search(self, q, path="/api/v1/search/"):
        request = self.factory.get(path, {"q": q})
        force_authenticate(request, user=self.auth_user)
        response = search(request) if path.endswith("/search/") else search_users(request)
        response.render()
        return response

    def test_exact_username_hit_is_returned(self):
        response = self._search("testuser1")

        self.assertEqual(response.status_code, 200)
        usernames = [user["username"] for user in response.data["users"]]
        self.assertIn("testuser1", usernames)
        self.assertEqual(response.data["users"][0]["username"], "testuser1")

    def test_partial_match_returns_user(self):
        response = self._search("test")

        self.assertEqual(response.status_code, 200)
        usernames = [user["username"] for user in response.data["users"]]
        self.assertIn("testuser1", usernames)

    def test_search_is_case_insensitive(self):
        response = self._search("TestUser1")

        self.assertEqual(response.status_code, 200)
        usernames = [user["username"] for user in response.data["users"]]
        self.assertIn("testuser1", usernames)

    def test_search_trims_keyword(self):
        response = self._search(" testuser1 ")

        self.assertEqual(response.status_code, 200)
        usernames = [user["username"] for user in response.data["users"]]
        self.assertIn("testuser1", usernames)

    def test_search_users_endpoint_uses_same_matching_rules(self):
        response = self._search("test", path="/api/v1/search/users/")

        self.assertEqual(response.status_code, 200)
        usernames = [user["username"] for user in response.data]
        self.assertIn("testuser1", usernames)
