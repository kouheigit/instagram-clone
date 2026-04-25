"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  Lock,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PostDetailModal } from "@/components/PostDetailModal";
import { postsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Post, User } from "@/lib/types";

type ListModal = "followers" | "following" | null;
type SelectedPost = string | null;
type ProfileTab = "posts" | "videos" | "saved" | "tagged";

function formatCount(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function ThreadsBadgeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
    >
      <path
        d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.324 83.0954 59.0076 96.9879 60.0361 116.292C60.5584 126.084 65.4326 134.508 73.7577 140.011C80.7953 144.663 89.8601 146.938 99.2814 146.423C111.723 145.74 121.489 140.987 128.301 132.296C133.47 125.696 136.74 117.143 138.181 106.366C144.096 109.935 148.478 114.631 150.897 120.274C155.008 129.871 155.247 145.651 142.37 158.517C131.088 169.791 117.528 174.669 97.0749 174.819C74.3884 174.65 57.2339 167.375 46.2029 153.189C35.8723 139.912 30.5301 120.73 30.3309 96C30.5301 71.27 35.8723 52.0881 46.2029 38.8108C57.2339 24.6248 74.3879 17.3493 97.0744 17.1805C119.922 17.3504 137.372 24.661 148.73 38.9207C154.302 45.9147 158.502 54.7121 161.271 64.9599L177.412 60.6548C174.055 48.0478 168.771 37.1855 161.584 28.1603C147.017 9.86801 125.723 0.495544 97.134 0.294434H97.0153C68.4853 0.495544 47.4268 9.90299 33.5711 28.2571C21.2419 44.5883 14.8821 67.3141 14.6719 95.9335L14.6714 96L14.6719 96.0665C14.8821 124.686 21.2419 147.412 33.5711 163.743C47.4268 182.097 68.4853 191.505 97.0153 191.706H97.134C122.503 191.527 140.385 184.885 155.113 170.16C174.378 150.903 173.797 126.769 167.448 111.954C162.893 101.327 154.214 92.699 141.537 88.9883ZM100.38 129.507C89.959 130.094 79.1329 125.417 78.599 115.811C78.2029 108.702 83.6409 100.769 101.039 99.7673C103.031 99.6527 104.985 99.5969 106.904 99.5969C113.219 99.5969 119.128 100.211 124.5 101.388C122.495 126.423 110.733 128.935 100.38 129.507Z"
        fill="#262626"
      />
    </svg>
  );
}

function ProfileAvatar({ user }: { user: User }) {
  return (
    <div className="relative flex-shrink-0 md:-translate-x-[24px]">
      <div className="absolute left-[18px] top-[-16px] hidden rounded-[18px] bg-white px-[16px] py-[10px] text-[14px] font-normal leading-none text-[#737373] shadow-[0_6px_18px_rgba(0,0,0,0.14)] md:block">
        ノート...
        <div className="absolute bottom-[-5px] left-[26px] h-[10px] w-[10px] rotate-45 rounded-[2px] bg-white" />
      </div>
      <div className="h-[77px] w-[77px] rounded-full border border-[#dbdbdb] p-[2px] md:h-[160px] md:w-[160px]">
        {user.profile_img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.profile_img}
            alt={user.username}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-[32px] font-semibold text-white md:text-[56px]">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCircleIcon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto mb-4 flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-[#262626] ${className}`}
    >
      {children}
    </div>
  );
}

