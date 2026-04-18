"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, PenSquare, X, Search } from "lucide-react";
import Image from "next/image";
import { dmApi, usersApi, searchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import type { Conversation, Message, User, UserIndex } from "@/lib/types";

export default function DmPage() {
  const { user: me } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [partners, setPartners] = useState<Record<string, User>>({});
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  // アバター行用ユーザー（suggestions + following）
  const [contactUsers, setContactUsers] = useState<User[]>([]);

  // サイドバー内検索
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [sidebarResults, setSidebarResults] = useState<UserIndex[]>([]);
  const [sidebarSearching, setSidebarSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 新規DM作成モーダル
  const [showNewDm, setShowNewDm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserIndex[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingDm, setStartingDm] = useState(false);

  // 会話一覧とパートナー情報を取得
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await dmApi.conversations();
        const convs: Conversation[] = res.data.results ?? res.data ?? [];
        setConversations(convs);

        const partnerIds = convs
          .flatMap((c) => c.members)
          .map((m) => m.user_id)
          .filter((id) => id !== me?.user_id);
        const uniqueIds = [...new Set(partnerIds)];
        if (uniqueIds.length > 0) {
          const uRes = await usersApi.byIds(uniqueIds);
          const map: Record<string, User> = {};
          for (const u of uRes.data as User[]) map[u.user_id] = u;
          setPartners(map);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
  }, [me]);

  // アバター行：suggestions（ユーザー名不要）+ following でポピュレート
  useEffect(() => {
    const fetchContacts = async () => {
      const seen = new Set<string>();
      const result: User[] = [];

      // 1. suggestions（ユーザー名不要、即時取得可能）
      try {
        const r = await usersApi.suggestions();
        for (const u of (r.data ?? []) as User[]) {
          if (!seen.has(u.user_id)) { seen.add(u.user_id); result.push(u); }
        }
      } catch { /* ignore */ }

      // 2. following（me.username が必要）
      if (me?.username) {
        try {
          const r = await usersApi.following(me.username);
          const list: User[] = r.data.results ?? r.data ?? [];
          for (const u of list) {
            if (!seen.has(u.user_id)) { seen.add(u.user_id); result.push(u); }
          }
        } catch { /* ignore */ }
      }

      setContactUsers(result);
    };
    fetchContacts();
  }, [me]);

  // パートナーが揃ったらアバター行に追加
  useEffect(() => {
    if (Object.keys(partners).length === 0) return;
    setContactUsers((prev) => {
      const seen = new Set(prev.map((u) => u.user_id));
      const extra: User[] = Object.values(partners).filter((u) => !seen.has(u.user_id));
      return extra.length > 0 ? [...extra, ...prev] : prev;
    });
  }, [partners]);

  const handleSidebarSearch = (q: string) => {
    setSidebarQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSidebarResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSidebarSearching(true);
      try {
        const res = await searchApi.search(q);
        setSidebarResults(res.data.users ?? []);
      } catch { /* ignore */ } finally {
        setSidebarSearching(false);
      }
    }, 300);
  };

  const openConversation = async (conv: Conversation) => {
    setSelected(conv);
    try {
      const res = await dmApi.messages(conv.conversation_id);
      setMessages(res.data.results ?? res.data ?? []);
      await dmApi.markRead(conv.conversation_id);
    } catch { /* ignore */ }
  };

  // 5秒ポーリング
  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(async () => {
      try {
        const res = await dmApi.messages(selected.conversation_id);
        setMessages(res.data.results ?? res.data ?? []);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [selected]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !text.trim()) return;
    try {
      const res = await dmApi.send(selected.conversation_id, text);
      setMessages((m) => [...m, res.data]);
      setText("");
    } catch { /* ignore */ }
  };

  const getPartner = (conv: Conversation): User | undefined => {
    const partnerId = conv.members.find((m) => m.user_id !== me?.user_id)?.user_id;
    return partnerId ? partners[partnerId] : undefined;
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await searchApi.search(q);
      setSearchResults(res.data.users ?? []);
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  };

  const handleStartDm = async (userId: string) => {
    setStartingDm(true);
    try {
      const res = await dmApi.start(userId);
      const newConv: Conversation = res.data;
      setShowNewDm(false);
      setSearchQuery("");
      setSearchResults([]);
      setSidebarQuery("");
      setSidebarResults([]);
      const convsRes = await dmApi.conversations();
      const convs: Conversation[] = convsRes.data.results ?? convsRes.data ?? [];
      setConversations(convs);
      const partnerIds = convs.flatMap((c) => c.members).map((m) => m.user_id).filter((id) => id !== me?.user_id);
      const uniqueIds = [...new Set(partnerIds)];
      if (uniqueIds.length > 0) {
        const uRes = await usersApi.byIds(uniqueIds);
        const map: Record<string, User> = {};
        for (const u of uRes.data as User[]) map[u.user_id] = u;
        setPartners(map);
      }
      const found = convs.find((c) => c.conversation_id === newConv.conversation_id) ?? newConv;
      openConversation(found);
    } catch { /* ignore */ } finally {
      setStartingDm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-48px)] lg:h-screen max-w-[935px] mx-auto">

      {/* 左カラム：会話リスト */}
      <div className={`w-full lg:w-[350px] border-r border-[#dbdbdb] flex flex-col ${selected ? "hidden lg:flex" : "flex"}`}>

        {/* ヘッダー */}
        <div className="px-4 py-4 border-b border-[#dbdbdb] flex items-center justify-between">
          <h1 className="font-semibold text-base">{me?.username}</h1>
          <button
            onClick={() => setShowNewDm(true)}
            className="text-[#262626] hover:text-[#8e8e8e] transition-colors"
            title="新しいメッセージ"
          >
            <PenSquare size={22} />
          </button>
        </div>

        {/* 検索バー */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 bg-[#efefef] rounded-lg px-3 py-2">
            <Search size={14} className="text-[#8e8e8e] shrink-0" />
            <input
              type="text"
              placeholder="検索"
              value={sidebarQuery}
              onChange={(e) => handleSidebarSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder-[#8e8e8e]"
            />
            {sidebarQuery && (
              <button onClick={() => { setSidebarQuery(""); setSidebarResults([]); }}>
                <X size={14} className="text-[#8e8e8e]" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sidebarQuery ? (
            /* 検索結果インライン表示 */
            <>
              {sidebarSearching ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
                </div>
              ) : sidebarResults.length === 0 ? (
                <p className="text-center text-[#8e8e8e] text-sm py-6">ユーザーが見つかりません</p>
              ) : (
                sidebarResults.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => handleStartDm(u.user_id)}
                    disabled={startingDm}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors text-left"
                  >
                    <Avatar src={u.profile_img} username={u.username} size={44} />
                    <div>
                      <p className="font-semibold text-sm">{u.username}</p>
                      {u.bio && <p className="text-[#8e8e8e] text-xs truncate max-w-[200px]">{u.bio}</p>}
                    </div>
                  </button>
                ))
              )}
            </>
          ) : (
            <>
              {/* フォロー中／提案ユーザーのアバター横スクロール */}
              {contactUsers.length > 0 && (
                <div className="py-4 border-b border-[#dbdbdb]">
                  <div
                    className="flex gap-4 px-4 overflow-x-auto"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {contactUsers.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => handleStartDm(u.user_id)}
                        disabled={startingDm}
                        className="flex flex-col items-center gap-1.5 shrink-0"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[#dbdbdb]">
                          <Avatar src={u.profile_img} username={u.username} size={56} />
                        </div>
                        <span className="text-xs text-[#262626] w-14 truncate text-center">{u.username}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 会話リスト */}
              {conversations.length > 0 && (
                <div className="flex items-center justify-between px-4 pt-4 pb-1">
                  <p className="text-sm font-semibold text-[#262626]">メッセージ</p>
                  <button className="text-xs font-semibold text-[#0095f6]">リクエスト</button>
                </div>
              )}
              {conversations.length === 0 ? (
                <p className="text-center text-[#8e8e8e] text-sm mt-8">メッセージがありません</p>
              ) : (
                conversations.map((conv) => {
                  const partner = getPartner(conv);
                  const lastMsg = conv.last_message;
                  return (
                    <button
                      key={conv.conversation_id}
                      onClick={() => openConversation(conv)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors ${
                        selected?.conversation_id === conv.conversation_id ? "bg-[#fafafa]" : ""
                      }`}
                    >
                      <Avatar src={partner?.profile_img} username={partner?.username ?? "?"} size={56} />
                      <div className="text-left min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{partner?.username ?? "不明なユーザー"}</p>
                        {lastMsg && (
                          <p className="text-[#8e8e8e] text-xs truncate max-w-[200px]">
                            {lastMsg.sender_id === me?.user_id ? "あなた: " : ""}
                            {lastMsg.is_deleted ? "このメッセージは削除されました" : lastMsg.content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* 右カラム：メッセージ画面 or 空ステート */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#dbdbdb]">
            <button className="lg:hidden" onClick={() => setSelected(null)}>
              <ArrowLeft size={20} />
            </button>
            {(() => {
              const partner = getPartner(selected);
              return (
                <>
                  <Avatar src={partner?.profile_img} username={partner?.username ?? "?"} size={32} />
                  <span className="font-semibold text-sm">{partner?.username ?? "不明"}</span>
                </>
              );
            })()}
          </div>

          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.map((msg) => (
              <div
                key={msg.message_id}
                className={`flex ${msg.sender_id === me?.user_id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[60%] px-4 py-2 rounded-2xl text-sm ${
                    msg.sender_id === me?.user_id
                      ? "bg-[#0095f6] text-white"
                      : "bg-[#efefef] text-[#262626]"
                  }`}
                >
                  {msg.is_deleted ? (
                    <span className="italic opacity-50">このメッセージは削除されました</span>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 入力欄 */}
          <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3 border-t border-[#dbdbdb]">
            <input
              type="text"
              placeholder="メッセージを入力..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 bg-[#efefef] rounded-full px-4 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="text-[#0095f6] disabled:opacity-40"
            >
              <Image src="/plane_icon.png" alt="送信" width={20} height={20} />
            </button>
          </form>
        </div>
      ) : (
        /* 空ステート（会話未選択） */
        <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-4 text-[#8e8e8e]">
          <div className="w-20 h-20 rounded-full border-2 border-[#262626] flex items-center justify-center">
            <Image src="/plane_icon.png" alt="メッセージ" width={28} height={28} />
          </div>
          <p className="font-semibold text-xl text-[#262626]">メッセージ</p>
          <p className="text-sm text-center px-8">友達やグループに非公開で写真やメッセージを送信できます</p>
          <button
            onClick={() => setShowNewDm(true)}
            className="bg-[#0095f6] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1877f2] transition-colors"
          >
            メッセージを送信
          </button>
        </div>
      )}

      {/* 新規DM作成モーダル */}
      {showNewDm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#dbdbdb]">
              <button onClick={() => { setShowNewDm(false); setSearchQuery(""); setSearchResults([]); }}>
                <X size={20} />
              </button>
              <span className="font-semibold text-sm">新しいメッセージ</span>
              <div className="w-5" />
            </div>

            <div className="p-3 border-b border-[#dbdbdb]">
              <div className="flex items-center gap-2 bg-[#efefef] rounded-lg px-3 py-2">
                <Search size={14} className="text-[#8e8e8e]" />
                <input
                  type="text"
                  placeholder="ユーザーを検索..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {searching && (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-[#dbdbdb] border-t-[#0095f6] rounded-full animate-spin" />
                </div>
              )}
              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => handleStartDm(u.user_id)}
                  disabled={startingDm}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors text-left"
                >
                  <Avatar src={u.profile_img} username={u.username} size={44} />
                  <div>
                    <p className="font-semibold text-sm">{u.username}</p>
                    {u.bio && <p className="text-[#8e8e8e] text-xs truncate max-w-[200px]">{u.bio}</p>}
                  </div>
                </button>
              ))}
              {!searching && searchQuery && searchResults.length === 0 && (
                <p className="text-center text-[#8e8e8e] text-sm py-6">ユーザーが見つかりません</p>
              )}
              {!searching && !searchQuery && (
                <p className="text-center text-[#8e8e8e] text-sm py-6">ユーザー名を検索してください</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
