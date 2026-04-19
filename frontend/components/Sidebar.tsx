"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { notificationsApi, searchApi } from "@/lib/api";
import { Avatar } from "./Avatar";
import { Home, Search, Compass, Play, Heart, Plus, Menu, LogOut, X } from "lucide-react";

interface Props {
  onCreatePost: () => void;
}

/* ─── Instagram カメラロゴ ─── */
function InstagramLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="5.25" ry="5.25" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}


const RECENT_KEY = "ig_recent_searches";

interface RecentItem {
  username: string;
  display_name?: string;
  profile_img?: string;
}

/* ─── 検索パネル ─── */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecentItem[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecent(JSON.parse(stored));
    } catch { /* ignore */ }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.search(query.trim());
        const users: RecentItem[] = (res.data.users ?? res.data ?? []).map((u: { username: string; display_name?: string; profile_img?: string }) => ({
          username: u.username,
          display_name: u.display_name,
          profile_img: u.profile_img,
        }));
        setResults(users);
      } catch { /* ignore */ }
      setLoading(false);
    }, 350);
  }, [query]);

  const addRecent = (item: RecentItem) => {
    const next = [item, ...recent.filter((r) => r.username !== item.username)].slice(0, 10);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const removeRecent = (username: string) => {
    const next = recent.filter((r) => r.username !== username);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const clearAll = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const handleSelect = (item: RecentItem) => {
    addRecent(item);
    onClose();
    router.push(`/profile/${item.username}`);
  };

  const list = query.trim() ? results : recent;
  const showRecent = !query.trim();

  return (
    <div className="fixed top-0 left-[73px] h-full w-[397px] bg-white border-r border-[#dbdbdb] z-[58] flex flex-col">
      {/* ヘッダー */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <span className="text-[24px] font-bold text-[#262626]">検索</span>
        <button onClick={onClose} className="p-1 hover:bg-[#f3f3f3] rounded-full transition-colors">
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* 検索バー */}
      <div className="px-4 mb-4">
        <div className="flex items-center bg-[#efefef] rounded-lg px-3 py-2 gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] text-[#262626] placeholder-[#8e8e8e] outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[#8e8e8e] hover:text-[#262626]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 区切り線 */}
      <div className="border-t border-[#dbdbdb] mx-0" />

      {/* 最近 ヘッダー */}
      {showRecent && recent.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[16px] font-semibold text-[#262626]">最近</span>
          <button onClick={clearAll} className="text-[14px] font-semibold text-[#0095f6] hover:text-[#00376b]">
            すべてクリア
          </button>
        </div>
      )}

      {/* リスト */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#dbdbdb] border-t-[#262626] rounded-full animate-spin" />
          </div>
        )}

        {!loading && list.length === 0 && query.trim() && (
          <p className="text-center text-[14px] text-[#8e8e8e] mt-8">結果が見つかりません</p>
        )}

        {!loading && list.length === 0 && !query.trim() && (
          <p className="text-center text-[14px] text-[#8e8e8e] mt-8">最近の検索はありません</p>
        )}

        {!loading && list.map((item) => (
          <div
            key={item.username}
            className="flex items-center gap-3 px-4 py-2 hover:bg-[#f7f7f7] cursor-pointer group"
            onClick={() => handleSelect(item)}
          >
            <div className="flex-shrink-0">
              <Avatar src={item.profile_img} username={item.username} size={44} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#262626] truncate">{item.username}</p>
              {item.display_name && (
                <p className="text-[13px] text-[#8e8e8e] truncate">{item.display_name}</p>
              )}
            </div>
            {showRecent && (
              <button
                className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#efefef] rounded-full"
                onClick={(e) => { e.stopPropagation(); removeRecent(item.username); }}
              >
                <X size={16} strokeWidth={2} className="text-[#8e8e8e]" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const NAV_ICON_BASE =
  "w-12 h-12 p-3 rounded-xl flex items-center justify-center cursor-pointer hover:bg-black/5 transition-colors text-[#262626]";

/* ─── アイコンボタン共通ラッパー（button用） ─── */
function NavBtn({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`${NAV_ICON_BASE} ${className}`}>
      {children}
    </button>
  );
}

/* ─── ホバーフライアウトラベル ─── */
function NavFlyout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/flyout">
      {children}
      <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] border border-[#efefef] text-sm font-semibold text-[#262626] whitespace-nowrap pointer-events-none z-[100] opacity-0 -translate-x-1 group-hover/flyout:opacity-100 group-hover/flyout:translate-x-0 transition-all duration-150 ease-out">
        {label}
      </div>
    </div>
  );
}

/* ─── アイコンラッパー（Link内用・div） ─── */
function NavIcon({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${NAV_ICON_BASE} ${className}`}>
      {children}
    </div>
  );
}

/* ─── Sidebar 本体 ─── */
export function Sidebar({ onCreatePost }: Props) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  const handleSearchToggle = () => {
    setSearchOpen((v) => !v);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        style={{
          width: "73px",
          background: "#FFFFFF",
          borderRight: "1px solid #DBDBDB",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "8px",
          paddingBottom: "20px",
          boxSizing: "border-box",
          zIndex: 60,
        }}
      >
        {/* ロゴ */}
        <Link
          href="/"
          style={{ marginTop: "16px", marginBottom: "19px" }}
          className="text-[#262626] flex items-center justify-center w-12 h-12 rounded-xl hover:bg-black/5 transition-colors"
        >
          <InstagramLogo />
        </Link>

        {/* メインナビ（gap-1 = 4px） */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* ホーム */}
          <NavFlyout label="ホーム">
            <Link href="/">
              <NavIcon>
                <Home size={24} strokeWidth={pathname === "/" && !searchOpen ? 2.5 : 1.75} />
              </NavIcon>
            </Link>
          </NavFlyout>

          {/* 検索 */}
          <NavFlyout label="検索">
            <NavBtn onClick={handleSearchToggle}>
              <Search size={24} strokeWidth={searchOpen ? 2.5 : 1.75} />
            </NavBtn>
          </NavFlyout>

          {/* 発見 */}
          <NavFlyout label="発見">
            <Link href="/explore">
              <NavIcon>
                <Compass size={24} strokeWidth={pathname === "/explore" && !searchOpen ? 2.5 : 1.75} />
              </NavIcon>
            </Link>
          </NavFlyout>

          {/* リール */}
          <Link href="/reels">
            <NavIcon>
              <Play size={24} strokeWidth={pathname === "/reels" && !searchOpen ? 2.5 : 1.75} />
            </NavIcon>
          </Link>

          {/* メッセージ（飛行機アイコン・ノータッチ） */}
          <Link href="/dm">
            <NavIcon>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/plane_icon.png"
                alt="メッセージ"
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </NavIcon>
          </Link>

          {/* ハート（お知らせ） */}
          <Link href="/notifications">
            <NavIcon className="relative">
              <Heart size={24} strokeWidth={pathname === "/notifications" && !searchOpen ? 2.5 : 1.75} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ed4956] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none pointer-events-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </NavIcon>
          </Link>

          {/* 投稿作成 */}
          <NavBtn onClick={onCreatePost}>
            <Plus size={24} strokeWidth={1.75} />
          </NavBtn>
        </div>

        {/* 下部固定エリア */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* その他のMeta製アプリ（グリッドアイコン・ノータッチ） */}
          <div style={{ marginBottom: "16px" }}>
            <NavBtn>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/meta_apps_icon.png"
                alt="その他のMeta製アプリ"
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </NavBtn>
          </div>

          {/* ハンバーガーメニュー */}
          <div className="relative" style={{ marginBottom: "16px" }}>
            <NavBtn onClick={() => setMoreOpen((v) => !v)}>
              <Menu size={24} strokeWidth={1.75} />
            </NavBtn>
            {moreOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-[220px] bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#dbdbdb] overflow-hidden z-50">
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-[#f5f5f5] transition-colors text-left text-[#262626]"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                  <span>ログアウト</span>
                </button>
              </div>
            )}
          </div>

          {/* プロフィールアバター */}
          {user && (
            <Link
              href={`/profile/${user.username}`}
              style={{ marginBottom: "20px" }}
              className="block rounded-full hover:opacity-80 transition-opacity"
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                <Avatar src={user.profile_img} username={user.username} size={24} />
              </div>
            </Link>
          )}
        </div>
      </nav>

      {/* 検索パネル */}
      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      {searchOpen && (
        <div className="fixed inset-0 z-[57]" onClick={() => setSearchOpen(false)} />
      )}
      {moreOpen && (
        <div className="fixed inset-0 z-[59]" onClick={() => setMoreOpen(false)} />
      )}
    </>
  );
}
