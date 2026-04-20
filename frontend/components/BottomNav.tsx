"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/api";
import { Avatar } from "./Avatar";
import { Home, Search, PlusSquare, Heart, MessageCircle } from "lucide-react";

interface Props {
  onCreatePost: () => void;
}

function ReelsIcon({ active = false }: { active?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={active ? "/reels_icon_active.png" : "/reels_icon.png"}
      alt=""
      width={24}
      height={24}
      style={{ objectFit: "contain", display: "block", mixBlendMode: active ? "multiply" : "normal" }}
    />
  );
}

export function BottomNav({ onCreatePost }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await notificationsApi.unreadCount();
        setUnreadCount(res.data.unread_count ?? res.data.count ?? 0);
      } catch { /* ignore */ }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-12 bg-white border-t border-[#dbdbdb] flex items-center justify-around px-4 z-[60] lg:hidden">
      <Link href="/" className={pathname === "/" ? "text-black" : "text-[#262626]"}>
        <Home size={24} strokeWidth={pathname === "/" ? 2.5 : 1.5} />
      </Link>
      <Link href="/reels">
        <ReelsIcon active={pathname === "/reels"} />
      </Link>
      <Link href="/explore">
        <Search size={24} strokeWidth={pathname === "/explore" ? 2.5 : 1.5} />
      </Link>
      <button type="button" onClick={onCreatePost}>
        <PlusSquare size={24} strokeWidth={1.5} />
      </button>
      <Link href="/notifications" className="relative">
        <Heart size={24} strokeWidth={pathname === "/notifications" ? 2.5 : 1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#ed4956] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      <Link href="/dm">
        <MessageCircle size={24} strokeWidth={pathname === "/dm" ? 2.5 : 1.5} />
      </Link>
      {user && (
        <Link href={`/profile/${user.username}`}>
          <Avatar src={user.profile_img} username={user.username} size={24} />
        </Link>
      )}
    </nav>
  );
}
