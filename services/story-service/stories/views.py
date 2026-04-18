"""
ストーリーズAPI (POST-04, SOC-06)
"""
import logging
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Story, StoryView

logger = logging.getLogger(__name__)


class StorySerializer(serializers.ModelSerializer):
    is_viewed = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ["story_id", "user_id", "media_url", "media_type", "view_count", "expires_at", "is_viewed", "created_at"]
        read_only_fields = ["story_id", "user_id", "view_count", "expires_at", "created_at"]

    def get_is_viewed(self, obj):
        viewer_id = self.context.get("viewer_id")
        if viewer_id:
            return obj.views.filter(viewer_id=viewer_id).exists()
        return False


def get_user_id(request):
    if request.META.get("HTTP_X_USER_ID"):
        return request.META["HTTP_X_USER_ID"]
    user = getattr(request, "user", None)
    if user and hasattr(user, "user_id") and user.user_id:
        return str(user.user_id)
    return ""


class StoryCreateView(generics.CreateAPIView):
    """POST-04: ストーリーズ投稿"""
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user_id=get_user_id(self.request))


class UserStoryListView(generics.ListAPIView):
    """特定ユーザーの有効なストーリーズ一覧"""
    serializer_class = StorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Story.objects.filter(
            user_id=self.kwargs["user_id"],
            expires_at__gte=timezone.now(),
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["viewer_id"] = get_user_id(self.request)
        return ctx


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def view_story(request, story_id):
    """ストーリーズ閲覧記録"""
    story = get_object_or_404(Story, story_id=story_id, expires_at__gte=timezone.now())
    viewer_id = get_user_id(request)
    _, created = StoryView.objects.get_or_create(story=story, viewer_id=viewer_id)
    if created:
        Story.objects.filter(pk=story_id).update(view_count=story.view_count + 1)
    return Response({"viewed": True})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def stories_by_users(request):
    """複数ユーザーのストーリー一括取得 (ストーリーバー用)"""
    ids_param = request.query_params.get("ids", "")
    if not ids_param:
        return Response([])
    user_ids = [uid.strip() for uid in ids_param.split(",") if uid.strip()]
    viewer_id = get_user_id(request)
    stories = Story.objects.filter(
        user_id__in=user_ids,
        expires_at__gte=timezone.now(),
    ).order_by("user_id", "-created_at")
    serializer = StorySerializer(stories, many=True, context={"viewer_id": viewer_id})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def story_viewers(request, story_id):
    """ストーリー閲覧者一覧 (自分のストーリーのみ閲覧可能)"""
    story = get_object_or_404(Story, story_id=story_id)
    user_id = get_user_id(request)

    if str(story.user_id) != user_id:
        return Response({"detail": "自分のストーリーのみ閲覧者を確認できます"}, status=status.HTTP_403_FORBIDDEN)

    viewers = StoryView.objects.filter(story=story).order_by("-viewed_at")
    data = [
        {"viewer_id": str(v.viewer_id), "viewed_at": v.viewed_at.isoformat()}
        for v in viewers
    ]
    return Response({"count": len(data), "viewers": data})


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_story(request, story_id):
    story = get_object_or_404(Story, story_id=story_id)
    if str(story.user_id) != get_user_id(request):
        return Response({"detail": "権限がありません"}, status=status.HTTP_403_FORBIDDEN)
    story.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
