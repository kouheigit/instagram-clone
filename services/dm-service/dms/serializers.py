from rest_framework import serializers
from .models import Conversation, ConversationMember, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "message_id", "conversation", "sender_id",
            "message_type", "content", "media_url",
            "is_deleted", "created_at",
        ]
        read_only_fields = ["message_id", "sender_id", "conversation", "is_deleted", "created_at"]


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["message_type", "content", "media_url"]

    def validate(self, data):
        if data.get("message_type") == Message.TYPE_TEXT and not data.get("content"):
            raise serializers.ValidationError("テキストメッセージには content が必要です")
        if data.get("message_type") in (Message.TYPE_IMAGE, Message.TYPE_VIDEO) and not data.get("media_url"):
            raise serializers.ValidationError("メディアメッセージには media_url が必要です")
        return data


class ConversationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationMember
        fields = ["user_id", "joined_at", "last_read_at"]


class ConversationSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["conversation_id", "members", "unread_count", "last_message", "updated_at"]

    def get_unread_count(self, obj):
        user_id = self.context.get("user_id")
        if not user_id:
            return 0
        member = obj.members.filter(user_id=user_id).first()
        if not member:
            return 0
        if member.last_read_at:
            return obj.messages.filter(
                created_at__gt=member.last_read_at, is_deleted=False
            ).exclude(sender_id=user_id).count()
        return obj.messages.filter(is_deleted=False).exclude(sender_id=user_id).count()

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).last()
        if msg:
            return MessageSerializer(msg).data
        return None
