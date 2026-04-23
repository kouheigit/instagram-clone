"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const heroImages = ["/login/instagram.webp", "/login/profile2.webp"];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(heroImages[0]);

  useEffect(() => {
    const selected = heroImages[Math.floor(Math.random() * heroImages.length)];
    setSelectedImage(selected);
  }, []);

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
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1220px] items-center justify-center px-6 py-10 lg:px-10 lg:py-14">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.17fr)_minmax(420px,0.99fr)] lg:gap-12">
          <section className="min-w-0 px-1 lg:pr-14">
            <div className="mx-auto max-w-[640px]">
              <div
                className="mb-8 text-[42px] leading-none font-bold tracking-[-0.04em] text-black sm:text-[58px]"
                style={{ fontFamily: "Billabong, cursive" }}
              >
                Instagram
              </div>

              <h1 className="mb-6 text-[2.5rem] leading-[0.98] font-bold tracking-[-0.06em] text-[#111827] sm:text-[3.4rem] lg:text-[4.25rem]">
                <span className="bg-[linear-gradient(90deg,#f58529_0%,#feda77_18%,#dd2a7b_44%,#8134af_70%,#515bd4_100%)] bg-clip-text text-transparent">
                  親しい友達
                </span>
                の日常の瞬間を見て
                <br />
                みよう。
              </h1>

              <div className="flex min-h-[360px] w-full items-center justify-center px-2 py-3 sm:min-h-[420px] lg:min-h-[500px]">
                <img
                  src={selectedImage}
                  alt="Instagram visual"
                  className="block max-h-[68vh] w-full max-w-[620px] object-contain object-center drop-shadow-[0_30px_40px_rgba(0,0,0,0.14)]"
                />
              </div>
            </div>
          </section>

          <aside className="flex min-w-0 justify-center border-t border-[#e5e7eb] pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
            <div className="flex w-full max-w-[420px] flex-col justify-center">
              <h2 className="mb-8 text-[1.9rem] leading-tight font-bold tracking-[-0.03em] text-[#111827]">
                Instagramにログイン
              </h2>

              <form onSubmit={handleSubmit} className="ig-login-form">
                <input
                  type="text"
                  placeholder="携帯電話番号、ユーザーネームまたはメールアドレス"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  spellCheck={false}
                  required
                  aria-label="ユーザー名またはメールアドレス"
                  data-state="active"
                  className="ig-login-input ig-login-input-active"
                />
                <input
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  aria-label="パスワード"
                  data-state="default"
                  className="ig-login-input"
                />
                {error && <p className="text-center text-xs text-[#ed4956]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="mt-2 min-h-[46px] w-full rounded-xl bg-[#0095f6] px-4 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(0,149,246,0.2)] transition hover:bg-[#1877f2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "ログイン中..." : "ログイン"}
                </button>
              </form>

              <Link href="#" className="mt-3 text-center text-sm text-[#00376b]">
                パスワードを忘れた場合
              </Link>

              <div className="my-6 flex items-center gap-4 text-[11px] font-semibold tracking-[0.14em] text-[#6b7280]">
                <div className="h-px flex-1 bg-[#e5e7eb]" />
                <span>または</span>
                <div className="h-px flex-1 bg-[#e5e7eb]" />
              </div>

              <button
                type="button"
                className="min-h-[46px] w-full rounded-xl bg-[#1877f2] px-4 text-[15px] font-semibold text-white transition hover:bg-[#166fe5]"
              >
                Facebookでログイン
              </button>

              <Link
                href="/register"
                className="mt-3 flex min-h-[46px] items-center justify-center rounded-xl border border-[#e6eaf2] bg-[#f5f7fb] px-4 text-[15px] font-semibold text-[#111827] transition hover:bg-[#eef2f8]"
              >
                新しいアカウントを作成
              </Link>

              <div className="mt-7 text-center text-[1.05rem] font-bold tracking-[0.02em] text-[#1f2937]">
                <span className="mr-1 font-extrabold text-[#2563eb]">∞</span>Meta
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="px-6 pb-6 text-center text-[12px] leading-6 text-[#737373]">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <Link href="#">Meta</Link>
          <Link href="#">概要</Link>
          <Link href="#">ブログ</Link>
          <Link href="#">求人</Link>
          <Link href="#">ヘルプ</Link>
          <Link href="#">API</Link>
          <Link href="#">プライバシー</Link>
          <Link href="#">利用規約</Link>
          <Link href="#">位置情報</Link>
          <Link href="#">Instagram Lite</Link>
          <Link href="#">Threads</Link>
          <Link href="#">連絡先のアップロードと非ユーザー</Link>
          <Link href="#">Meta Verified</Link>
          <Link href="#">日本語</Link>
          <span>© 2026 Instagram from Meta</span>
        </div>
      </footer>
    </main>
  );
}
