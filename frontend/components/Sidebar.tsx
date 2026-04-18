"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { notificationsApi, searchApi } from "@/lib/api";
import { Avatar } from "./Avatar";
import { LogOut, X } from "lucide-react";

interface Props {
  onCreatePost: () => void;
}

/* ─── Instagram カメラロゴ ─── */
function InstagramLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="5.25" ry="5.25" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.005 16.545a2.997 2.997 0 015.99 0V22h6V11.543L12 2 3 11.543V22h6.005z" />
    </svg>
  );
}

function IconReels({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <polygon points="9,7.5 9,16.5 17.5,12" />
    </svg>
  );
}

function IconMessages({ active }: { active: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/plane_icon.png" alt="メッセージ" width={24} height={24} style={{ opacity: active ? 1 : 0.85 }} />
  );
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function IconExplore({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
    </svg>
  );
}

function IconHeart({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function IconCreate() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function IconMetaApps() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/meta_apps_icon.png" alt="その他のMeta製アプリ" width={24} height={24} />
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
    <div className="fixed top-0 left-[72px] h-full w-[397px] bg-white border-r border-[#dbdbdb] z-[58] flex flex-col">
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

/* ─── Sidebar 本体 ─── */
export function Sidebar({ onCreatePost }: Props) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState(true);
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

  /* 検索パネル開放中はサイドバーを細いまま固定 */
  const isExpanded = expanded && !searchOpen;

  const lc = `whitespace-nowrap overflow-hidden transition-all duration-200 text-[16px] leading-none ${
    isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0"
  }`;

  const itemClass = (active: boolean) =>
    `flex h-14 items-center gap-4 px-3 rounded-xl text-[16px] hover:bg-[#f3f3f3] transition-colors ${
      active ? "font-bold" : "font-normal"
    }`;

  return (
    <>
      <nav
        onMouseEnter={() => { setExpanded(false); }}
        onMouseLeave={() => { if (!searchOpen) setExpanded(true); setMoreOpen(false); }}
        className={`fixed top-0 left-0 h-full border-r border-[#dbdbdb] bg-white px-3 py-4 flex flex-col z-[60] transition-[width] duration-200 overflow-hidden ${
          isExpanded ? "w-[244px]" : "w-[72px]"
        }`}
      >
        {/* ロゴ */}
        <Link href="/" className="px-3 py-3 mb-[88px] flex items-center gap-4">
          <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-[#262626]">
            <InstagramLogo />
          </div>
        </Link>

        {/* メインナビ */}
        <div className="flex-1 flex flex-col gap-1">

          {/* ホーム */}
          <Link href="/" className={itemClass(pathname === "/" && !searchOpen)}>
            <div className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconHome active={pathname === "/" && !searchOpen} />
            </div>
            <span className={lc}>ホーム</span>
          </Link>

          {/* リール動画 */}
          <Link href="/reels" className={itemClass(pathname === "/reels" && !searchOpen)}>
            <div className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconReels active={pathname === "/reels" && !searchOpen} />
            </div>
            <span className={lc}>リール動画</span>
          </Link>

          {/* メッセージ */}
          <Link href="/dm" className={itemClass(pathname === "/dm" && !searchOpen)}>
            <div className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconMessages active={pathname === "/dm" && !searchOpen} />
            </div>
            <span className={lc}>メッセージ</span>
          </Link>

          {/* 検索 */}
          <button
            onClick={handleSearchToggle}
            className={itemClass(searchOpen) + " w-full text-left"}
          >
            <div className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconSearch active={searchOpen} />
            </div>
            <span className={lc}>検索</span>
          </button>

          {/* 発見 */}
          <Link href="/explore" className={itemClass(pathname === "/explore" && !searchOpen)}>
            <div className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconExplore active={pathname === "/explore" && !searchOpen} />
            </div>
            <span className={lc}>発見</span>
          </Link>

          {/* お知らせ */}
          <Link href="/notifications" className={itemClass(pathname === "/notifications" && !searchOpen)}>
            <div className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconHeart active={pathname === "/notifications" && !searchOpen} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ed4956] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={lc}>お知らせ</span>
          </Link>

          {/* 作成 */}
          <button onClick={onCreatePost} className={itemClass(false) + " w-full text-left"}>
            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconCreate />
            </div>
            <span className={lc}>作成</span>
          </button>

          {/* プロフィール */}
          {user && (
            <Link
              href={`/profile/${user.username}`}
              className={itemClass(pathname === `/profile/${user.username}` && !searchOpen)}
            >
              <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                <Avatar src={user.profile_img} username={user.username} size={24} />
              </div>
              <span className={lc}>プロフィール</span>
            </Link>
          )}
        </div>

        {/* ボトムセクション */}
        <div className="flex flex-col gap-1 mt-2">

          {/* その他 */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={itemClass(false) + " w-full text-left"}
            >
              <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                <IconMore />
              </div>
              <span className={lc}>その他</span>
            </button>

            {moreOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-[220px] bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#dbdbdb] overflow-hidden z-50">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-[#f5f5f5] transition-colors text-left"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                  <span>ログアウト</span>
                </button>
              </div>
            )}
          </div>

          {/* その他のMeta製アプリ */}
          <button className={itemClass(false) + " w-full text-left"}>
            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
              <IconMetaApps />
            </div>
            <span className={`${lc} text-[15px]`}>その他のMeta製ア...</span>
          </button>
        </div>
      </nav>

      {/* 検索パネル */}
      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}

      {/* 検索パネル外クリックで閉じる */}
      {searchOpen && (
        <div className="fixed inset-0 z-[57]" onClick={() => setSearchOpen(false)} />
      )}

      {moreOpen && (
        <div className="fixed inset-0 z-[59]" onClick={() => setMoreOpen(false)} />
      )}
    </>
  );
}
