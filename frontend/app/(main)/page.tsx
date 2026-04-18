"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { feedApi, postsApi, usersApi } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { StoryBar } from "@/components/StoryBar";
import { RightSidebar } from "@/components/RightSidebar";
import type { Post, User } from "@/lib/types";

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchAuthors = useCallback(async (newPosts: Post[], prev: Record<string, User>) => {
    const newIds = newPosts.map((p) => p.user_id).filter((id) => !prev[id]);
    const uniqueIds = [...new Set(newIds)];
    if (uniqueIds.length === 0) return prev;
    const res = await usersApi.byIds(uniqueIds);
    const next = { ...prev };
    for (const u of res.data as User[]) next[u.user_id] = u;
    return next;
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      let feedPosts: Post[] = [];
      let nextCursor: string | null = null;
      try {
        const feedRes = await feedApi.home();
        feedPosts = feedRes.data.results ?? [];
        nextCursor = feedRes.data.next ?? null;
      } catch { /* ignore */ }

      if (feedPosts.length === 0) {
        const res = await postsApi.list();
        feedPosts = res.data.results ?? [];
        nextCursor = res.data.next ?? null;
      }
      setPosts(feedPosts);
      setCursor(nextCursor);
      setHasMore(nextCursor !== null);

      const userMap = await fetchAuthors(feedPosts, {});
      setAuthors(userMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchAuthors]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const cursorParam = new URL(cursor).searchParams.get("cursor") ?? cursor;
      const res = await postsApi.list(cursorParam);
      const morePosts: Post[] = res.data.results ?? [];
      const nextCursor: string | null = res.data.next ?? null;
      setPosts((prev) => [...prev, ...morePosts]);
      setCursor(nextCursor);
      setHasMore(nextCursor !== null);
      setAuthors((prev) => {
        const next = { ...prev };
        fetchAuthors(morePosts, prev).then((updated) => setAuthors(updated));
        return next;
      });
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, fetchAuthors]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // IntersectionObserver による無限スクロール
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {/* フィードカラム */}
      <div className="w-full max-w-[470px] pt-4">
        <StoryBar />
        <div className="px-4 lg:px-0 pt-4">
          {posts.length === 0 ? (
            <div className="text-center text-[#8e8e8e] mt-20">
              <p className="text-lg font-semibold mb-2">投稿がありません</p>
              <p className="text-sm">誰かをフォローするか、投稿を作成しましょう</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  author={authors[post.user_id] ?? null}
                  onDelete={(id) => setPosts((prev) => prev.filter((p) => p.post_id !== id))}
                />
              ))}
              {/* 無限スクロール sentinel */}
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <p className="text-center text-[#8e8e8e] text-sm py-8">すべての投稿を表示しました</p>
              )}
            </>
          )}
        </div>
      </div>
      {/* 右サイドバー (デスクトップ xl以上) */}
      <RightSidebar />
    </div>
  );
}
