"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Grid3x3 } from "lucide-react";
import { postsApi } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tag) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await postsApi.byHashtag(decodeURIComponent(tag));
        const data = res.data;
        setPosts(data.results ?? data ?? []);
        setCount(data.count ?? (data.results ?? data ?? []).length);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
  }, [tag]);

  return (
    <div className="max-w-[935px] mx-auto px-4 pt-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">#{decodeURIComponent(tag)}</h1>
          <p className="text-[#8e8e8e] text-sm mt-0.5">{count}件の投稿</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center text-[#8e8e8e] py-16">
          <Grid3x3 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold">投稿が見つかりません</p>
          <p className="text-sm mt-1">#{decodeURIComponent(tag)} のタグ付き投稿はまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <Link
              key={post.post_id}
              href={`/posts/${post.post_id}`}
              className="aspect-square relative overflow-hidden bg-[#efefef] group"
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
