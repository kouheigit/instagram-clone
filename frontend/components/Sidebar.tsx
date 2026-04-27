"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { notificationsApi, searchApi } from "@/lib/api";
import { Avatar } from "./Avatar";
import { Home, Search, Compass, Heart, Plus, Menu, LogOut, X } from "lucide-react";

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


/* ─── 飛行機アイコン ─── */
function PaperPlaneIcon({ active = false }: { active?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={active ? "/plane_icon_active.png" : "/plane_icon.png"}
      alt=""
      width={21}
      height={21}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}

function ReelsIcon({ active = false }: { active?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={active ? "/reels_icon_filled.png" : "/reels_icon_outline.png"}
      alt=""
      width={20}
      height={20}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}

function HomeIcon({ active = false }: { active?: boolean }) {
  if (active) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src="/home_icon_active.png"
        alt=""
        width={20}
        height={20}
        style={{ objectFit: "contain", display: "block" }}
      />
    );
  }
  return <Home size={20} strokeWidth={2} />;
}

const RECENT_KEY = "ig_recent_searches";

interface RecentItem {
  username: string;
  name?: string;
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
        const users: RecentItem[] = (res.data.users ?? res.data ?? []).map((u: { username: string; name?: string; profile_img?: string }) => ({
          username: u.username,
          name: u.name,
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
    <div className="fixed top-0 left-[73px] h-full w-[397px] bg-white z-[58] flex flex-col" style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.08)" }}>
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
              {item.name && item.name !== item.username && (
                <p className="text-[13px] text-[#8e8e8e] truncate">{item.name}</p>
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
  "w-12 h-12 p-3 rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#f2f2f2] transition-colors duration-150 text-[#262626]";

/* ─── アイコンボタン共通ラッパー（button用） ─── */
function NavBtn({
  children,
  onClick,
  label,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${NAV_ICON_BASE} ig-sidebar-row ${className}`}
    >
      {children}
      {label && <span className="ig-sidebar-label text-[16px]">{label}</span>}
    </button>
  );
}

/* ─── ホバーフライアウトラベル ─── */
function NavFlyout({ children }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div>
      {children}
    </div>
  );
}

/* ─── アイコンラッパー（Link内用・div） ─── */
function NavIcon({
  children,
  label,
  active = false,
  className = "",
}: {
  children: React.ReactNode;
  label?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={`${NAV_ICON_BASE} ig-sidebar-row ${className}`}>
      {children}
      {label && (
        <span className={`ig-sidebar-label text-[16px]${active ? " font-semibold" : ""}`}>
          {label}
        </span>
      )}
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

  const isDm = pathname === "/dm" && !searchOpen;

  const handleSearchToggle = () => {
    setSearchOpen((v) => !v);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        className={searchOpen ? "ig-sidebar ig-sidebar-compact" : "ig-sidebar"}
        style={{
          background: "#FFFFFF",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          display: "flex",
          flexDirection: "column",
          gap: "100px",
          paddingTop: "1px",
          paddingBottom: "20px",
          boxSizing: "border-box",
          zIndex: 60,
          overflow: "hidden",
        }}
      >
        {/* ロゴ */}
        <NavFlyout label="Instagram">
          <Link
            href="/"
            style={{ marginTop: "20px" }}
            className="ig-sidebar-logo text-[#262626] flex items-center rounded-xl hover:bg-[#f2f2f2] transition-colors duration-150"
          >
            <InstagramLogo />
          </Link>
        </NavFlyout>

        {/* メインナビ（gap-1 = 4px） */}
        <div className="ig-sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
          {/* ホーム */}
          <NavFlyout label="ホーム">
            <Link href="/">
              <NavIcon label="ホーム" active={pathname === "/" && !searchOpen}>
                <HomeIcon active={pathname === "/" && !searchOpen} />
              </NavIcon>
            </Link>
          </NavFlyout>

          {/* リール */}
          <NavFlyout label="リール">
            <Link href="/reels">
              <NavIcon label="リール" active={pathname === "/reels" && !searchOpen}>
                <ReelsIcon active={pathname === "/reels" && !searchOpen} />
              </NavIcon>
            </Link>
          </NavFlyout>

          {/* メッセージ（飛行機アイコン：非アクティブ=SVGアウトライン、アクティブ=plane_icon.png） */}
          <NavFlyout label="メッセージ">
            <Link href="/dm">
              <NavIcon label="メッセージ" active={isDm}>
                <PaperPlaneIcon active={isDm} />
              </NavIcon>
            </Link>
          </NavFlyout>

          {/* 検索 */}
          <NavFlyout label="検索">
            <NavBtn onClick={handleSearchToggle} label="検索">
              <Search size={24} strokeWidth={searchOpen ? 2.5 : 1.75} />
            </NavBtn>
          </NavFlyout>

          {/* 発見 */}
          <NavFlyout label="発見">
            <Link href="/explore">
              <NavIcon label="発見" active={pathname === "/explore" && !searchOpen}>
                <Compass size={24} strokeWidth={pathname === "/explore" && !searchOpen ? 2.5 : 1.75} />
              </NavIcon>
            </Link>
          </NavFlyout>

          {/* ハート（お知らせ） */}
          <NavFlyout label="お知らせ">
            <Link href="/notifications">
              <NavIcon label="お知らせ" active={pathname === "/notifications" && !searchOpen} className="relative">
                <Heart size={24} strokeWidth={pathname === "/notifications" && !searchOpen ? 2.5 : 1.75} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#ed4956] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none pointer-events-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavIcon>
            </Link>
          </NavFlyout>

          {/* 投稿作成 */}
          <NavFlyout label="作成">
            <NavBtn onClick={onCreatePost} label="作成">
              <Plus size={24} strokeWidth={1.75} />
            </NavBtn>
          </NavFlyout>

          {/* プロフィールアバター */}
          {user && (
            <NavFlyout label={user.username}>
              <Link
                href={`/profile/${user.username}`}
                className="ig-sidebar-profile block rounded-xl hover:bg-[#f2f2f2] transition-colors duration-150"
              >
                <div className="flex items-center gap-4">
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
                  <span className="ig-sidebar-label text-[16px] text-[#262626]">{user.username}</span>
                </div>
              </Link>
            </NavFlyout>
          )}
        </div>

        {/* 下部固定エリア */}
        <div
          className="ig-sidebar-nav"
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {/* ハンバーガーメニュー */}
          <div className="relative" style={{ marginBottom: "4px" }}>
            <NavFlyout label="その他">
              <NavBtn onClick={() => setMoreOpen((v) => !v)} label="その他">
                <Menu size={24} strokeWidth={1.75} />
              </NavBtn>
            </NavFlyout>
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

          {/* その他のMeta製アプリ（グリッドアイコン・ノータッチ） */}
          <div style={{ marginBottom: "20px" }}>
            <NavFlyout label="その他のMeta製アプリ">
              <NavBtn label="その他のMeta製アプリ">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/meta_apps_icon.png"
                  alt="その他のMeta製アプリ"
                  style={{ width: "24px", height: "24px", objectFit: "contain" }}
                />
              </NavBtn>
            </NavFlyout>
          </div>
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
