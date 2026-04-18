"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Check } from "lucide-react";
import { notificationsApi, usersApi } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import type { Notification, User } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  like: "があなたの投稿にいいねしました",
  comment: "があなたの投稿にコメントしました",
  follow: "があなたをフォローしました",
  follow_request: "からフォローリクエストが届きました",
  mention: "があなたをメンションしました",
  story_view: "があなたのストーリーを閲覧しました",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actors, setActors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await notificationsApi.list();
        const notifs: Notification[] = res.data.results ?? res.data ?? [];
        setNotifications(notifs);
        await notificationsApi.markAllRead();

        const actorIds = [...new Set(notifs.map((n) => n.actor_id).filter(Boolean))];
        if (actorIds.length > 0) {
          const uRes = await usersApi.byIds(actorIds);
          const map: Record<string, User> = {};
          for (const u of uRes.data as User[]) map[u.user_id] = u;
          setActors(map);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsApi.delete(notificationId);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
    } catch { /* ignore */ }
  };

  const handleApproveFollowRequest = async (n: Notification) => {
    const actor = actors[n.actor_id];
    if (!actor) return;
    try {
      await usersApi.approveFollowRequest(actor.username);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.notification_id === n.notification_id
            ? { ...notif, type: "follow" as const }
            : notif
        )
      );
    } catch { /* ignore */ }
  };

  const handleRejectFollowRequest = async (n: Notification) => {
    const actor = actors[n.actor_id];
    if (!actor) return;
    try {
      await usersApi.rejectFollowRequest(actor.username);
      await notificationsApi.delete(n.notification_id);
      setNotifications((prev) => prev.filter((notif) => notif.notification_id !== n.notification_id));
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto pt-4 px-4">
      <h1 className="font-semibold text-base mb-4">通知</h1>

      {notifications.length === 0 ? (
        <div className="text-center text-[#8e8e8e] mt-16">
          <p className="font-semibold">通知はありません</p>
          <p className="text-sm mt-1">フォローされたりいいねされると通知が届きます</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const actor = actors[n.actor_id];
            return (
              <div
                key={n.notification_id}
                className={`flex items-center gap-3 py-2 px-2 rounded-lg group ${!n.is_read ? "bg-[#eff7ff]" : ""}`}
              >
                <Link href={`/profile/${actor?.username ?? ""}`}>
                  <Avatar src={actor?.profile_img} username={actor?.username ?? "?"} size={44} />
                </Link>
                <div className="flex-1 text-sm min-w-0">
                  <span className="font-semibold">{actor?.username ?? "ユーザー"}</span>
                  <span>{TYPE_LABEL[n.type] ?? "からの通知"}</span>
                  <span className="text-[#8e8e8e] ml-2 text-xs">{formatTime(n.created_at)}</span>
                </div>

                {/* フォローリクエスト承認/拒否ボタン */}
                {n.type === "follow_request" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApproveFollowRequest(n)}
                      className="bg-[#0095f6] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#1877f2] transition-colors flex items-center gap-1"
                    >
                      <Check size={12} /> 承認
                    </button>
                    <button
                      onClick={() => handleRejectFollowRequest(n)}
                      className="bg-[#efefef] text-[#262626] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#dbdbdb] transition-colors"
                    >
                      拒否
                    </button>
                  </div>
                )}

                {n.type !== "follow_request" && (
                  <button
                    onClick={() => handleDelete(n.notification_id)}
                    className="opacity-0 group-hover:opacity-100 text-[#8e8e8e] hover:text-[#262626] transition-opacity flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
