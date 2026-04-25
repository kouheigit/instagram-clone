"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Volume2, VolumeX } from "lucide-react";
import { postsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PostDetailModal } from "@/components/PostDetailModal";
import type { Post, User } from "@/lib/types";

function formatCaption(text: string) {
  return text.split(/(#\w+)/g).map((part, i) =>
    part.startsWith("#") ? (
      <Link key={i} href={`/hashtag/${part.slice(1)}`} className="font-semibold">
        {part}
      </Link>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface ReelCardProps {
  post: Post;
  author: User | null;
  active: boolean;
}

function isVideoPost(post: Post): boolean {
  const media = post.media_files[0];
  if (!media) return false;
  return (
    post.media_type === "video" ||
    Boolean(media.thumbnail_url) ||
    media.duration !== null ||
    /\.(mp4|mov|m4v|webm|avi)$/i.test(media.media_url)
  );
}

function ReelCard({ post, author, active }: ReelCardProps) {
  const { user: me } = useAuth();
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [saved, setSaved] = useState(post.is_saved);
  const [muted, setMuted] = useState(true);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const media = post.media_files[0];
  const isVideo = isVideoPost(post);

  useEffect(() => {
    if (!videoRef.current) return;
    if (active) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [active]);

  const toggleLike = async () => {
    try {
      if (liked) {
        await postsApi.unlike(post.post_id);
        setLikeCount((c) => c - 1);
      } else {
        await postsApi.like(post.post_id);
        setLikeCount((c) => c + 1);
      }
      setLiked(!liked);
    } catch { /* ignore */ }
  };

  const toggleSave = async () => {
    try {
      if (saved) {
        await postsApi.unsave(post.post_id);
      } else {
        await postsApi.save(post.post_id);
      }
      setSaved(!saved);
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="relative w-full h-[calc(100dvh-0px)] lg:h-screen bg-black flex items-center justify-center snap-start snap-always overflow-hidden">
        {/* メディア */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={media.media_url}
            loop
            muted={muted}
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.media_url}
            alt={post.caption}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[#1a1a1a]" />
        )}

        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* 右サイドアクション */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
          {/* いいね */}
          <button type="button" onClick={toggleLike} className="flex flex-col items-center gap-1">
            <Heart
              size={28}
              strokeWidth={1.75}
              className={liked ? "fill-[#ed4956] stroke-[#ed4956]" : "stroke-white"}
            />
            <span className="text-white text-xs font-semibold drop-shadow">{likeCount}</span>
          </button>

          {/* コメント */}
          <button type="button" onClick={() => setShowDetail(true)} className="flex flex-col items-center gap-1">
            <MessageCircle size={28} strokeWidth={1.75} className="stroke-white" />
            <span className="text-white text-xs font-semibold drop-shadow">{post.comment_count}</span>
          </button>

          {/* 保存 */}
          <button type="button" onClick={toggleSave} className="flex flex-col items-center gap-1">
            <Bookmark
              size={28}
              strokeWidth={1.75}
              className={saved ? "fill-white stroke-white" : "stroke-white"}
            />
          </button>

          {/* その他 */}
          <button type="button" onClick={() => setShowDetail(true)} className="flex flex-col items-center gap-1">
            <MoreHorizontal size={28} strokeWidth={1.75} className="stroke-white" />
          </button>

          {/* ミュート（動画のみ） */}
          {isVideo && (
            <button type="button" onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1">
              {muted
                ? <VolumeX size={24} strokeWidth={1.75} className="stroke-white" />
                : <Volume2 size={24} strokeWidth={1.75} className="stroke-white" />
              }
            </button>
          )}

          {/* アバター */}
          {author && (
            <Link href={`/profile/${author.username}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                <Avatar src={author.profile_img} username={author.username} size={40} />
              </div>
            </Link>
          )}
        </div>

        {/* 下部ユーザー情報・キャプション */}
        <div className="absolute bottom-6 left-3 right-16 z-10">
          {author && (
            <Link href={`/profile/${author.username}`} className="flex items-center gap-2 mb-2">
              <span className="text-white font-semibold text-sm drop-shadow">{author.username}</span>
              {author.is_verified && (
                <span className="text-[#0095f6] text-xs font-bold">✓</span>
              )}
            </Link>
          )}
          {post.caption && (
            <p
              className="text-white text-sm leading-snug drop-shadow cursor-pointer"
              onClick={() => setCaptionExpanded((v) => !v)}
            >
              {captionExpanded || post.caption.length <= 80
                ? formatCaption(post.caption)
                : <>{formatCaption(post.caption.slice(0, 80))}<span className="text-white/70"> ...続きを読む</span></>
              }
            </p>
          )}
        </div>
      </div>

      {showDetail && (
        <PostDetailModal postId={post.post_id} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

export default function ReelsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await postsApi.list();
        const all: Post[] = res.data.results ?? [];
        setPosts(all);

        const ids = [...new Set(all.map((p) => p.user_id))];
        if (ids.length > 0) {
          const uRes = await usersApi.byIds(ids);
          const map: Record<string, User> = {};
          for (const u of uRes.data as User[]) map[u.user_id] = u;
          setAuthors(map);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // スクロールで activeIndex を更新
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const idx = Math.round(scrollTop / height);
    setActiveIndex(idx);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black gap-4">
        <p className="text-white text-lg font-semibold">リールがありません</p>
        <p className="text-white/60 text-sm">動画を投稿してリールを作成しましょう</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {posts.map((post, i) => (
        <ReelCard
          key={post.post_id}
          post={post}
          author={authors[post.user_id] ?? null}
          active={i === activeIndex}
        />
      ))}
    </div>
  );
}
