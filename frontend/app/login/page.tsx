"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "ユーザー名またはパスワードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-[350px]">
        {/* ロゴ */}
        <div className="bg-white border border-[#dbdbdb] rounded px-10 py-12 mb-3">
          <h1 className="text-center font-bold text-3xl mb-8" style={{ fontFamily: "Billabong, cursive" }}>
            Instagram
          </h1>

          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="ユーザー名またはメールアドレス"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck={false}
              required
              className="w-full bg-[#fafafa] border border-[#dbdbdb] rounded px-2 py-2 text-sm focus:outline-none focus:border-[#a8a8a8]"
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-[#fafafa] border border-[#dbdbdb] rounded px-2 py-2 text-sm focus:outline-none focus:border-[#a8a8a8]"
            />
            {error && <p className="text-[#ed4956] text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-[#0095f6] text-white font-semibold text-sm rounded py-1.5 mt-2 disabled:opacity-50 hover:bg-[#1877f2] transition-colors"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-[#dbdbdb]" />
            <span className="px-4 text-[#8e8e8e] text-xs font-semibold">または</span>
            <div className="flex-1 h-px bg-[#dbdbdb]" />
          </div>
        </div>

        {/* 登録リンク */}
        <div className="bg-white border border-[#dbdbdb] rounded py-4 text-center text-sm">
          アカウントをお持ちでないですか？{" "}
          <Link href="/register" className="text-[#0095f6] font-semibold">
            登録する
          </Link>
        </div>
      </div>
    </div>
  );
}
