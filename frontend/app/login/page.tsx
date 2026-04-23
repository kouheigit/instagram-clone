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
      <div className="mx-auto flex min-h-screen w-full max-w-[1420px] items-center justify-center px-6 py-10 lg:px-10 lg:py-14">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(640px,0.88fr)] lg:gap-12">
          <section className="min-w-0 px-1 lg:pr-[4.5rem]">
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

          <aside className="flex min-w-0 justify-center border-t border-[#e6e6e6] pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-[3.75rem]">
            <div className="flex w-full max-w-[620px] flex-col justify-center">
              <h2 className="mb-7 text-[1.7rem] leading-tight font-semibold tracking-[-0.03em] text-[#111111]">
                Instagramにログイン
              </h2>

              <form onSubmit={handleSubmit} className="ig-login-form">
                <label className="ig-login-field" data-filled={username ? "true" : "false"}>
                  <span className="ig-login-label">携帯電話番号、ユーザーネームまたはメールアドレス</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    spellCheck={false}
                    required
                    aria-label="ユーザー名またはメールアドレス"
                    className="ig-login-input"
                  />
                </label>
                <label className="ig-login-field" data-filled={password ? "true" : "false"}>
                  <span className="ig-login-label">パスワード</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    aria-label="パスワード"
                    className="ig-login-input"
                  />
                </label>
                {error && <p className="text-center text-xs text-[#ed4956]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="mt-2 min-h-[50px] w-full rounded-full bg-[#9bc4ee] px-4 text-[0.95rem] font-semibold text-white transition hover:bg-[#86b4e4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "ログイン中..." : "ログイン"}
                </button>
              </form>

              <Link href="#" className="mt-5 text-center text-[0.95rem] font-medium text-[#111111]">
                パスワードを忘れた場合
              </Link>

              <div className="my-10 flex items-center gap-4 text-[0.85rem] font-semibold text-[#8d8d8d]">
                <div className="h-px flex-1 bg-[#e5e7eb]" />
                <span>または</span>
                <div className="h-px flex-1 bg-[#e5e7eb]" />
              </div>

              <button
                type="button"
                className="min-h-[50px] w-full rounded-full border border-[#d9dee5] bg-white px-6 text-[0.95rem] font-semibold text-[#1d1d1f] transition hover:bg-[#fafafa]"
              >
                Facebookでログイン
              </button>

              <Link
                href="/register"
                className="mt-4 flex min-h-[50px] items-center justify-center rounded-full border border-[#2d7df6] bg-white px-6 text-[0.95rem] font-semibold text-[#1877f2] transition hover:bg-[#f8fbff]"
              >
                新しいアカウントを作成
              </Link>

              <div className="mt-8 text-center text-[0.9rem] font-semibold tracking-[0.01em] text-[#1f2937]">
                <span className="mr-1 font-extrabold text-[#1877f2]">∞</span>Meta
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
