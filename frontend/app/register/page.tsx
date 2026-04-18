"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.register(form);
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      router.push("/");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(" ");
        setError(msg);
      } else {
        setError("登録に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-[350px]">
        <div className="bg-white border border-[#dbdbdb] rounded px-10 py-12 mb-3">
          <h1 className="text-center font-bold text-3xl mb-2" style={{ fontFamily: "Billabong, cursive" }}>
            Instagram
          </h1>
          <p className="text-center text-[#8e8e8e] font-semibold text-base mb-6 leading-5">
            友達の写真や動画をチェックしよう。
          </p>

          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              placeholder="メールアドレス"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full bg-[#fafafa] border border-[#dbdbdb] rounded px-2 py-2 text-sm focus:outline-none focus:border-[#a8a8a8]"
            />
            <input
              type="text"
              placeholder="ユーザー名"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="w-full bg-[#fafafa] border border-[#dbdbdb] rounded px-2 py-2 text-sm focus:outline-none focus:border-[#a8a8a8]"
            />
            <input
              type="password"
              placeholder="パスワード"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full bg-[#fafafa] border border-[#dbdbdb] rounded px-2 py-2 text-sm focus:outline-none focus:border-[#a8a8a8]"
            />
            {error && <p className="text-[#ed4956] text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !form.username || !form.email || !form.password}
              className="w-full bg-[#0095f6] text-white font-semibold text-sm rounded py-1.5 mt-2 disabled:opacity-50 hover:bg-[#1877f2] transition-colors"
            >
              {loading ? "登録中..." : "登録する"}
            </button>
          </form>
        </div>

        <div className="bg-white border border-[#dbdbdb] rounded py-4 text-center text-sm">
          アカウントをお持ちですか？{" "}
          <Link href="/login" className="text-[#0095f6] font-semibold">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
