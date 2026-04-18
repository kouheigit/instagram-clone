from rest_framework import generics, serializers, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["notification_id", "user_id", "actor_id", "type", "ref_id", "is_read", "created_at"]
        read_only_fields = ["notification_id", "created_at"]


def get_user_id(request):
    if request.META.get("HTTP_X_USER_ID"):
        return request.META["HTTP_X_USER_ID"]
    user = getattr(request, "user", None)
    if user and hasattr(user, "user_id") and user.user_id:
        return str(user.user_id)
    return ""


class NotificationListView(generics.ListAPIView):
    """通知一覧"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = get_user_id(self.request)
        if not user_id:
            return Notification.objects.none()
        return Notification.objects.filter(user_id=user_id)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_all_read(request):
    """全通知を既読にする"""
    user_id = get_user_id(request)
    if not user_id:
        return Response({"marked_read": 0})
    updated = Notification.objects.filter(user_id=user_id, is_read=False).update(is_read=True)
    return Response({"marked_read": updated})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """未読通知件数"""
    user_id = get_user_id(request)
    if not user_id:
        return Response({"unread_count": 0})
    count = Notification.objects.filter(user_id=user_id, is_read=False).count()
    return Response({"unread_count": count})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_single_read(request, notification_id):
    """個別通知の既読化"""
    user_id = get_user_id(request)
    from django.shortcuts import get_object_or_404
    notification = get_object_or_404(Notification, notification_id=notification_id, user_id=user_id)
    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=["is_read"])
    return Response(NotificationSerializer(notification).data)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_notification(request, notification_id):
    """個別通知削除"""
    user_id = get_user_id(request)
    from django.shortcuts import get_object_or_404
    notification = get_object_or_404(Notification, notification_id=notification_id, user_id=user_id)
    notification.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def create_notification(request):
    """内部API: 他サービスから通知を作成する"""
    serializer = NotificationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
