"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { CreatePostModal } from "@/components/CreatePostModal";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      {/* サイドバー (デスクトップ) */}
      <div className="hidden lg:block">
        <Sidebar onCreatePost={() => setShowCreate(true)} />
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 lg:ml-[244px] pb-12 lg:pb-0" key={feedKey}>
        {children}
      </main>

      {/* ボトムナビ (モバイル) */}
      <BottomNav onCreatePost={() => setShowCreate(true)} />

      {/* 投稿作成モーダル */}
      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setFeedKey((k) => k + 1)}
        />
      )}

    </div>
  );
}
