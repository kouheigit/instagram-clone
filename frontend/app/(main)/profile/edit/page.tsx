"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usersApi, mediaApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";

export default function ProfileEditPage() {
  const { user: me, refresh } = useAuth();
  const router = useRouter();

  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [gender, setGender] = useState("male");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [profileImg, setProfileImg] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setBio(me.bio ?? "");
      setWebsite(me.website ?? "");
      setGender(me.gender ?? "male");
      setShowSuggestions(me.show_account_suggestions ?? true);
      setProfileImg(me.profile_img ?? "");
      setIsPrivate(me.is_private);
    }
  }, [me]);

  const validateWebsite = (url: string): boolean => {
    if (!url) return true;
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebsiteError("");

    if (website && !validateWebsite(website)) {
      setWebsiteError("有効なURLを入力してください（例: https://example.com）");
      return;
    }

    setLoading(true);
    try {
      await usersApi.updateMe({
        bio,
        website,
        gender,
        show_account_suggestions: showSuggestions,
        profile_img: profileImg,
        is_private: isPrivate,
      });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("media_type", "image");
      const res = await mediaApi.upload(formData);
      const raw: string = res.data.url ?? res.data.media_url ?? "";
      const url = raw.startsWith("/") ? `http://localhost:8888${raw}` : raw;
      setProfileImg(url);
    } catch {
      setProfileImg(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword !== confirmPassword) {
      setPwError("新しいパスワードが一致しません");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("パスワードは8文字以上で入力してください");
      return;
    }
    setPwLoading(true);
    try {
      await usersApi.changePassword(oldPassword, newPassword);
      setPwSaved(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 3000);
    } catch {
      setPwError("現在のパスワードが正しくありません");
    } finally {
      setPwLoading(false);
    }
  };

  if (!me) return null;

  return (
    <div className="max-w-[600px] mx-auto px-4 pt-4 pb-16">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-base flex-1">プロフィールを編集</h1>
      </div>

      {/* ユーザー情報エリア */}
      <div className="flex items-center gap-4 mb-8 bg-[#fafafa] rounded-2xl px-4 py-3">
        <div className="flex-shrink-0">
          <Avatar
            src={profileImg || me.profile_img}
            username={me.username}
            size={undefined as unknown as number}
            className="w-14 h-14 rounded-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#262626] truncate">{me.username}</p>
          <p className="text-[#8e8e8e] text-xs truncate">{me.username}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 px-4 py-1.5 bg-[#0095f6] text-white font-semibold text-sm rounded-lg hover:bg-[#1877f2] transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {uploading ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              <span>アップロード中</span>
            </>
          ) : (
            "写真を変更"
          )}
        </button>
      </div>

      <form id="edit-form" onSubmit={handleSubmit} className="space-y-6">

        {/* ウェブサイト */}
        <div>
          <label className="block text-sm font-bold text-[#262626] mb-2">ウェブサイト</label>
          <input
            type="text"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); setWebsiteError(""); }}
            placeholder="ウェブサイト"
            className="w-full border border-[#dbdbdb] rounded-md px-3 py-2 text-sm text-[#262626] outline-none focus:border-[#a8a8a8] transition-colors"
          />
          {websiteError && (
            <p className="text-[#ed4956] text-xs mt-1">{websiteError}</p>
          )}
          <p className="text-[#737373] text-xs mt-2 leading-snug">
            リンクはモバイルデバイスからのみ編集できます。Instagramアプリにアクセスしてプロフィールを編集し、[自己紹介]内のウェブサイトを変更してください。
          </p>
        </div>

        {/* 自己紹介 */}
        <div>
          <label className="block text-sm font-bold text-[#262626] mb-2">自己紹介</label>
          <div className="relative border border-[#dbdbdb] rounded-md focus-within:border-[#a8a8a8] transition-colors">
            <textarea
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= 150) setBio(e.target.value);
              }}
              rows={4}
              placeholder="自己紹介を入力..."
              className="w-full px-3 py-2 text-sm text-[#262626] outline-none resize-none rounded-md"
            />
            <div className="flex justify-end px-3 pb-2">
              <span className={`text-xs ${bio.length >= 145 ? "text-[#ed4956]" : "text-[#737373]"}`}>
                {bio.length} / 150
              </span>
            </div>
          </div>
        </div>

        {/* 性別 */}
        <div>
          <label className="block text-sm font-bold text-[#262626] mb-2">性別</label>
          <div className="relative border border-[#dbdbdb] rounded-md focus-within:border-[#a8a8a8] transition-colors">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-[#262626] outline-none bg-white rounded-md appearance-none cursor-pointer"
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="custom">カスタム</option>
              <option value="prefer_not">回答しない</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#737373]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="text-[#737373] text-xs mt-2">これは公開プロフィールには表示されません。</p>
        </div>

        {/* アカウントのおすすめ表示設定 */}
        <div>
          <label className="block text-sm font-bold text-[#262626] mb-2">
            プロフィールにアカウントのおすすめを表示する
          </label>
          <div className="border border-[#dbdbdb] rounded-md px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#262626] mb-1">
                  プロフィールにアカウントのおすすめを表示する
                </p>
                <p className="text-[#737373] text-xs leading-snug">
                  プロフィールに同じようなアカウントのおすすめを表示するかどうか、また他のプロフィールであなたのプロフィールをおすすめとして表示させるかどうかを選択します。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuggestions((v) => !v)}
                className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${showSuggestions ? "bg-[#0095f6]" : "bg-[#dbdbdb]"}`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${showSuggestions ? "translate-x-6" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 非公開設定 */}
        <div className="flex items-center justify-between py-2 border-b border-[#dbdbdb]">
          <div>
            <p className="text-sm font-semibold text-[#262626]">非公開アカウント</p>
            <p className="text-[#737373] text-xs mt-0.5">承認したフォロワーのみが投稿を見られます</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-12 h-6 rounded-full transition-colors ${isPrivate ? "bg-[#0095f6]" : "bg-[#dbdbdb]"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${isPrivate ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>

        {/* 送信ボタン */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0095f6] text-white font-semibold text-sm rounded-lg hover:bg-[#1877f2] transition-colors disabled:opacity-40"
          >
            {saved ? "保存しました ✓" : loading ? "保存中..." : "送信する"}
          </button>
        </div>
      </form>

      {/* パスワード変更セクション */}
      <div className="mt-10 pt-6 border-t border-[#dbdbdb]">
        <h2 className="font-semibold text-base mb-4 text-[#262626]">パスワードを変更</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#262626] mb-1">現在のパスワード</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="現在のパスワード"
              className="w-full border border-[#dbdbdb] rounded-md px-3 py-2 text-sm outline-none focus:border-[#a8a8a8] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#262626] mb-1">新しいパスワード</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8文字以上"
              className="w-full border border-[#dbdbdb] rounded-md px-3 py-2 text-sm outline-none focus:border-[#a8a8a8] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#262626] mb-1">新しいパスワード（確認）</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワードを再入力"
              className="w-full border border-[#dbdbdb] rounded-md px-3 py-2 text-sm outline-none focus:border-[#a8a8a8] transition-colors"
            />
          </div>
          {pwError && <p className="text-[#ed4956] text-xs">{pwError}</p>}
          {pwSaved && <p className="text-green-600 text-xs">パスワードを変更しました</p>}
          <button
            type="submit"
            disabled={pwLoading || !oldPassword || !newPassword || !confirmPassword}
            className="w-full py-2.5 bg-[#0095f6] text-white font-semibold text-sm rounded-lg hover:bg-[#1877f2] transition-colors disabled:opacity-40"
          >
            {pwLoading ? "変更中..." : "パスワードを変更する"}
          </button>
        </form>
      </div>
    </div>
  );
}