function GridTabIcon({ active }: { active: boolean }) {
  const color = active ? "#000000" : "#8e8e8e";

  return (
    <svg
      aria-hidden="true"
      className="h-[24px] w-[24px] md:h-[26px] md:w-[26px]"
      viewBox="0 0 12 12"
      fill="none"
    >
      <rect
        x="0.75"
        y="0.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="4.75"
        y="0.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="8.75"
        y="0.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="0.75"
        y="4.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="4.75"
        y="4.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="8.75"
        y="4.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="0.75"
        y="8.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="4.75"
        y="8.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="8.75"
        y="8.75"
        width="2.5"
        height="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ReelsTabIcon({ active }: { active: boolean }) {
  const color = active ? "#000000" : "#8e8e8e";

  return (
    <svg
      aria-hidden="true"
      className="h-[24px] w-[24px] md:h-[26px] md:w-[26px]"
      viewBox="0 0 12 12"
      fill="none"
    >
      <rect
        x="1"
        y="1"
        width="10"
        height="10"
        rx="2"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M4.7 1.3 6.8 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7.4 1.3 9.5 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M5 5.1v2.6l2.3-1.3L5 5.1Z" fill={color} />
    </svg>
  );
}

function SavedTabIcon({ active }: { active: boolean }) {
  const color = active ? "#000000" : "#8e8e8e";

  return (
    <svg
      aria-hidden="true"
      className="h-[24px] w-[24px] md:h-[26px] md:w-[26px]"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M3 1.25h6c.41 0 .75.34.75.75V10.4L6 8.15 2.25 10.4V2c0-.41.34-.75.75-.75Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TaggedTabIcon({ active }: { active: boolean }) {
  const color = active ? "#000000" : "#8e8e8e";

  return (
    <svg
      aria-hidden="true"
      className="h-[24px] w-[24px] md:h-[26px] md:w-[26px]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect
        x="4.75"
        y="3.75"
        width="14.5"
        height="16.5"
        rx="2.25"
        stroke={color}
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth="2" />
      <path
        d="M7.7 18.2c.8-2.2 2.3-3.3 4.3-3.3s3.5 1.1 4.3 3.3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MultiPostBadge() {
  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M7 3.75A3.25 3.25 0 0 1 10.25.5h8.5A3.25 3.25 0 0 1 22 3.75v8.5A3.25 3.25 0 0 1 18.75 15.5h-8.5A3.25 3.25 0 0 1 7 12.25v-8.5Z"
        fill="white"
      />
      <path
        d="M2 8.75A3.25 3.25 0 0 1 5.25 5.5H6v6.75A4.75 4.75 0 0 0 10.75 17H17v.75A3.25 3.25 0 0 1 13.75 21h-8.5A3.25 3.25 0 0 1 2 17.75v-9Z"
        fill="white"
        fillOpacity="0.72"
      />
    </svg>
  );
}

function VideoPostBadge() {
  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M6.75 3.75h10.5A3 3 0 0 1 20.25 6.75v10.5a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3V6.75a3 3 0 0 1 3-3Z"
        stroke="white"
        strokeWidth="2"
      />
      <path d="M10 8.8v6.4l5.1-3.2L10 8.8Z" fill="white" />
      <path
        d="m7.2 3.8 3 4.2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m13.8 3.8 3 4.2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getPostThumbnail(post: Post) {
  const first = post.media_files[0];
  if (!first) return "";
  // 動画投稿はサムネイル画像を優先
  if (post.media_type === "video" && first.thumbnail_url) return first.thumbnail_url;
  return first.media_url;
}

function getBioLines(user: User) {
  if (user.bio?.trim()) {
    return user.bio
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  return [
    "Born and raised in Tokyo 🗼",
    "Exploring history and culture is my lifelong passion ✨",
    "From famous landmarks to hidden... 続きを読む",
  ];
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<SelectedPost>(null);
  const [listModal, setListModal] = useState<ListModal>(null);
  const [listUsers, setListUsers] = useState<User[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      setLoading(true);
      try {
        const uRes = await usersApi.profile(username);
        const profileUser: User = uRes.data;
        setUser(profileUser);

        const requests: Promise<unknown>[] = [
          postsApi.userPosts(profileUser.user_id),
        ];
        if (me && me.username !== username) {
          requests.push(
            usersApi
              .isFollowing(username)
              .catch(() => ({ data: { is_following: false } })),
          );
        }
        const results = await Promise.all(requests);
        const pRes = results[0] as { data: { results?: Post[] } | Post[] };
        const pData =
          (pRes.data as { results?: Post[] }).results ??
          (pRes.data as Post[]) ??
          [];
        setPosts(pData);
        setActiveTab("posts");

        if (me && me.username !== username && results[1]) {
          const followRes = results[1] as { data: { is_following: boolean } };
          setFollowing(followRes.data.is_following);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [username, me]);

  useEffect(() => {
    if (!me || me.username !== username || activeTab !== "saved") {
      setSavedPosts([]);
      setSavedLoading(false);
      if (me?.username !== username && activeTab === "saved") {
        setActiveTab("posts");
      }
      return;
    }

    const loadSavedPosts = async () => {
      setSavedLoading(true);
      try {
        const res = await postsApi.savedPosts();
        const data =
          (res.data as { results?: Post[] }).results ?? (res.data as Post[]) ?? [];
        setSavedPosts(data);
      } catch {
        setSavedPosts([]);
      } finally {
        setSavedLoading(false);
      }
    };

    loadSavedPosts();
  }, [username, me, activeTab]);

  useEffect(() => {
    setSelectedPostId(null);
  }, [activeTab, username]);

  const handleFollow = async () => {
    if (!user) return;

    try {
      if (following) {
        await usersApi.unfollow(user.username);
        setFollowing(false);
        setUser((current) =>
          current
            ? {
                ...current,
                follower_count: Math.max(0, current.follower_count - 1),
              }
            : current,
        );
        return;
      }

      await usersApi.follow(user.username);
      setFollowing(true);
      setUser((current) =>
        current
          ? { ...current, follower_count: current.follower_count + 1 }
          : current,
      );
    } catch {
      // ignore
    }
  };

  const openListModal = async (type: ListModal) => {
    if (!user || !type) return;

    setListModal(type);
    setListLoading(true);
    setListUsers([]);

    try {
      const res =
        type === "followers"
          ? await usersApi.followers(user.username)
          : await usersApi.following(user.username);
      setListUsers(res.data ?? []);
    } catch {
      setListUsers([]);
    } finally {
      setListLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#dbdbdb] border-t-[#0095f6]" />
      </div>
    );
  }

  if (!user) {
    return <p className="mt-20 text-center">ユーザーが見つかりません</p>;
  }

  const isMe = me?.username === user.username;
  const bioLines = getBioLines(user);
  const showSavedTab = isMe;
  const showPrivateNotice =
    user.is_private && !isMe && !following && posts.length === 0;
  const imagePosts = posts.filter((post) => post.media_type !== "video");
  const videoPosts = posts.filter((post) => post.media_type === "video");
  const savedImagePosts = savedPosts.filter((post) => post.media_type !== "video");
  const activePosts =
    activeTab === "videos"
      ? videoPosts
      : activeTab === "saved"
        ? savedImagePosts
        : activeTab === "tagged"
          ? []
        : imagePosts;
  const isTabLoading = loading || (activeTab === "saved" && savedLoading);
  const isCurrentTabEmpty = activePosts.length === 0;

  const emptyState = (() => {
    if (activeTab === "videos") {
      return {
        icon: <ReelsTabIcon active />,
        title: "動画",
        description: "まだ動画がありません",
      };
    }

    if (activeTab === "saved") {
      return {
        icon: <SavedTabIcon active />,
        title: "保存済み",
        description: "まだ保存済みの投稿がありません",
      };
    }

    if (activeTab === "tagged") {
      return {
        icon: <TaggedTabIcon active />,
        title: "タグ付けされた投稿",
        description: "まだタグ付けされた投稿がありません",
      };
    }

    return {
      icon: <GridTabIcon active />,
      title: "投稿",
      description: "まだ投稿がありません",
    };
  })();

  return (
    <div className="box-border w-full min-w-0 px-4 pt-3 md:px-0 md:pt-[30px]">
      <div className="mx-auto box-border w-full max-w-[935px] min-w-0">
        <section className="border-b border-[#dbdbdb] px-2 pb-5 md:px-0 md:pb-[44px]">
          <div className="grid grid-cols-1 gap-y-6 md:grid-cols-[291px_minmax(0,613px)] md:items-start md:gap-x-[18px]">
            <div className="flex justify-center md:justify-center md:pt-[8px] md:translate-x-[48px]">
              <ProfileAvatar user={user} />
            </div>

            <div className="min-w-0 md:max-w-[613px] md:pt-0">
              <div className="hidden items-center gap-3 md:flex">
                <h1 className="text-[20px] font-normal leading-[25px] text-[#262626]">
                  {user.username}
                </h1>
                <ThreadsBadgeIcon size={20} />
                {user.is_verified && (
                  <BadgeCheck
                    size={18}
                    className="fill-[#0095f6] text-white"
                    strokeWidth={2.25}
                  />
                )}
                {user.is_private && (
                  <Lock
                    size={16}
                    className="text-[#8e8e8e]"
                    strokeWidth={2.2}
                  />
                )}
              </div>

              <div className="hidden md:block">
                <div className="mt-[14px] text-[16px] leading-[22px] text-[#262626]">
                  <span>{user.username}</span>
                  <span className="ml-1">🇯🇵</span>
                </div>

                <div className="mt-[16px] flex items-center gap-7 text-[16px] leading-[24px] text-[#262626]">
                  <span>
                    投稿
                    <strong className="font-semibold">
                      {formatCount(posts.length)}
                    </strong>
                    件
                  </span>
                  <button
                    type="button"
                    className="hover:opacity-70"
                    onClick={() => openListModal("followers")}
                  >
                    フォロワー
                    <strong className="font-semibold">
                      {formatCount(user.follower_count)}
                    </strong>
                    人
                  </button>
                  <button
                    type="button"
                    className="hover:opacity-70"
                    onClick={() => openListModal("following")}
                  >
                    フォロー中
                    <strong className="font-semibold">
                      {formatCount(user.following_count)}
                    </strong>
                    人
                  </button>
                </div>

                <div className="mt-[16px] max-w-[613px] space-y-[2px] text-[14px] leading-[18px] text-[#262626]">
                  <p className="font-semibold">{user.username}</p>
                  {bioLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                <div className="mt-[16px] flex max-w-[613px] items-center gap-2 md:-ml-[252px] md:w-[800px] md:max-w-none">
                  {isMe ? (
                    <>
                      <Link
                        href="/profile/edit"
                        className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#efefef] px-5 text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                      >
                        プロフィールを編集
                      </Link>
                      <button
                        type="button"
                        className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#efefef] px-5 text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                      >
                        アーカイブを表示
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleFollow}
                        className={`flex h-10 flex-1 items-center justify-center rounded-lg px-5 text-[14px] font-semibold transition-colors ${
                          following
                            ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                            : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                        }`}
                      >
                        {following ? "フォロー中" : "フォローする"}
                      </button>
                      <button
                        type="button"
                        className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#efefef] px-5 text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                      >
                        メッセージ
                      </button>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#efefef] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                        aria-label="その他"
                      >
                        <MoreHorizontal size={18} strokeWidth={2.2} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2 md:hidden">
                <div className="flex items-center gap-2">
                  <h1 className="text-[14px] font-semibold leading-5 text-[#262626]">
                    {user.username}
                  </h1>
                  {user.is_verified && (
                    <BadgeCheck
                      size={16}
                      className="fill-[#0095f6] text-white"
                      strokeWidth={2.25}
                    />
                  )}
                  {user.is_private && (
                    <Lock
                      size={13}
                      className="text-[#8e8e8e]"
                      strokeWidth={2.2}
                    />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 text-center">
                  <div>
                    <div className="text-[14px] font-semibold leading-5 text-[#262626]">
                      {formatCount(posts.length)}
                    </div>
                    <div className="text-[14px] leading-5 text-[#8e8e8e]">
                      投稿
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openListModal("followers")}
                  >
                    <div className="text-[14px] font-semibold leading-5 text-[#262626]">
                      {formatCount(user.follower_count)}
                    </div>
                    <div className="text-[14px] leading-5 text-[#8e8e8e]">
                      フォロワー
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openListModal("following")}
                  >
                    <div className="text-[14px] font-semibold leading-5 text-[#262626]">
                      {formatCount(user.following_count)}
                    </div>
                    <div className="text-[14px] leading-5 text-[#8e8e8e]">
                      フォロー中
                    </div>
                  </button>
                </div>
                <div className="mt-[10px] max-w-[360px] whitespace-pre-wrap text-[14px] leading-[18px] text-[#262626]">
                  {bioLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isMe && (
            <div className="mt-[24px] hidden md:grid md:grid-cols-[291px_minmax(0,613px)] md:gap-x-[18px]">
              <div className="flex flex-col items-center">
                <div className="relative flex h-[96px] w-[96px] items-center justify-center rounded-full border-[5px] border-[#d9dee2] bg-white">
                  <div className="absolute inset-[6px] rounded-full bg-[#fafafa]" />
                  <div className="absolute h-[38px] w-[38px]">
                    <div className="absolute left-1/2 top-0 h-full w-[5px] -translate-x-1/2 rounded-full bg-[#c4c4c4]" />
                    <div className="absolute left-0 top-1/2 h-[5px] w-full -translate-y-1/2 rounded-full bg-[#c4c4c4]" />
                  </div>
                </div>
                <span className="mt-[13px] text-[13px] font-bold leading-none text-[#111111]">
                  新規
                </span>
              </div>
              <div />
            </div>
          )}

          <div className="mt-6 flex gap-2 md:hidden">
            {isMe ? (
              <>
                <Link
                  href="/profile/edit"
                  className="flex-1 rounded-lg bg-[#efefef] py-[7px] text-center text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                >
                  プロフィールを編集
                </Link>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-[#efefef] py-[7px] text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                >
                  アーカイブを表示
                </button>
                <Link
                  href="/profile/edit"
                  className="rounded-lg bg-[#efefef] p-[7px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                >
                  <Settings size={18} strokeWidth={1.9} />
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleFollow}
                  className={`flex-1 rounded-lg py-[7px] text-[14px] font-semibold transition-colors ${
                    following
                      ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                      : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                  }`}
                >
                  {following ? "フォロー中" : "フォローする"}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-[#efefef] py-[7px] text-center text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                >
                  メッセージ
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#efefef] p-[7px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                >
                  <MoreHorizontal size={18} strokeWidth={2.4} />
                </button>
              </>
            )}
          </div>
        </section>

        <section className="posts-section box-border w-full max-w-[935px] min-w-0">
          <div
            className="mx-auto box-border flex w-full max-w-[935px] min-w-0 border-t border-[#dbdbdb] bg-white px-4 md:px-0"
            role="tablist"
            aria-label="プロフィールメディア"
          >
            <button
              type="button"
              aria-label="画像一覧"
              aria-pressed={activeTab === "posts"}
              role="tab"
              aria-selected={activeTab === "posts"}
              onClick={() => setActiveTab("posts")}
              className={`relative flex h-[48px] flex-1 items-start justify-center pt-[18px] transition-colors md:h-[52px] ${
                activeTab === "posts" ? "text-black" : "text-[#8e8e8e]"
              }`}
            >
              {activeTab === "posts" && (
                <span className="absolute top-0 left-1/2 h-[2px] w-[64px] -translate-x-1/2 bg-black md:w-[72px]" />
              )}
              <GridTabIcon active={activeTab === "posts"} />
            </button>
            <button
              type="button"
              aria-label="投稿動画一覧"
              aria-pressed={activeTab === "videos"}
              role="tab"
              aria-selected={activeTab === "videos"}
              onClick={() => setActiveTab("videos")}
              className={`relative flex h-[48px] flex-1 items-start justify-center pt-[18px] transition-colors md:h-[52px] ${
                activeTab === "videos" ? "text-black" : "text-[#8e8e8e]"
              }`}
            >
              {activeTab === "videos" && (
                <span className="absolute top-0 left-1/2 h-[2px] w-[64px] -translate-x-1/2 bg-black md:w-[72px]" />
              )}
              <ReelsTabIcon active={activeTab === "videos"} />
            </button>
            {showSavedTab && (
              <button
                type="button"
                aria-label="お気に入り画像一覧"
                aria-pressed={activeTab === "saved"}
                role="tab"
                aria-selected={activeTab === "saved"}
                onClick={() => setActiveTab("saved")}
                className={`relative flex h-[48px] flex-1 items-start justify-center pt-[18px] transition-colors md:h-[52px] ${
                  activeTab === "saved" ? "text-black" : "text-[#8e8e8e]"
                }`}
              >
                {activeTab === "saved" && (
                  <span className="absolute top-0 left-1/2 h-[2px] w-[64px] -translate-x-1/2 bg-black md:w-[72px]" />
                )}
                <SavedTabIcon active={activeTab === "saved"} />
              </button>
            )}
            <button
              type="button"
              aria-label="タグ付けされた投稿"
              aria-pressed={activeTab === "tagged"}
              role="tab"
              aria-selected={activeTab === "tagged"}
              onClick={() => setActiveTab("tagged")}
              className={`relative flex h-[48px] flex-1 items-start justify-center pt-[18px] transition-colors md:h-[52px] ${
                activeTab === "tagged" ? "text-black" : "text-[#8e8e8e]"
              }`}
            >
              {activeTab === "tagged" && (
                <span className="absolute top-0 left-1/2 h-[2px] w-[64px] -translate-x-1/2 bg-black md:w-[72px]" />
              )}
              <TaggedTabIcon active={activeTab === "tagged"} />
            </button>
          </div>

          {isTabLoading ? (
            <div className="flex min-h-[280px] items-center justify-center pb-3 md:min-h-[320px] md:pb-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#dbdbdb] border-t-[#0095f6]" />
            </div>
          ) : isCurrentTabEmpty ? (
            <div className="px-6 py-16 text-center md:pt-[28px] md:pb-10">
              {activeTab === "posts" && showPrivateNotice ? (
                <>
                  <EmptyCircleIcon>
                    <Lock size={26} strokeWidth={2.2} />
                  </EmptyCircleIcon>
                  <p className="text-[28px] font-extrabold leading-8 text-[#262626]">
                    このアカウントは非公開です
                  </p>
                  <p className="mx-auto mt-3 max-w-[360px] text-[14px] leading-5 text-[#8e8e8e]">
                    フォローすると、写真や動画を見られるようになります。
                  </p>
                </>
              ) : (
                <>
                  <EmptyCircleIcon>{emptyState.icon}</EmptyCircleIcon>
                  <p className="text-[28px] font-extrabold leading-8 text-[#262626]">
                    {emptyState.title}
                  </p>
                  <p className="mt-3 text-[14px] leading-5 text-[#8e8e8e]">
                    {emptyState.description}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="posts-grid mb-3 box-border grid w-full min-w-0 grid-cols-2 gap-[1px] border-b border-[#dbdbdb] pb-3 md:mb-4 md:grid-cols-[repeat(3,minmax(0,1fr))] md:gap-1 md:pb-4">
              {activePosts.map((post) => {
                const thumbnail = getPostThumbnail(post);
                const isMulti =
                  post.media_files.length > 1 || post.media_type === "carousel";
                const isVideo = post.media_type === "video";

                return (
                  <button
                    key={post.post_id}
                    type="button"
                    onClick={() => setSelectedPostId(post.post_id)}
                    className="post-card group relative w-full min-w-0 overflow-hidden bg-[#efefef]"
                  >
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt={post.caption}
                        className="block aspect-square w-full object-cover transition-opacity group-hover:opacity-80"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-[#8e8e8e]">
                        No Image
                      </div>
                    )}

                    {(isMulti || isVideo) && (
                      <div className="absolute right-3 top-3 text-white">
                        {isMulti ? <MultiPostBadge /> : <VideoPostBadge />}
                      </div>
                    )}

                    <div className="absolute inset-0 hidden items-center justify-center gap-7 bg-black/30 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
                      <span className="text-[16px] font-semibold text-white">
                        ♥ {formatCount(post.like_count)}
                      </span>
                      <span className="text-[16px] font-semibold text-white">
                        💬 {formatCount(post.comment_count)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {listModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setListModal(null)}
          >
            <div
              className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-white"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#dbdbdb] px-4 py-3">
                <span className="text-sm font-semibold">
                  {listModal === "followers" ? "フォロワー" : "フォロー中"}
                </span>
                <button type="button" onClick={() => setListModal(null)}>
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {listLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#dbdbdb] border-t-[#0095f6]" />
                  </div>
                ) : listUsers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#8e8e8e]">
                    ユーザーがいません
                  </p>
                ) : (
                  listUsers.map((listUser) => (
                    <Link
                      key={listUser.user_id}
                      href={`/profile/${listUser.username}`}
                      onClick={() => setListModal(null)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#fafafa]"
                    >
                      <Avatar
                        src={listUser.profile_img}
                        username={listUser.username}
                        size={40}
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          {listUser.username}
                        </p>
                        {listUser.bio && (
                          <p className="max-w-[200px] truncate text-xs text-[#8e8e8e]">
                            {listUser.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {selectedPostId && (
          <PostDetailModal
            postId={selectedPostId}
            onClose={() => setSelectedPostId(null)}
          />
        )}
      </div>
    </div>
  );
}
