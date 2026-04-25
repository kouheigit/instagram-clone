"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Smile,
} from "lucide-react";
import { postsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { Avatar } from "@/components/Avatar";
import { PostMenuModal, type PostMenuItem } from "@/components/PostMenuModal";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { Post, User, Comment } from "@/lib/types";

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

interface Props {
  postId: string;
  onClose: () => void;
}

function isVideoMedia(media: Post["media_files"][number] | undefined, postType: Post["media_type"]): boolean {
  if (!media) return false;
  return (
    postType === "video" ||
    Boolean(media.thumbnail_url) ||
    media.duration !== null ||
    /\.(mp4|mov|m4v|webm|avi)$/i.test(media.media_url)
  );
}

export function PostDetailModal({ postId, onClose }: Props) {
  const router = useRouter();
  const { user: me } = useAuth();
  const { showToast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, User>>({});
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ commentId: string; parentId?: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);

  const collectUserIds = (commentList: Comment[]): string[] => {
    const ids: string[] = [];
    for (const c of commentList) {
      ids.push(c.user_id);
      for (const r of c.replies ?? []) ids.push(r.user_id);
    }
    return ids;
  };

  useEffect(() => {
    setLoading(true);
    setPost(null);
    setComments([]);
    setImgIdx(0);
    const load = async () => {
      try {
        const [postRes, commentsRes] = await Promise.all([
          postsApi.get(postId),
          postsApi.comments(postId),
        ]);
        const p: Post = postRes.data;
        setPost(p);
        setLiked(p.is_liked);
        setLikeCount(p.like_count);
        setSaved(p.is_saved);

        const commentList: Comment[] = commentsRes.data.results ?? commentsRes.data ?? [];
        setComments(commentList);

        const authorIds = [p.user_id, ...collectUserIds(commentList)];
        const uniqueIds = [...new Set(authorIds)];
        const usersRes = await usersApi.byIds(uniqueIds);
        const map: Record<string, User> = {};
        for (const u of usersRes.data as User[]) map[u.user_id] = u;
        setAuthor(map[p.user_id] ?? null);
        setCommentAuthors(map);
      } catch {
        showToast("投稿の読み込みに失敗しました", "error");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Escキーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // スクロールロック
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const toggleLike = async () => {
    if (!post) return;
    try {
      if (liked) { await postsApi.unlike(post.post_id); setLikeCount((c) => c - 1); }
      else { await postsApi.like(post.post_id); setLikeCount((c) => c + 1); }
      setLiked(!liked);
    } catch { showToast("いいねに失敗しました", "error"); }
  };

  const toggleSave = async () => {
    if (!post) return;
    try {
      if (saved) await postsApi.unsave(post.post_id);
      else await postsApi.save(post.post_id);
      setSaved(!saved);
    } catch { showToast("保存に失敗しました", "error"); }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentText.trim()) return;
    try {
      const res = await postsApi.addComment(post.post_id, commentText, replyTo?.commentId);
      const newComment: Comment = res.data;
      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.comment_id === replyTo.commentId
              ? { ...c, replies: [...(c.replies ?? []), newComment] }
              : c
          )
        );
      } else {
        setComments((prev) => [...prev, newComment]);
      }
      if (me) setCommentAuthors((prev) => ({ ...prev, [me.user_id]: me }));
      setCommentText("");
      setReplyTo(null);
    } catch { showToast("コメントの投稿に失敗しました", "error"); }
  };

  const handleReplyClick = (comment: Comment, authorUser: User | undefined) => {
    setReplyTo({ commentId: comment.comment_id, username: authorUser?.username ?? "ユーザー" });
    setCommentText(`@${authorUser?.username ?? "ユーザー"} `);
    commentInputRef.current?.focus();
  };

  const cancelReply = () => { setReplyTo(null); setCommentText(""); };

  const isOwn = me?.user_id === post?.user_id;

  const handleDeletePost = async () => {
    if (!post) return;
    try {
      await postsApi.delete(post.post_id);
      showToast("投稿を削除しました", "success");
      onClose();
      router.push("/");
    } catch { showToast("削除に失敗しました", "error"); }
  };

  const handleDeleteComment = async () => {
    if (!post || !commentToDelete) return;
    try {
      await postsApi.deleteComment(post.post_id, commentToDelete.commentId);
      if (commentToDelete.parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.comment_id === commentToDelete.parentId
              ? { ...c, replies: (c.replies ?? []).filter((r) => r.comment_id !== commentToDelete.commentId) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.comment_id !== commentToDelete.commentId));
      }
      showToast("コメントを削除しました", "success");
    } catch {
      showToast("削除に失敗しました", "error");
    } finally {
      setCommentToDelete(null);
    }
  };

  const commentDeleteMenuItems: PostMenuItem[] = [
    { label: "削除", variant: "danger", onClick: handleDeleteComment },
    { label: "キャンセル", variant: "cancel", hasDividerAbove: true, onClick: () => setCommentToDelete(null) },
  ];

  const menuItems: PostMenuItem[] = post
    ? isOwn
      ? [
          { label: "削除", variant: "danger", onClick: () => { setShowMenu(false); if (confirm("この投稿を削除しますか？")) handleDeletePost(); } },
          { label: "編集", variant: "bold", onClick: () => { showToast("編集機能は準備中です", "success"); setShowMenu(false); } },
          { label: "いいね数を非表示", onClick: () => { showToast("この機能は準備中です", "success"); setShowMenu(false); } },
          { label: "コメントをオフにする", onClick: () => { showToast("この機能は準備中です", "success"); setShowMenu(false); } },
          { label: "リンクをコピー", onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/posts/${post.post_id}`); showToast("リンクをコピーしました", "success"); setShowMenu(false); } },
          { label: "キャンセル", variant: "cancel", hasDividerAbove: true, onClick: () => setShowMenu(false) },
        ]
      : [
          { label: "報告する", variant: "danger", onClick: () => { showToast("報告を受け付けました", "success"); setShowMenu(false); } },
          { label: "リンクをコピー", onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/posts/${post.post_id}`); showToast("リンクをコピーしました", "success"); setShowMenu(false); } },
          { label: "このアカウントについて", onClick: () => { setShowMenu(false); router.push(`/profile/${author?.username ?? ""}`); } },
          { label: "キャンセル", variant: "cancel", hasDividerAbove: true, onClick: () => setShowMenu(false) },
        ]
    : [];

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !post) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(diff) < 50) return;
    if (diff < 0 && imgIdx < post.media_files.length - 1) setImgIdx((i) => i + 1);
    else if (diff > 0 && imgIdx > 0) setImgIdx((i) => i - 1);
  };

  const media = post?.media_files[imgIdx];
  const mediaIsVideo = isVideoMedia(media, post?.media_type ?? "photo");

  return (
    <>
      <PostMenuModal isOpen={showMenu} onClose={() => setShowMenu(false)} items={menuItems} />
      <PostMenuModal isOpen={!!commentToDelete} onClose={() => setCommentToDelete(null)} items={commentDeleteMenuItems} />

      {/* 半透明オーバーレイ（画面全体を覆う） */}
      <div
        className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors z-10"
          aria-label="閉じる"
        >
          <X size={28} strokeWidth={1.5} />
        </button>

        {/* 戻るボタン */}
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-white/70 transition-colors z-10"
          onClick={onClose}
          aria-label="戻る"
        >
          <ChevronLeft size={40} strokeWidth={1.5} />
        </button>

        {/* モーダル本体（固定サイズ・本家と同仕様） */}
        {loading ? (
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : post ? (
          <div
            className="relative flex bg-white overflow-hidden"
            style={{ width: "min(1300px, 95vw)", height: "min(860px, 92vh)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 左: 画像（固定・object-cover） */}
            <div
              className="relative flex-1 overflow-hidden bg-black"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {media && mediaIsVideo ? (
                <VideoPlayer
                  src={media.media_url}
                  poster={media.thumbnail_url ?? undefined}
                  className="w-full h-full"
                />
              ) : media ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.media_url}
                  alt={post.caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : null}
              {post.media_files.length > 1 && (
                <>
                  {imgIdx > 0 && (
                    <button onClick={() => setImgIdx((i) => i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow">
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  {imgIdx < post.media_files.length - 1 && (
                    <button onClick={() => setImgIdx((i) => i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow">
                      <ChevronRight size={18} />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {post.media_files.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? "bg-[#0095f6]" : "bg-white/50"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 右: 情報パネル（固定幅340px） */}
            <div className="flex flex-col w-[340px] flex-shrink-0 border-l border-[#dbdbdb]">
              {/* ヘッダー */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#dbdbdb] flex-shrink-0">
                <Link href={`/profile/${author?.username ?? ""}`} className="flex items-center gap-3" onClick={onClose}>
                  <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                    <div className="p-[2px] rounded-full bg-white">
                      <Avatar src={author?.profile_img} username={author?.username} size={32} />
                    </div>
                  </div>
                  <p className="font-semibold text-sm leading-tight">{author?.username}</p>
                </Link>
                <button onClick={() => setShowMenu(true)} className="text-[#262626] hover:text-[#8e8e8e] transition-colors" aria-label="メニューを開く">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {/* コメントエリア */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {post.caption && (
                  <div className="flex gap-3">
                    <Link href={`/profile/${author?.username ?? ""}`} className="flex-shrink-0 mt-0.5" onClick={onClose}>
                      <Avatar src={author?.profile_img} username={author?.username} size={32} />
                    </Link>
                    <div className="text-sm flex-1 min-w-0">
                      <span>
                        <Link href={`/profile/${author?.username ?? ""}`} className="font-semibold mr-1.5" onClick={onClose}>{author?.username}</Link>
                        <span className="whitespace-pre-wrap">{post.caption}</span>
                      </span>
                      <p className="text-[#8e8e8e] text-xs mt-1">{formatTimeAgo(post.created_at)}</p>
                    </div>
                  </div>
                )}

                {comments.length === 0 && !post.caption && (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <p className="font-bold text-xl mb-2">コメントはまだありません。</p>
                    <p className="text-sm text-[#8e8e8e]">コメントを追加しよう。</p>
                  </div>
                )}

                {comments.map((c) => {
                  const cAuthor = commentAuthors[c.user_id];
                  const isOwnComment = !!me && !!c.user_id && me.user_id === c.user_id;
                  return (
                    <div key={c.comment_id}>
                      <div
                        className="flex gap-3 items-start comment-row"
                        onMouseEnter={(e) => {
                          const btn = e.currentTarget.querySelector<HTMLElement>(".comment-menu-btn");
                          if (btn) btn.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          const btn = e.currentTarget.querySelector<HTMLElement>(".comment-menu-btn");
                          if (btn) btn.style.opacity = "0";
                        }}
                      >
                        <Link href={`/profile/${cAuthor?.username ?? ""}`} className="flex-shrink-0 mt-0.5" onClick={onClose}>
                          <Avatar src={cAuthor?.profile_img} username={cAuthor?.username} size={32} />
                        </Link>
                        <div className="text-sm flex-1 min-w-0">
                          <span>
                            <Link href={`/profile/${cAuthor?.username ?? ""}`} className="font-semibold mr-1.5" onClick={onClose}>{cAuthor?.username ?? "ユーザー"}</Link>
                            <span className="whitespace-pre-wrap">{c.content}</span>
                          </span>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[#8e8e8e] text-xs">{formatTimeAgo(c.created_at)}</p>
                            <button onClick={() => handleReplyClick(c, cAuthor)} className="text-[#8e8e8e] text-xs font-semibold hover:text-[#262626]">返信する</button>
                            {c.like_count > 0 && <span className="text-[#8e8e8e] text-xs">{c.like_count}件のいいね</span>}
                          </div>
                        </div>
                        {isOwnComment ? (
                          <button
                            onClick={() => setCommentToDelete({ commentId: c.comment_id })}
                            className="comment-menu-btn flex-shrink-0 text-[#8e8e8e] hover:text-[#262626] mt-1"
                            style={{ opacity: 0, transition: "opacity 0.15s" }}
                            aria-label="コメントメニュー"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        ) : (
                          <div className="w-4 flex-shrink-0" />
                        )}
                      </div>
                      {(c.replies ?? []).length > 0 && (
                        <div className="ml-11 mt-2 space-y-3">
                          {(c.replies ?? []).map((reply) => {
                            const rAuthor = commentAuthors[reply.user_id];
                            const isOwnReply = !!me && !!reply.user_id && me.user_id === reply.user_id;
                            return (
                              <div
                                key={reply.comment_id}
                                className="flex gap-2 items-start"
                                onMouseEnter={(e) => {
                                  const btn = e.currentTarget.querySelector<HTMLElement>(".comment-menu-btn");
                                  if (btn) btn.style.opacity = "1";
                                }}
                                onMouseLeave={(e) => {
                                  const btn = e.currentTarget.querySelector<HTMLElement>(".comment-menu-btn");
                                  if (btn) btn.style.opacity = "0";
                                }}
                              >
                                <CornerDownRight size={14} className="text-[#8e8e8e] mt-1.5 flex-shrink-0" />
                                <Link href={`/profile/${rAuthor?.username ?? ""}`} className="flex-shrink-0" onClick={onClose}>
                                  <Avatar src={rAuthor?.profile_img} username={rAuthor?.username} size={24} />
                                </Link>
                                <div className="text-sm flex-1 min-w-0">
                                  <span>
                                    <Link href={`/profile/${rAuthor?.username ?? ""}`} className="font-semibold mr-1.5 text-xs" onClick={onClose}>{rAuthor?.username ?? "ユーザー"}</Link>
                                    <span className="whitespace-pre-wrap text-xs">{reply.content}</span>
                                  </span>
                                  <p className="text-[#8e8e8e] text-[10px] mt-0.5">{formatTimeAgo(reply.created_at)}</p>
                                </div>
                                {isOwnReply ? (
                                  <button
                                    onClick={() => setCommentToDelete({ commentId: reply.comment_id, parentId: c.comment_id })}
                                    className="comment-menu-btn flex-shrink-0 text-[#8e8e8e] hover:text-[#262626]"
                                    style={{ opacity: 0, transition: "opacity 0.15s" }}
                                    aria-label="返信メニュー"
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                ) : (
                                  <div className="w-3.5 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* アクションバー */}
              <div className="border-t border-[#dbdbdb] flex-shrink-0">
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <div className="flex items-center gap-4">
                    <button onClick={toggleLike} className="transition-transform active:scale-125" aria-label="いいね">
                      <Heart size={24} strokeWidth={1.5} className={liked ? "fill-[#ed4956] stroke-[#ed4956]" : "stroke-[#262626]"} />
                    </button>
                    <button aria-label="コメント" onClick={() => commentInputRef.current?.focus()}>
                      <MessageCircle size={24} strokeWidth={1.5} className="stroke-[#262626]" />
                    </button>
                    <button aria-label="シェア">
                      <Send size={24} strokeWidth={1.5} className="stroke-[#262626]" />
                    </button>
                  </div>
                  <button onClick={toggleSave} aria-label="保存">
                    <Bookmark size={24} strokeWidth={1.5} className={saved ? "fill-[#262626] stroke-[#262626]" : "stroke-[#262626]"} />
                  </button>
                </div>
                <div className="px-4 pb-1">
                  {likeCount > 0 ? (
                    <p className="font-semibold text-sm">{likeCount.toLocaleString()}件のいいね</p>
                  ) : (
                    <p className="text-sm"><span className="font-semibold">いいね！</span>した人はまだいません</p>
                  )}
                  <p className="text-[#8e8e8e] text-[10px] uppercase mt-0.5">{formatTimeAgo(post.created_at)}</p>
                </div>
                <form onSubmit={submitComment} className="border-t border-[#dbdbdb] px-4 py-2">
                  {replyTo && (
                    <div className="flex items-center justify-between mb-1 text-xs text-[#8e8e8e]">
                      <span>@{replyTo.username} に返信中</span>
                      <button type="button" onClick={cancelReply} className="font-semibold hover:text-[#262626]">キャンセル</button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-[#262626]"><Smile size={22} strokeWidth={1.5} /></button>
                    <input
                      ref={commentInputRef}
                      type="text"
                      placeholder={replyTo ? `@${replyTo.username} に返信...` : "コメントを追加..."}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 text-sm outline-none placeholder:text-[#8e8e8e]"
                    />
                    <button type="submit" disabled={!commentText.trim()} className="text-[#0095f6] font-semibold text-sm disabled:opacity-40 transition-opacity">投稿する</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
