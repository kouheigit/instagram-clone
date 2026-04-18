"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { usersApi } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { Avatar } from "./Avatar";
import type { User } from "@/lib/types";

export function RightSidebar() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await usersApi.suggestions();
        setSuggestions(res.data ?? []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFollow = async (username: string) => {
    try {
      await usersApi.follow(username);
      setFollowed((prev) => ({ ...prev, [username]: true }));
    } catch {
      showToast("フォローに失敗しました", "error");
    }
  };

  const handleUnfollow = async (username: string) => {
    try {
      await usersApi.unfollow(username);
      setFollowed((prev) => ({ ...prev, [username]: false }));
    } catch {
      showToast("アンフォローに失敗しました", "error");
    }
  };

  if (!me) return null;

  return (
    <div className="w-[320px] flex-shrink-0 pt-8 pl-8 hidden xl:block">
      {/* 現在のユーザー */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/profile/${me.username}`}>
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
            <div className="p-[2px] rounded-full bg-white">
              <Avatar src={me.profile_img} username={me.username} size={44} />
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${me.username}`} className="font-semibold text-sm block truncate">
            {me.username}
          </Link>
          {me.bio && <p className="text-[#8e8e8e] text-sm truncate">{me.bio}</p>}
        </div>
      </div>

      {/* フォロー提案 */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
        </div>
      ) : suggestions.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8e8e8e] text-sm font-semibold">おすすめ</span>
            <Link href="/explore" className="text-xs font-semibold text-[#262626] hover:text-[#8e8e8e]">
              すべて見る
            </Link>
          </div>

          <div className="space-y-3">
            {suggestions.map((user) => (
              <div key={user.user_id} className="flex items-center gap-3">
                <Link href={`/profile/${user.username}`}>
                  <Avatar src={user.profile_img} username={user.username} size={32} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${user.username}`} className="font-semibold text-xs block truncate">
                    {user.username}
                  </Link>
                  <p className="text-[#8e8e8e] text-xs">
                    フォロワー {user.follower_count.toLocaleString()}
                  </p>
                </div>
                {followed[user.username] ? (
                  <button
                    onClick={() => handleUnfollow(user.username)}
                    className="text-xs text-[#8e8e8e] font-semibold hover:text-[#262626]"
                  >
                    フォロー中
                  </button>
                ) : (
                  <button
                    onClick={() => handleFollow(user.username)}
                    className="text-[#0095f6] text-xs font-semibold hover:text-[#1877f2]"
                  >
                    フォローする
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
