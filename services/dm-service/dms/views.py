"""
DM API
要件定義書 DM-01〜DM-05 に基づく
"""
import logging
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Conversation, ConversationMember, Message
from .serializers import ConversationSerializer, MessageSerializer, MessageCreateSerializer

logger = logging.getLogger(__name__)


def get_user_id(request):
    if request.META.get("HTTP_X_USER_ID"):
        return request.META["HTTP_X_USER_ID"]
    user = getattr(request, "user", None)
    if user and hasattr(user, "user_id") and user.user_id:
        return str(user.user_id)
    return ""


class ConversationListView(generics.ListAPIView):
    """DM-01: 自分の会話一覧"""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = get_user_id(self.request)
        if not user_id:
            return Conversation.objects.none()
        conv_ids = ConversationMember.objects.filter(
            user_id=user_id
        ).values_list("conversation_id", flat=True)
        return Conversation.objects.filter(conversation_id__in=conv_ids).prefetch_related("members")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["user_id"] = get_user_id(self.request)
        return ctx


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_or_get_conversation(request):
    """
    DM-01: 相手のユーザーIDを指定してDMスレッドを開始 (既存なら取得)
    Body: { "partner_id": "<uuid>" }
    """
    my_id = get_user_id(request)
    partner_id = request.data.get("partner_id")

    if not partner_id:
        return Response({"detail": "partner_id は必須です"}, status=status.HTTP_400_BAD_REQUEST)
    if str(my_id) == str(partner_id):
        return Response({"detail": "自分自身とのDMはできません"}, status=status.HTTP_400_BAD_REQUEST)

    # 既存の会話を探す (双方が参加している会話)
    my_convs = ConversationMember.objects.filter(user_id=my_id).values_list("conversation_id", flat=True)
    partner_convs = ConversationMember.objects.filter(user_id=partner_id).values_list("conversation_id", flat=True)
    common = set(my_convs) & set(partner_convs)

    if common:
        conversation = Conversation.objects.get(conversation_id__in=common)
    else:
        conversation = Conversation.objects.create()
        ConversationMember.objects.create(conversation=conversation, user_id=my_id)
        ConversationMember.objects.create(conversation=conversation, user_id=partner_id)
        logger.info(f"Conversation created: {conversation.conversation_id}")

    serializer = ConversationSerializer(conversation, context={"user_id": my_id, "request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


class MessageListView(generics.ListAPIView):
    """DM-02: メッセージ一覧 (会話内)"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = get_user_id(self.request)
        conversation_id = self.kwargs["conversation_id"]

        # 自分が参加している会話かチェック
        get_object_or_404(ConversationMember, conversation_id=conversation_id, user_id=user_id)
        return Message.objects.filter(
            conversation_id=conversation_id,
            is_deleted=False,
        ).order_by("created_at")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def send_message(request, conversation_id):
    """DM-02/DM-03: メッセージ送信"""
    user_id = get_user_id(request)
    member = get_object_or_404(ConversationMember, conversation_id=conversation_id, user_id=user_id)

    serializer = MessageCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    message = Message.objects.create(
        conversation_id=conversation_id,
        sender_id=user_id,
        **serializer.validated_data,
    )

    # 会話の updated_at を更新してソート順に反映
    Conversation.objects.filter(pk=conversation_id).update(updated_at=timezone.now())

    logger.info(f"Message sent: {message.message_id} in conversation {conversation_id}")
    return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_message(request, conversation_id, message_id):
    """DM-05: メッセージ送信取り消し (論理削除)"""
    user_id = get_user_id(request)
    message = get_object_or_404(Message, message_id=message_id, conversation_id=conversation_id)

    if str(message.sender_id) != str(user_id):
        return Response({"detail": "自分のメッセージのみ取り消せます"}, status=status.HTTP_403_FORBIDDEN)

    message.is_deleted = True
    message.save(update_fields=["is_deleted"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request, conversation_id):
    """DM-04: 既読にする"""
    user_id = get_user_id(request)
    member = get_object_or_404(ConversationMember, conversation_id=conversation_id, user_id=user_id)
    member.last_read_at = timezone.now()
    member.save(update_fields=["last_read_at"])
    return Response({"read": True})
