"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { postsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { Avatar } from "./Avatar";
import { PostMenuModal, type PostMenuItem } from "./PostMenuModal";
import { PostDetailModal } from "./PostDetailModal";
import type { Post, User } from "@/lib/types";

interface Props {
  post: Post;
  author: User | null;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, author, onDelete }: Props) {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [saved, setSaved] = useState(post.is_saved);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  // メニューモーダル
  const [menuOpen, setMenuOpen] = useState(false);

  // 削除確認ダイアログ
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const isOwn = me?.user_id === post.user_id;

  // 不要になった menuRef の useEffect を削除（PostMenuModal が管理）

  // ダブルタップでいいね
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastTapRef = useRef(0);

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // ダブルタップ
      if (!liked) {
        toggleLike();
      }
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
    lastTapRef.current = now;
  };

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

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await postsApi.delete(post.post_id);
      setConfirmOpen(false);
      showToast("投稿を削除しました", "success");
      onDelete?.(post.post_id);
    } catch {
      setDeleteError("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  const media = post.media_files[imgIdx];
  const timeAgo = formatTimeAgo(post.created_at);
  const [imgError, setImgError] = useState(false);

  // メニュー項目の構築
  const menuItems: PostMenuItem[] = isOwn
    ? [
        {
          label: "削除",
          variant: "danger",
          onClick: () => { setMenuOpen(false); setConfirmOpen(true); },
        },
        {
          label: "編集",
          variant: "bold",
          onClick: () => { showToast("編集機能は準備中です", "success"); setMenuOpen(false); },
        },
        {
          label: "いいね数を非表示",
          onClick: () => { showToast("この機能は準備中です", "success"); setMenuOpen(false); },
        },
        {
          label: "コメントをオフにする",
          onClick: () => { showToast("この機能は準備中です", "success"); setMenuOpen(false); },
        },
        {
          label: "投稿へ移動",
          onClick: () => { setMenuOpen(false); router.push(`/posts/${post.post_id}`); },
        },
        {
          label: "シェア先…",
          onClick: () => { showToast("この機能は準備中です", "success"); setMenuOpen(false); },
        },
        {
          label: "リンクをコピー",
          onClick: () => {
            navigator.clipboard.writeText(`${window.location.origin}/posts/${post.post_id}`);
            showToast("リンクをコピーしました", "success");
            setMenuOpen(false);
          },
        },
        {
          label: "埋め込み",
          onClick: () => { showToast("この機能は準備中です", "success"); setMenuOpen(false); },
        },
        {
          label: "このアカウントについて",
          onClick: () => { setMenuOpen(false); router.push(`/profile/${author?.username ?? ""}`); },
        },
        {
          label: "キャンセル",
          variant: "cancel",
          hasDividerAbove: true,
          onClick: () => setMenuOpen(false),
        },
      ]
    : [
        {
          label: "報告する",
          variant: "danger",
          onClick: () => { showToast("報告を受け付けました", "success"); setMenuOpen(false); },
        },
        {
          label: "シェア先…",
          onClick: () => { showToast("この機能は準備中です", "success"); setMenuOpen(false); },
        },
        {
          label: "リンクをコピー",
          onClick: () => {
            navigator.clipboard.writeText(`${window.location.origin}/posts/${post.post_id}`);
            showToast("リンクをコピーしました", "success");
            setMenuOpen(false);
          },
        },
        {
          label: "埋め込み",
          onClick: () => { showToast("この機能は準備中です", "success"); setMenuOpen(false); },
        },
        {
          label: "このアカウントについて",
          onClick: () => { setMenuOpen(false); router.push(`/profile/${author?.username ?? ""}`); },
        },
        {
          label: "キャンセル",
          variant: "cancel",
          hasDividerAbove: true,
          onClick: () => setMenuOpen(false),
        },
      ];

  return (
    <>
      {/* Instagram風メニューモーダル */}
      <PostMenuModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />

      <article className="bg-white border border-[#dbdbdb] rounded-sm mb-6 max-w-[470px] mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={`/profile/${author?.username ?? ""}`} className="flex items-center gap-3">
            <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
              <div className="p-[2px] rounded-full bg-white">
                <Avatar src={author?.profile_img} username={author?.username} size={32} />
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm leading-4">{author?.username ?? "unknown"}</p>
              {post.location && <p className="text-xs text-[#8e8e8e]">{post.location}</p>}
            </div>
          </Link>

          {/* 3点メニューボタン */}
          <button
            onClick={() => setMenuOpen(true)}
            className="text-[#262626] p-1"
            aria-label="メニューを開く"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* 画像 */}
        <div className="relative aspect-square bg-black" onClick={handleImageTap}>
          {media && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.media_url}
              alt={post.caption}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#8e8e8e]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <span className="text-xs">画像を表示できません</span>
            </div>
          ) : null}
          {/* ダブルタップいいねアニメーション */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart
                size={80}
                className="fill-white text-white opacity-90 animate-ping"
                strokeWidth={0}
              />
            </div>
          )}
          {post.media_files.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
              {post.media_files.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? "bg-[#0095f6]" : "bg-white/60"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* アクション */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button onClick={toggleLike} className="transition-transform active:scale-125">
                <Heart
                  size={24}
                  strokeWidth={1.5}
                  className={liked ? "fill-[#ed4956] stroke-[#ed4956]" : ""}
                />
              </button>
              <button
                onClick={() => setShowDetailModal(true)}
                className="transition-transform duration-150 hover:scale-110"
                aria-label="コメントを見る"
              >
                <MessageCircle size={24} strokeWidth={1.5} />
              </button>
              <button>
                <Image src="/plane_icon.png" alt="送信" width={24} height={24} />
              </button>
            </div>
            <button onClick={toggleSave}>
              <Bookmark
                size={24}
                strokeWidth={1.5}
                className={saved ? "fill-black" : ""}
              />
            </button>
          </div>

          {likeCount > 0 && (
            <p className="font-semibold text-sm mb-1">{likeCount.toLocaleString()}件のいいね</p>
          )}

          {post.caption && (
            <p className="text-sm leading-5">
              <Link href={`/profile/${author?.username ?? ""}`} className="font-semibold mr-2">
                {author?.username}
              </Link>
              <CaptionWithHashtags text={post.caption} />
            </p>
          )}

          {post.comment_count > 0 && (
            <button
              className="text-[#8e8e8e] text-sm mt-1"
              onClick={() => setShowDetailModal(true)}
            >
              コメント{post.comment_count}件を表示
            </button>
          )}

          <p className="text-[#8e8e8e] text-[10px] uppercase mt-1">{timeAgo}</p>
        </div>

      </article>

      {/* 投稿詳細モーダル（コメント） */}
      {showDetailModal && (
        <PostDetailModal
          postId={post.post_id}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* 削除確認ダイアログ */}
      {confirmOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div className="bg-white rounded-xl w-full max-w-[400px] overflow-hidden shadow-xl">
            {/* タイトル */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-[#dbdbdb]">
              <p className="font-semibold text-base text-[#262626]">投稿を削除しますか？</p>
              <p className="text-sm text-[#8e8e8e] mt-1">削除すると元に戻せません</p>
            </div>

            {deleteError && (
              <p className="text-[#ed4956] text-xs text-center pt-3 px-4">{deleteError}</p>
            )}

            {/* ボタン */}
            <button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="w-full py-3.5 text-sm font-semibold text-[#ed4956] hover:bg-[#fafafa] transition-colors border-b border-[#dbdbdb] disabled:opacity-50"
            >
              {deleting ? "削除中..." : "削除"}
            </button>
            <button
              onClick={() => { setConfirmOpen(false); setDeleteError(""); }}
              disabled={deleting}
              className="w-full py-3.5 text-sm text-[#262626] hover:bg-[#fafafa] transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

    </>
  );
}

function CaptionWithHashtags({ text }: { text: string }) {
  const parts = text.split(/(#\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <Link
            key={i}
            href={`/hashtag/${part.slice(1)}`}
            className="text-[#0095f6] font-semibold"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}
