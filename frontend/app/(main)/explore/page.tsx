"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { searchApi, feedApi, postsApi, usersApi } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import type { Post, User, UserIndex, HashtagIndex } from "@/lib/types";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserIndex[]>([]);
  const [hashtags, setHashtags] = useState<HashtagIndex[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  const [searching, setSearching] = useState(false);

  // Exploreフィードを初期ロード
  useEffect(() => {
    const load = async () => {
      try {
        let feedPosts: Post[] = [];
        const feedRes = await feedApi.explore();
        feedPosts = feedRes.data.results ?? [];
        if (feedPosts.length === 0) {
          const res = await postsApi.list();
          feedPosts = res.data.results ?? [];
        }
        setExplorePosts(feedPosts);

        const userIds = [...new Set(feedPosts.map((p) => p.user_id))];
        if (userIds.length > 0) {
          const uRes = await usersApi.byIds(userIds);
          const map: Record<string, User> = {};
          for (const u of uRes.data as User[]) map[u.user_id] = u;
          setAuthors(map);
        }
      } catch { /* ignore */ }
    };
    load();
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setUsers([]); setHashtags([]); return; }
    setSearching(true);
    try {
      const res = await searchApi.search(q);
      setUsers(res.data.users ?? []);
      setHashtags(res.data.hashtags ?? []);
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, []);

  const isSearching = query.trim().length > 0;

  return (
    <div className="max-w-[935px] mx-auto pt-4 px-4">
      {/* 検索バー */}
      <div className="relative mb-6 lg:max-w-[360px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e8e]" size={14} />
        <input
          type="text"
          placeholder="検索"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-[#efefef] rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-[#dbdbdb] transition-colors"
        />
      </div>

      {/* 検索結果 */}
      {isSearching ? (
        <div className="space-y-1">
          {searching && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
            </div>
          )}
          {users.map((u) => (
            <Link
              key={u.user_id}
              href={`/profile/${u.username}`}
              className="flex items-center gap-3 py-2 px-1 hover:bg-[#fafafa] rounded-lg"
            >
              <Avatar src={u.profile_img} username={u.username} size={44} />
              <div>
                <p className="font-semibold text-sm flex items-center gap-1">
                  {u.username}
                  {u.is_verified && <span className="text-[#0095f6] text-xs">✓</span>}
                </p>
                <p className="text-[#8e8e8e] text-xs">
                  {u.bio || `フォロワー ${u.follower_count}`}
                </p>
                {u.website && (
                  <p className="text-[#0095f6] text-xs truncate max-w-[200px]">
                    {u.website.replace(/^https?:\/\//, "")}
                  </p>
                )}
              </div>
            </Link>
          ))}
          {hashtags.map((h) => (
            <Link
              key={h.name}
              href={`/hashtag/${h.name}`}
              className="flex items-center gap-3 py-2 px-1 hover:bg-[#fafafa] rounded-lg"
            >
              <div className="w-11 h-11 rounded-full bg-[#efefef] flex items-center justify-center text-lg font-bold">
                #
              </div>
              <div>
                <p className="font-semibold text-sm">#{h.name}</p>
                <p className="text-[#8e8e8e] text-xs">{h.post_count}件の投稿</p>
              </div>
            </Link>
          ))}
          {!searching && users.length === 0 && hashtags.length === 0 && (
            <p className="text-center text-[#8e8e8e] py-8">「{query}」の結果が見つかりません</p>
          )}
        </div>
      ) : (
        /* Exploreグリッド */
        <div className="grid grid-cols-3 gap-1">
          {explorePosts.map((post, i) => (
            <Link
              key={post.post_id}
              href={`/posts/${post.post_id}`}
              className={`aspect-square relative overflow-hidden bg-[#efefef] group ${
                i % 7 === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              {post.media_files[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.media_files[0].media_url}
                  alt={post.caption}
                  className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-semibold flex items-center gap-1.5">
                  <Heart size={18} className="fill-white" /> {post.like_count}
                </span>
                <span className="text-white text-sm font-semibold flex items-center gap-1.5">
                  <MessageCircle size={18} className="fill-white" /> {post.comment_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
