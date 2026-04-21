"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  CirclePlus,
  Clapperboard,
  Grid3x3,
  Lock,
  MoreHorizontal,
  Settings,
  Tag,
  X,
} from "lucide-react";
import { usersApi, postsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PostDetailModal } from "@/components/PostDetailModal";
import type { User, Post } from "@/lib/types";

type Tab = "posts" | "saved" | "tagged";
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
    <div className={`mx-auto mb-4 flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-[#262626] ${className}`}>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(true);

  // 投稿詳細モーダル
  const [selectedPostId, setSelectedPostId] = useState<SelectedPost>(null);

  // フォロワー/フォロー中モーダル
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

        const promises: Promise<unknown>[] = [postsApi.userPosts(profileUser.user_id)];
        if (me && me.username !== username) {
          promises.push(
            usersApi.isFollowing(username).catch(() => ({ data: { is_following: false } }))
          );
        }
        if (me && me.username === username) {
          promises.push(postsApi.savedPosts());
        }

        const results = await Promise.all(promises);
        const pRes = results[0] as { data: { results?: Post[] } | Post[] };
        const pData = (pRes.data as { results?: Post[] }).results ?? (pRes.data as Post[]) ?? [];
        setPosts(pData);

        if (me && me.username !== username && results[1]) {
          const followRes = results[1] as { data: { is_following: boolean } };
          setFollowing(followRes.data.is_following);
        }
        if (me && me.username === username && results[1]) {
          const savedRes = results[1] as { data: Post[] };
          setSavedPosts(savedRes.data ?? []);
        }
      } catch { /* ignore */ } finally {
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
        setUser((u) => u ? { ...u, follower_count: u.follower_count - 1 } : u);
      } else {
        await usersApi.follow(user.username);
        setFollowing(true);
        setUser((u) => u ? { ...u, follower_count: u.follower_count + 1 } : u);
      }
    } catch { /* ignore */ }
  };

  const openListModal = async (type: ListModal) => {
    if (!user || !type) return;
    setListModal(type);
    setListLoading(true);
    setListUsers([]);
    try {
      const res = type === "followers"
        ? await usersApi.followers(user.username)
        : await usersApi.following(user.username);
      setListUsers(res.data ?? []);
    } catch { /* ignore */ } finally {
      setListLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <p className="text-center mt-20">ユーザーが見つかりません</p>;

  const isMe = me?.username === user.username;
  const displayPosts = tab === "posts" ? posts : tab === "saved" ? savedPosts : [];
  const showSavedTab = isMe;
  const showPrivateNotice = user.is_private && !isMe && !following && posts.length === 0;

  return (
    <div className="mx-auto max-w-[975px] px-0 pt-2 md:px-5 md:pt-[30px]">
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
                <Link href="/profile/edit" className="flex h-8 w-8 items-center justify-center text-[#262626]">
                  <Settings size={24} strokeWidth={1.9} />
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFollow}
                    className={`rounded-lg px-4 py-[7px] text-[14px] font-semibold leading-[18px] transition-colors ${
                      following
                        ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                        : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                    }`}
                  >
                    {following ? "フォロー中" : "フォローする"}
                  </button>
                  <Link
                    href="/dm"
                    className="rounded-lg bg-[#efefef] px-4 py-[7px] text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
                  >
                    メッセージ
                  </Link>
                  <button className="rounded-lg bg-[#efefef] p-2 text-[#262626] transition-colors hover:bg-[#dbdbdb]">
                    <MoreHorizontal size={18} strokeWidth={2.4} />
                  </button>
                </div>
              )}
            </div>

            <div className="mb-0 hidden items-center gap-10 pt-5 text-[16px] leading-[18px] md:flex">
              <span>投稿 <strong className="font-semibold">{formatCount(posts.length)}</strong>件</span>
              <button className="hover:opacity-70" onClick={() => openListModal("followers")}>
                フォロワー <strong className="font-semibold">{formatCount(user.follower_count)}</strong>人
              </button>
              <button className="hover:opacity-70" onClick={() => openListModal("following")}>
                フォロー中 <strong className="font-semibold">{formatCount(user.following_count)}</strong>人
              </button>
            </div>

            <div className="mt-1 grid grid-cols-3 text-center md:hidden">
              <div>
                <div className="text-[14px] font-semibold leading-5 text-[#262626]">{formatCount(posts.length)}</div>
                <div className="text-[14px] leading-5 text-[#8e8e8e]">投稿</div>
              </div>
              <button onClick={() => openListModal("followers")}>
                <div className="text-[14px] font-semibold leading-5 text-[#262626]">{formatCount(user.follower_count)}</div>
                <div className="text-[14px] leading-5 text-[#8e8e8e]">フォロワー</div>
              </button>
              <button onClick={() => openListModal("following")}>
                <div className="text-[14px] font-semibold leading-5 text-[#262626]">{formatCount(user.following_count)}</div>
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
              <button className="flex h-8 min-w-0 items-center justify-center rounded-lg bg-[#efefef] px-4 text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]">
                アーカイブを表示
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollow}
                className={`flex h-8 min-w-0 items-center justify-center rounded-lg px-4 text-[14px] font-semibold leading-[18px] transition-colors ${
                  following
                    ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                    : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                }`}
              >
                {following ? "フォロー中" : "フォローする"}
              </button>
              <Link
                href="/dm"
                className="flex h-8 min-w-0 items-center justify-center rounded-lg bg-[#efefef] px-4 text-center text-[14px] font-semibold leading-[18px] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
              >
                メッセージ
              </Link>
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
              <button className="flex-1 rounded-lg bg-[#efefef] py-[7px] text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]">
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
                onClick={handleFollow}
                className={`flex-1 rounded-lg py-[7px] text-[14px] font-semibold transition-colors ${
                  following
                    ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                    : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                }`}
              >
                {following ? "フォロー中" : "フォローする"}
              </button>
              <Link
                href="/dm"
                className="flex-1 rounded-lg bg-[#efefef] py-[7px] text-center text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#dbdbdb]"
              >
                メッセージ
              </Link>
              <button className="rounded-lg bg-[#efefef] p-[7px] text-[#262626] transition-colors hover:bg-[#dbdbdb]">
                <MoreHorizontal size={18} strokeWidth={2.4} />
              </button>
            </>
          )}
        </div>
      </section>

      <section className="border-t border-[#dbdbdb]">
        <div className="flex justify-center gap-0 md:gap-[62px]">
          <button
            onClick={() => setTab("posts")}
            className={`flex min-w-0 items-center justify-center gap-1 px-6 py-3 text-[12px] uppercase tracking-[0.12em] font-semibold border-t md:px-0 md:py-[18px] ${
              tab === "posts" ? "border-[#262626] text-[#262626]" : "border-transparent text-[#8e8e8e]"
            }`}
          >
            <Grid3x3 size={12} />
            <span className="hidden md:inline text-[12px]">投稿</span>
          </button>
          <button
            type="button"
            className="hidden items-center justify-center gap-2 border-t border-transparent py-[18px] text-[#8e8e8e] md:flex"
          >
            <Clapperboard size={12} />
            <span className="text-[12px] uppercase tracking-[0.12em] font-semibold">リール</span>
          </button>
          {showSavedTab && (
            <button
              onClick={() => setTab("saved")}
              className={`flex min-w-0 items-center justify-center gap-1 px-6 py-3 text-[12px] uppercase tracking-[0.12em] font-semibold border-t md:px-0 md:py-[18px] ${
                tab === "saved" ? "border-[#262626] text-[#262626]" : "border-transparent text-[#8e8e8e]"
              }`}
            >
              <Bookmark size={12} />
              <span className="hidden md:inline text-[12px]">保存済み</span>
            </button>
          )}
          <button
            onClick={() => setTab("tagged")}
            className={`flex min-w-0 items-center justify-center gap-1 px-6 py-3 text-[12px] uppercase tracking-[0.12em] font-semibold border-t md:px-0 md:py-[18px] ${
              tab === "tagged" ? "border-[#262626] text-[#262626]" : "border-transparent text-[#8e8e8e]"
            }`}
          >
            <Tag size={12} />
            <span className="hidden md:inline text-[12px]">タグ付け</span>
          </button>
        </div>

        <div className="mt-[1px] grid grid-cols-3 gap-[1px] md:gap-[2px]">
          {displayPosts.map((post) => (
            <button
              key={post.post_id}
              onClick={() => setSelectedPostId(post.post_id)}
              className="group relative aspect-square w-full overflow-hidden bg-[#efefef]"
            >
              {post.media_files[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.media_files[0].media_url}
                  alt={post.caption}
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
              )}
              <div className="absolute inset-0 hidden items-center justify-center gap-7 bg-black/30 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
                <span className="text-[16px] font-semibold text-white">♥ {formatCount(post.like_count)}</span>
                <span className="text-[16px] font-semibold text-white">💬 {formatCount(post.comment_count)}</span>
              </div>
            </button>
          ))}
        </div>

        {displayPosts.length === 0 && (
          <div className="px-6 py-16 text-center md:py-24">
            {showPrivateNotice && tab === "posts" ? (
              <>
                <EmptyCircleIcon>
                  <Lock size={26} strokeWidth={2.2} />
                </EmptyCircleIcon>
                <p className="text-[28px] font-extrabold leading-8 text-[#262626]">このアカウントは非公開です</p>
                <p className="mx-auto mt-3 max-w-[360px] text-[14px] leading-5 text-[#8e8e8e]">
                  フォローすると、写真や動画を見られるようになります。
                </p>
              </>
            ) : tab === "posts" ? (
              <>
                <EmptyCircleIcon>
                  <Grid3x3 size={26} strokeWidth={1.9} />
                </EmptyCircleIcon>
                <p className="text-[28px] font-extrabold leading-8 text-[#262626]">投稿</p>
                <p className="mt-3 text-[14px] leading-5 text-[#8e8e8e]">まだ投稿がありません</p>
              </>
            ) : tab === "saved" ? (
              <>
                <EmptyCircleIcon>
                  <Bookmark size={24} strokeWidth={1.9} />
                </EmptyCircleIcon>
                <p className="text-[28px] font-extrabold leading-8 text-[#262626]">保存済み</p>
                <p className="mx-auto mt-3 max-w-[360px] text-[14px] leading-5 text-[#8e8e8e]">
                  保存した投稿はここに表示されます。保存済みの投稿は自分だけが見られます。
                </p>
              </>
            ) : (
              <>
                <EmptyCircleIcon>
                  <Tag size={24} strokeWidth={1.9} />
                </EmptyCircleIcon>
                <p className="text-[28px] font-extrabold leading-8 text-[#262626]">タグ付けされた写真</p>
                <p className="mx-auto mt-3 max-w-[360px] text-[14px] leading-5 text-[#8e8e8e]">
                  ユーザーがあなたをタグ付けした写真や動画がここに表示されます。
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* フォロワー/フォロー中モーダル */}
      {listModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setListModal(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#dbdbdb]">
              <span className="font-semibold text-sm">
                {listModal === "followers" ? "フォロワー" : "フォロー中"}
              </span>
              <button onClick={() => setListModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {listLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
                </div>
              ) : listUsers.length === 0 ? (
                <p className="text-center text-[#8e8e8e] text-sm py-8">ユーザーがいません</p>
              ) : (
                listUsers.map((u) => (
                  <Link
                    key={u.user_id}
                    href={`/profile/${u.username}`}
                    onClick={() => setListModal(null)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#fafafa]"
                  >
                    <Avatar src={u.profile_img} username={u.username} size={40} />
                    <div>
                      <p className="font-semibold text-sm">{u.username}</p>
                      {u.bio && <p className="text-[#8e8e8e] text-xs truncate max-w-[200px]">{u.bio}</p>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 投稿詳細モーダル */}
      {selectedPostId && (
        <PostDetailModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  );
}
