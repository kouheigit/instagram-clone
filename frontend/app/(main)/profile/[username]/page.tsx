"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Grid3x3, Bookmark, X, Settings } from "lucide-react";
import { usersApi, postsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PostDetailModal } from "@/components/PostDetailModal";
import type { User, Post } from "@/lib/types";

type Tab = "posts" | "saved";
type ListModal = "followers" | "following" | null;
type SelectedPost = string | null;

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
  const displayPosts = tab === "posts" ? posts : savedPosts;

  return (
    <div className="max-w-[935px] mx-auto px-4 pt-8">
      {/* プロフィールヘッダー */}
      <div className="flex gap-8 mb-10">
        <div className="flex-shrink-0">
          <div className="w-20 h-20 lg:w-36 lg:h-36 rounded-full p-[3px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
            <div className="w-full h-full rounded-full p-[3px] bg-white">
              {user.profile_img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profile_img}
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white font-bold text-4xl">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {/* ユーザー名行 */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h1 className="text-xl font-light">{user.username}</h1>
            {isMe && (
              <Link href="/profile/edit" className="text-[#262626]">
                <Settings size={18} strokeWidth={1.5} />
              </Link>
            )}
            {!isMe && (
              <button
                onClick={handleFollow}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                  following
                    ? "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                    : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                }`}
              >
                {following ? "フォロー中" : "フォローする"}
              </button>
            )}
          </div>

          {/* 統計 */}
          <div className="flex gap-8 mb-4 text-sm">
            <span><strong>{posts.length}</strong> 投稿</span>
            <button className="hover:opacity-70" onClick={() => openListModal("followers")}>
              <strong>{user.follower_count}</strong> フォロワー
            </button>
            <button className="hover:opacity-70" onClick={() => openListModal("following")}>
              <strong>{user.following_count}</strong> フォロー中
            </button>
          </div>

          {/* 自己紹介 */}
          {user.bio && <p className="text-sm whitespace-pre-wrap mb-4">{user.bio}</p>}

          {/* アクションボタン（自分のプロフィールのみ） */}
          {isMe && (
            <div className="flex gap-2">
              <Link
                href="/profile/edit"
                className="flex-1 text-center bg-[#efefef] hover:bg-[#dbdbdb] rounded-lg py-1.5 text-sm font-semibold transition-colors"
              >
                プロフィールを編集
              </Link>
              <button className="flex-1 bg-[#efefef] hover:bg-[#dbdbdb] rounded-lg py-1.5 text-sm font-semibold transition-colors">
                アーカイブを表示
              </button>
            </div>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="border-t border-[#dbdbdb]">
        <div className="flex justify-center gap-12">
          <button
            onClick={() => setTab("posts")}
            className={`flex items-center gap-2 py-4 text-xs uppercase tracking-wider font-semibold border-t-2 -mt-px transition-colors ${
              tab === "posts" ? "border-[#262626] text-[#262626]" : "border-transparent text-[#8e8e8e]"
            }`}
          >
            <Grid3x3 size={12} /> 投稿
          </button>
          {isMe && (
            <button
              onClick={() => setTab("saved")}
              className={`flex items-center gap-2 py-4 text-xs uppercase tracking-wider font-semibold border-t-2 -mt-px transition-colors ${
                tab === "saved" ? "border-[#262626] text-[#262626]" : "border-transparent text-[#8e8e8e]"
              }`}
            >
              <Bookmark size={12} /> 保存済み
            </button>
          )}
        </div>

        {/* 投稿グリッド */}
        <div className="grid grid-cols-3 gap-1 mt-1">
          {displayPosts.map((post) => (
            <button
              key={post.post_id}
              onClick={() => setSelectedPostId(post.post_id)}
              className="aspect-square relative overflow-hidden bg-[#efefef] group w-full"
            >
              {post.media_files[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.media_files[0].media_url}
                  alt={post.caption}
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <span className="text-white text-sm font-semibold">♥ {post.like_count}</span>
                <span className="text-white text-sm font-semibold">💬 {post.comment_count}</span>
              </div>
            </button>
          ))}
        </div>

        {displayPosts.length === 0 && (
          <div className="text-center text-[#8e8e8e] py-16">
            {tab === "posts" ? (
              <>
                <Grid3x3 size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-semibold">まだ投稿がありません</p>
              </>
            ) : (
              <>
                <Bookmark size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-semibold">保存した投稿はありません</p>
              </>
            )}
          </div>
        )}
      </div>

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
