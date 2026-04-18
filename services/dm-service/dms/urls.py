from django.urls import path
from . import views

urlpatterns = [
    path("", views.ConversationListView.as_view(), name="conversation-list"),
    path("start/", views.create_or_get_conversation, name="conversation-start"),
    path("<uuid:conversation_id>/messages/", views.MessageListView.as_view(), name="message-list"),
    path("<uuid:conversation_id>/messages/send/", views.send_message, name="message-send"),
    path("<uuid:conversation_id>/messages/<uuid:message_id>/", views.delete_message, name="message-delete"),
    path("<uuid:conversation_id>/read/", views.mark_read, name="conversation-read"),
]
