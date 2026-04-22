"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  CirclePlus,
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

function formatCount(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function ProfileAvatar({ user }: { user: User }) {
  return (
    <div className="relative flex-shrink-0">
      <div className="absolute left-[18px] top-[-16px] hidden rounded-[18px] bg-white px-[16px] py-[10px] text-[14px] font-normal leading-none text-[#737373] shadow-[0_6px_18px_rgba(0,0,0,0.14)] md:block">
        ノート...
        <div className="absolute bottom-[-5px] left-[26px] h-[10px] w-[10px] rotate-45 rounded-[2px] bg-white" />
      </div>
      <div className="h-[77px] w-[77px] rounded-full border border-[#dbdbdb] p-[2px] md:h-[150px] md:w-[150px]">
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
  const color = active ? "#262626" : "#8e8e8e";

  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12" fill="none">
      <rect x="0.75" y="0.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="4.75" y="0.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="8.75" y="0.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="0.75" y="4.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="4.75" y="4.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="8.75" y="4.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="0.75" y="8.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="4.75" y="8.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
      <rect x="8.75" y="8.75" width="2.5" height="2.5" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function ReelsTabIcon({ active }: { active: boolean }) {
  const color = active ? "#262626" : "#8e8e8e";

  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M4.7 1.3 6.8 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.4 1.3 9.5 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 5.1v2.6l2.3-1.3L5 5.1Z" fill={color} />
    </svg>
  );
}

function SavedTabIcon({ active }: { active: boolean }) {
  const color = active ? "#262626" : "#8e8e8e";

  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12" fill="none">
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
  const color = active ? "#262626" : "#8e8e8e";

  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12" fill="none">
      <rect x="1.25" y="1.25" width="9.5" height="9.5" rx="2.25" stroke={color} strokeWidth="1.5" />
      <circle cx="6" cy="4.7" r="1.2" stroke={color} strokeWidth="1.5" />
      <path d="M3.8 9.2c.4-1.55 1.37-2.4 2.2-2.4s1.8.85 2.2 2.4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MultiPostBadge() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.75A3.25 3.25 0 0 1 10.25.5h8.5A3.25 3.25 0 0 1 22 3.75v8.5A3.25 3.25 0 0 1 18.75 15.5h-8.5A3.25 3.25 0 0 1 7 12.25v-8.5Z" fill="white" />
      <path d="M2 8.75A3.25 3.25 0 0 1 5.25 5.5H6v6.75A4.75 4.75 0 0 0 10.75 17H17v.75A3.25 3.25 0 0 1 13.75 21h-8.5A3.25 3.25 0 0 1 2 17.75v-9Z" fill="white" fillOpacity="0.72" />
    </svg>
  );
}

function VideoPostBadge() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.75 3.75h10.5A3 3 0 0 1 20.25 6.75v10.5a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3V6.75a3 3 0 0 1 3-3Z"
        stroke="white"
        strokeWidth="2"
      />
      <path d="M10 8.8v6.4l5.1-3.2L10 8.8Z" fill="white" />
      <path d="m7.2 3.8 3 4.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="m13.8 3.8 3 4.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function getPostThumbnail(post: Post) {
  return post.media_files[0]?.media_url ?? "";
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<SelectedPost>(null);
  const [listModal, setListModal] = useState<ListModal>(null);
  const [listUsers, setListUsers] = useState<User[]>([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      setLoading(true);
      try {
        const uRes = await usersApi.profile(username);
        const profileUser: User = uRes.data;
        setUser(profileUser);

        const requests: Promise<unknown>[] = [postsApi.userPosts(profileUser.user_id)];
        if (me && me.username !== username) {
          requests.push(
            usersApi.isFollowing(username).catch(() => ({ data: { is_following: false } })),
          );
        }
        const results = await Promise.all(requests);
        const pRes = results[0] as { data: { results?: Post[] } | Post[] };
        const pData = (pRes.data as { results?: Post[] }).results ?? (pRes.data as Post[]) ?? [];
        setPosts(pData);

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

  const handleFollow = async () => {
    if (!user) return;

    try {
      if (following) {
        await usersApi.unfollow(user.username);
        setFollowing(false);
        setUser((current) =>
          current
            ? { ...current, follower_count: Math.max(0, current.follower_count - 1) }
            : current,
        );
        return;
      }

      await usersApi.follow(user.username);
      setFollowing(true);
      setUser((current) =>
        current ? { ...current, follower_count: current.follower_count + 1 } : current,
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
  const showSavedTab = isMe;
  const showPrivateNotice = user.is_private && !isMe && !following && posts.length === 0;

  return (
    <div className="mx-auto w-full max-w-[975px] px-0 pt-2 md:px-5 md:pt-[30px]">
      <section className="border-b border-[#dbdbdb] px-4 pb-5 md:border-b-0 md:px-0 md:pb-[44px]">
        <div className="grid grid-cols-[auto_1fr] gap-x-7 gap-y-4 md:grid-cols-[291px_minmax(0,1fr)] md:gap-x-[30px] md:gap-y-0">
          <div className="flex justify-center md:justify-start md:pl-[28px] md:pt-[6px]">
            <ProfileAvatar user={user} />
          </div>

          <div className="min-w-0 md:pt-0">
            <div className="hidden items-center gap-5 md:flex">
              <div className="flex items-center gap-3">
                <h1 className="text-[20px] font-normal leading-[24px] text-[#262626]">
                  {user.username}
                </h1>
                {user.is_verified && (
                  <BadgeCheck size={17} className="fill-[#0095f6] text-white" strokeWidth={2.25} />
                )}
                {user.is_private && (
                  <Lock size={15} className="text-[#8e8e8e]" strokeWidth={2.2} />
                )}
              </div>
              {isMe ? (
                <>
                  <Link
                    href="/profile/edit"
                    className="rounded-lg bg-[#efefef] px-4 py-[7px] text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                  >
                    プロフィールを編集
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg bg-[#efefef] px-4 py-[7px] text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                  >
                    アーカイブを表示
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efefef] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                  >
                    <Settings size={17} strokeWidth={2} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFollow}
                    className={`rounded-lg px-4 py-[7px] text-[14px] font-semibold leading-[18px] transition-colors ${
                      following
                        ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                        : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                    }`}
                  >
                    {following ? "フォロー中" : "フォローする"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-[#efefef] px-4 py-[7px] text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                  >
                    メッセージ
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-[#efefef] p-2 text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                  >
                    <MoreHorizontal size={18} strokeWidth={2.4} />
                  </button>
                </div>
              )}
            </div>

            <div className="mb-0 hidden items-center gap-10 pt-5 text-[16px] leading-[18px] md:flex">
              <span>
                投稿 <strong className="font-semibold">{formatCount(posts.length)}</strong>件
              </span>
              <button type="button" className="hover:opacity-70" onClick={() => openListModal("followers")}>
                フォロワー{" "}
                <strong className="font-semibold">{formatCount(user.follower_count)}</strong>人
              </button>
              <button type="button" className="hover:opacity-70" onClick={() => openListModal("following")}>
                フォロー中{" "}
                <strong className="font-semibold">{formatCount(user.following_count)}</strong>人
              </button>
            </div>

            <div className="mt-1 grid grid-cols-3 text-center md:hidden">
              <div>
                <div className="text-[14px] font-semibold leading-5 text-[#262626]">
                  {formatCount(posts.length)}
                </div>
                <div className="text-[14px] leading-5 text-[#8e8e8e]">投稿</div>
              </div>
              <button type="button" onClick={() => openListModal("followers")}>
                <div className="text-[14px] font-semibold leading-5 text-[#262626]">
                  {formatCount(user.follower_count)}
                </div>
                <div className="text-[14px] leading-5 text-[#8e8e8e]">フォロワー</div>
              </button>
              <button type="button" onClick={() => openListModal("following")}>
                <div className="text-[14px] font-semibold leading-5 text-[#262626]">
                  {formatCount(user.following_count)}
                </div>
                <div className="text-[14px] leading-5 text-[#8e8e8e]">フォロー中</div>
              </button>
            </div>

            <div className="mt-2 md:mt-5">
              <p className="hidden text-[14px] font-semibold leading-[18px] text-[#262626] md:block">
                {user.username}
              </p>
              <div className="mt-4 flex items-center gap-2 md:hidden">
                <h1 className="text-[14px] font-semibold leading-5 text-[#262626]">
                  {user.username}
                </h1>
                {user.is_verified && (
                  <BadgeCheck size={16} className="fill-[#0095f6] text-white" strokeWidth={2.25} />
                )}
                {user.is_private && (
                  <Lock size={13} className="text-[#8e8e8e]" strokeWidth={2.2} />
                )}
              </div>
              {user.bio && (
                <p className="mt-[6px] max-w-[360px] whitespace-pre-wrap text-[14px] leading-[18px] text-[#262626]">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 hidden grid-cols-2 gap-2 md:ml-[321px] md:grid md:max-w-[451px]">
          {isMe ? (
            <>
              <Link
                href="/profile/edit"
                className="flex h-8 min-w-0 items-center justify-center rounded-lg bg-[#efefef] px-4 text-center text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
              >
                プロフィールを編集
              </Link>
              <button
                type="button"
                className="flex h-8 min-w-0 items-center justify-center rounded-lg bg-[#efefef] px-4 text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
              >
                アーカイブを表示
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleFollow}
                className={`flex h-8 min-w-0 items-center justify-center rounded-lg px-4 text-[14px] font-semibold leading-[18px] transition-colors ${
                  following
                    ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                    : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                }`}
              >
                {following ? "フォロー中" : "フォローする"}
              </button>
              <button
                type="button"
                className="flex h-8 min-w-0 items-center justify-center rounded-lg bg-[#efefef] px-4 text-center text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
              >
                メッセージ
              </button>
            </>
          )}
        </div>

        {isMe && (
          <div className="mt-[44px] hidden md:flex md:pl-[30px]">
            <div className="flex flex-col items-center">
              <div className="relative flex h-[77px] w-[77px] items-center justify-center rounded-full border border-[#dbdbdb]">
                <div className="absolute inset-[5px] rounded-full border border-[#dbdbdb]" />
                <CirclePlus size={38} strokeWidth={1.2} className="text-[#c7c7c7]" />
              </div>
              <span className="mt-[14px] text-[12px] font-semibold text-[#262626]">新規</span>
            </div>
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

      <section className="w-full border-t border-[#dbdbdb]">
        <div className="mx-auto flex w-full max-w-[935px] justify-center gap-0 md:gap-[60px]">
          <button
            type="button"
            className="flex min-w-0 items-center justify-center gap-[6px] border-t border-[#262626] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#262626] md:px-0 md:py-[18px]"
          >
            <GridTabIcon active />
            <span className="hidden md:inline text-[12px]">投稿</span>
          </button>
          <button
            type="button"
            className="flex cursor-default min-w-0 items-center justify-center gap-[6px] border-t border-transparent px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e8e8e] md:px-0 md:py-[18px]"
          >
            <ReelsTabIcon active={false} />
            <span className="hidden md:inline text-[12px]">リール</span>
          </button>
          {showSavedTab && (
            <button
              type="button"
              className="flex cursor-default min-w-0 items-center justify-center gap-[6px] border-t border-transparent px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e8e8e] md:px-0 md:py-[18px]"
            >
              <SavedTabIcon active={false} />
              <span className="hidden md:inline text-[12px]">保存済み</span>
            </button>
          )}
          <button
            type="button"
            className="flex cursor-default min-w-0 items-center justify-center gap-[6px] border-t border-transparent px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e8e8e] md:px-0 md:py-[18px]"
          >
            <TaggedTabIcon active={false} />
            <span className="hidden md:inline text-[12px]">タグ付け</span>
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="px-6 py-16 text-center md:py-24">
            {showPrivateNotice ? (
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
                <EmptyCircleIcon>
                  <GridTabIcon active />
                </EmptyCircleIcon>
                <p className="text-[28px] font-extrabold leading-8 text-[#262626]">投稿</p>
                <p className="mt-3 text-[14px] leading-5 text-[#8e8e8e]">まだ投稿がありません</p>
              </>
            )}
          </div>
        ) : (
          <div className="mx-auto mt-[1px] grid w-full max-w-[935px] grid-cols-3 gap-[1px] md:gap-[2px]">
            {posts.map((post) => {
              const thumbnail = getPostThumbnail(post);
              const isMulti = post.media_files.length > 1 || post.media_type === "carousel";
              const isVideo = post.media_type === "video";

              return (
                <button
                  key={post.post_id}
                  type="button"
                  onClick={() => setSelectedPostId(post.post_id)}
                  className="group relative aspect-square w-full overflow-hidden bg-[#efefef]"
                >
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnail}
                      alt={post.caption}
                      className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
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
                <p className="py-8 text-center text-sm text-[#8e8e8e]">ユーザーがいません</p>
              ) : (
                listUsers.map((listUser) => (
                  <Link
                    key={listUser.user_id}
                    href={`/profile/${listUser.username}`}
                    onClick={() => setListModal(null)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#fafafa]"
                  >
                    <Avatar src={listUser.profile_img} username={listUser.username} size={40} />
                    <div>
                      <p className="text-sm font-semibold">{listUser.username}</p>
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
        <PostDetailModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
      )}
    </div>
  );
}
