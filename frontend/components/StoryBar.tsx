"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { usersApi, storiesApi, mediaApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { Avatar } from "./Avatar";
import type { Story, User } from "@/lib/types";

interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnviewed: boolean;
}

const PAGE_SIZE = 6;

export function StoryBar() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState<{ group: StoryGroup; idx: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState("");
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!me) return;
    try {
      // フォロー中ユーザー全員を取得
      const followingRes = await usersApi.following(me.username);
      const followingUsers: User[] = followingRes.data ?? [];
      if (followingUsers.length === 0) return;

      const ids = followingUsers.map((u) => u.user_id);

      // ストーリーも取得（ある場合はリング表示）
      let storiesData: Story[] = [];
      try {
        const storiesRes = await storiesApi.byUsers(ids);
        storiesData = storiesRes.data ?? [];
      } catch { /* ignore */ }

      const groupMap: Record<string, Story[]> = {};
      for (const s of storiesData) {
        if (!groupMap[s.user_id]) groupMap[s.user_id] = [];
        groupMap[s.user_id].push(s);
      }

      // フォロー中の全ユーザーをリスト化（ストーリーなしでも表示）
      const ordered: StoryGroup[] = followingUsers.map((u) => ({
        user: u,
        stories: groupMap[u.user_id] ?? [],
        hasUnviewed: (groupMap[u.user_id] ?? []).some((s) => !s.is_viewed),
      }));

      // ストーリーあり（未視聴）→ストーリーあり（視聴済）→ストーリーなし の順にソート
      ordered.sort((a, b) => {
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        if (a.stories.length > 0 && b.stories.length === 0) return -1;
        if (a.stories.length === 0 && b.stories.length > 0) return 1;
        return 0;
      });

      setGroups(ordered);
    } catch { /* ignore */ }
  }, [me]);

  useEffect(() => { load(); }, [load]);

  // ストーリービューワー 自動進行タイマー (5秒)
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const STORY_DURATION = 5000;
  const TICK = 100;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = useCallback(() => {
    clearTimer();
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + (TICK / STORY_DURATION) * 100;
        if (next >= 100) {
          clearTimer();
          return 100;
        }
        return next;
      });
    }, TICK);
  }, []);

  useEffect(() => {
    if (progress >= 100 && viewer) {
      advanceStory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  useEffect(() => {
    if (viewer) {
      startTimer();
    } else {
      clearTimer();
      setProgress(0);
    }
    return clearTimer;
  }, [viewer?.group.user.user_id, viewer?.idx, startTimer]);

  const advanceStory = async () => {
    if (!viewer) return;
    const next = viewer.idx + 1;
    if (next < viewer.group.stories.length) {
      setViewer({ ...viewer, idx: next });
      try { await storiesApi.view(viewer.group.stories[next].story_id); } catch { /* ignore */ }
    } else {
      setViewer(null);
    }
  };

  const openStory = async (group: StoryGroup) => {
    if (group.stories.length === 0) {
      // 自分のストーリーがない場合は作成
      if (group.user.user_id === me?.user_id) {
        setShowCreate(true);
      }
      return;
    }
    setViewer({ group, idx: 0 });
    try { await storiesApi.view(group.stories[0].story_id); } catch { /* ignore */ }
  };

  const nextStory = async () => {
    clearTimer();
    await advanceStory();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setStoryFile(f);
    setStoryPreview(URL.createObjectURL(f));
  };

  const createStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyFile) return;
    setCreating(true);
    try {
      let mediaUrl = "";
      try {
        const formData = new FormData();
        formData.append("file", storyFile);
        formData.append("media_type", storyFile.type.startsWith("video/") ? "video" : "image");
        const res = await mediaApi.upload(formData);
        const raw: string = res.data.url ?? res.data.media_url ?? "";
        mediaUrl = raw.startsWith("/") ? `http://localhost:8888${raw}` : raw;
      } catch {
        mediaUrl = storyPreview;
      }
      const mediaType = storyFile.type.startsWith("video/") ? "video" : "photo";
      await storiesApi.create({ media_url: mediaUrl, media_type: mediaType });
      setShowCreate(false);
      setStoryFile(null);
      setStoryPreview("");
      showToast("ストーリーを投稿しました", "success");
      await load();
    } catch {
      showToast("ストーリーの投稿に失敗しました", "error");
    } finally {
      setCreating(false);
    }
  };

  if (groups.length === 0) return null;

  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const visibleGroups = groups.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      {/* フォロー中プロフィールバー（6件ずつ・矢印ナビ） */}
      <div className="relative mb-4 bg-white py-5 overflow-hidden">
        {/* 前へ矢印 */}
        {page > 0 && (
          <button
            onClick={() => setPage((p) => p - 1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-[#dbdbdb] rounded-full shadow flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
            aria-label="前へ"
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
        )}

        {/* プロフィール一覧 */}
        <div className="flex gap-3 pl-2 pr-9">
          {visibleGroups.map((group) => (
            <div
              key={group.user.user_id}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <Link
                href={`/profile/${group.user.username}`}
                className="relative block"
                aria-label={`${group.user.username}のプロフィールを見る`}
              >
                <div
                  className={`p-[2px] rounded-full ${
                    group.stories.length > 0 && group.hasUnviewed
                      ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]"
                      : group.stories.length > 0
                      ? "bg-[#dbdbdb]"
                      : "bg-transparent"
                  }`}
                >
                  <div className={`rounded-full ${group.stories.length > 0 ? "p-[2px] bg-white" : ""}`}>
                    <Avatar src={group.user.profile_img} username={group.user.username} size={77} />
                  </div>
                </div>
              </Link>
              <Link href={`/profile/${group.user.username}`} className="w-20 truncate text-center text-xs text-[#262626] hover:underline">
                {group.user.username}
              </Link>
            </div>
          ))}
        </div>

        {/* 次へ矢印 */}
        {page < totalPages - 1 && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-[#dbdbdb] rounded-full shadow flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
            aria-label="次へ"
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ストーリー作成モーダル */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#dbdbdb]">
              <button onClick={() => { setShowCreate(false); setStoryFile(null); setStoryPreview(""); }}>
                <X size={20} />
              </button>
              <span className="font-semibold text-sm">ストーリーを追加</span>
              <button
                form="story-form"
                type="submit"
                disabled={creating || !storyFile}
                className="text-[#0095f6] font-semibold text-sm disabled:opacity-40"
              >
                {creating ? "投稿中..." : "シェア"}
              </button>
            </div>
            <form id="story-form" onSubmit={createStory} className="p-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                className="hidden"
                onChange={handleFileSelect}
              />
              {storyPreview ? (
                <div className="relative">
                  {storyFile?.type.startsWith("video/") ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={storyPreview}
                      className="w-full aspect-[9/16] object-cover rounded-lg"
                      controls={false}
                      autoPlay
                      muted
                      loop
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={storyPreview}
                      alt="preview"
                      className="w-full aspect-[9/16] object-cover rounded-lg"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => { setStoryFile(null); setStoryPreview(""); fileInputRef.current && (fileInputRef.current.value = ""); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[9/16] border-2 border-dashed border-[#dbdbdb] rounded-lg flex flex-col items-center justify-center gap-3 text-[#8e8e8e] hover:border-[#a8a8a8] transition-colors"
                >
                  <Plus size={32} />
                  <span className="text-sm">写真・動画を選択</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ストーリービューワー */}
      {viewer && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={(e) => {
            // 左半分タップで前へ、右半分タップで次へ
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            if (e.clientX < rect.width / 2) {
              // 前のストーリーへ
              if (viewer.idx > 0) {
                clearTimer();
                setViewer({ ...viewer, idx: viewer.idx - 1 });
              }
            } else {
              nextStory();
            }
          }}
        >
          {/* プログレスバー */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 pt-3">
            {viewer.group.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{
                    width: i < viewer.idx ? "100%" : i === viewer.idx ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* ヘッダー */}
          <div className="absolute top-6 left-0 right-0 flex items-center gap-3 px-4 pt-2">
            <Avatar src={viewer.group.user.profile_img} username={viewer.group.user.username} size={32} />
            <span className="text-white font-semibold text-sm">{viewer.group.user.username}</span>
            <button
              className="ml-auto text-white"
              onClick={(e) => { e.stopPropagation(); setViewer(null); }}
            >
              <X size={24} />
            </button>
          </div>

          {/* ストーリーメディア */}
          {viewer.group.stories[viewer.idx]?.media_type === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={viewer.group.stories[viewer.idx]?.media_url}
              src={viewer.group.stories[viewer.idx]?.media_url}
              className="max-h-screen max-w-[500px] w-full object-contain"
              autoPlay
              muted
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewer.group.stories[viewer.idx]?.media_url}
              alt="story"
              className="max-h-screen max-w-[500px] w-full object-contain"
              loading="eager"
            />
          )}
        </div>
      )}
    </>
  );
}
