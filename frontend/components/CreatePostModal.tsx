"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  ChevronLeft,
  Smile,
  MapPin,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Crop,
  Maximize2,
  Copy,
} from "lucide-react";
import { postsApi, mediaApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./Avatar";

type Step = "select" | "crop" | "caption" | "sharing" | "done";
type Ratio = "1:1" | "4:5" | "16:9";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePostModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [altText, setAltText] = useState("");
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [isDragging, setIsDragging] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- file handling ---- */
  const applyFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("crop");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) applyFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /* ---- share ---- */
  const handleShare = async () => {
    setUploadError("");
    setStep("sharing");
    try {
      let mediaUrl = "";
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("media_type", file.type.startsWith("video/") ? "video" : "image");
        const res = await mediaApi.upload(formData);
        const raw: string = res.data.url ?? res.data.media_url ?? "";
        mediaUrl = raw.startsWith("/") ? `http://localhost:8888${raw}` : raw;
      }
      if (!mediaUrl) {
        setUploadError("画像のアップロードに失敗しました。再度お試しください。");
        setStep("caption");
        return;
      }
      await postsApi.create({
        caption,
        location,
        media_type: file?.type.startsWith("video/") ? "video" : "photo",
        media_files: [{ media_url: mediaUrl, media_order: 1 }],
      });
      onCreated();
      setStep("done");
    } catch {
      setUploadError("投稿に失敗しました。再度お試しください。");
      setStep("caption");
    }
  };

  /* ---- navigation ---- */
  const goBack = () => {
    if (step === "crop") {
      setFile(null);
      setPreviewUrl("");
      setStep("select");
    } else if (step === "caption") {
      setStep("crop");
    }
  };

  /* ---- layout ---- */
  const isWide = step === "caption";
  const ratioStyle: React.CSSProperties =
    ratio === "1:1"
      ? { aspectRatio: "1 / 1" }
      : ratio === "4:5"
      ? { aspectRatio: "4 / 5" }
      : { aspectRatio: "16 / 9" };

  const TITLES: Record<Step, string> = {
    select: "新しい投稿を作成",
    crop: "切り取り",
    caption: "新しい投稿を作成",
    sharing: "シェア中",
    done: "",
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white w-full overflow-hidden transition-all duration-300"
        style={{
          maxWidth: isWide ? "900px" : "500px",
          borderRadius: "12px",
        }}
      >
        {/* ─── Header ─── */}
        {step !== "done" && (
          <div
            className="flex items-center justify-between px-4 border-b border-[#dbdbdb]"
            style={{ height: "44px" }}
          >
            {/* Left button */}
            {(step === "crop" || step === "caption") ? (
              <button
                onClick={goBack}
                className="text-[#262626] hover:text-[#8e8e8e] transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            ) : step === "select" ? (
              <button
                onClick={onClose}
                className="text-[#262626] hover:text-[#8e8e8e] transition-colors"
              >
                <X size={20} />
              </button>
            ) : (
              <div className="w-6" />
            )}

            {/* Title */}
            <span className="font-semibold text-sm">{TITLES[step]}</span>

            {/* Right button */}
            {step === "crop" && (
              <button
                onClick={() => setStep("caption")}
                className="text-[#0095f6] font-semibold text-sm hover:text-[#1877f2]"
              >
                次へ
              </button>
            )}
            {step === "caption" && (
              <button
                onClick={handleShare}
                className="text-[#0095f6] font-semibold text-sm hover:text-[#1877f2]"
              >
                シェア
              </button>
            )}
            {(step === "select" || step === "sharing") && <div className="w-10" />}
          </div>
        )}

        {/* ─── Step: Select ─── */}
        {step === "select" && (
          <div
            className={`flex flex-col items-center justify-center gap-5 transition-colors`}
            style={{
              minHeight: "380px",
              padding: "48px 32px",
              background: isDragging ? "#e8f4fd" : "#fff",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
          >
            {/* Illustration */}
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
              <rect x="6" y="20" width="42" height="36" rx="3" stroke="#262626" strokeWidth="2.5" fill="none"/>
              <rect x="32" y="26" width="42" height="36" rx="3" stroke="#262626" strokeWidth="2.5" fill="white"/>
              <circle cx="47" cy="38" r="5.5" stroke="#262626" strokeWidth="2.5"/>
              <path d="M33 58 41 48 47 55 53 48 62 58" stroke="#262626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>

            <p className="text-xl text-[#262626]">写真や動画をここにドラッグ</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,video/mp4,video/quicktime"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#0095f6] text-white font-semibold text-sm px-5 py-2 rounded-lg hover:bg-[#1877f2] transition-colors"
            >
              コンピューターから選択
            </button>
          </div>
        )}

        {/* ─── Step: Crop ─── */}
        {step === "crop" && previewUrl && (
          <div>
            {/* Preview */}
            <div className="relative bg-black overflow-hidden" style={{ ...ratioStyle, maxHeight: "520px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Ratio toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#dbdbdb]">
              <div className="flex items-center gap-1">
                {/* 1:1 */}
                <button
                  onClick={() => setRatio("1:1")}
                  title="正方形"
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${ratio === "1:1" ? "text-[#0095f6]" : "text-[#8e8e8e] hover:text-[#262626]"}`}
                >
                  <Crop size={20} />
                  <span className="text-[10px] font-medium">1:1</span>
                </button>
                {/* 4:5 */}
                <button
                  onClick={() => setRatio("4:5")}
                  title="縦長"
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${ratio === "4:5" ? "text-[#0095f6]" : "text-[#8e8e8e] hover:text-[#262626]"}`}
                >
                  <Maximize2 size={20} style={{ transform: "rotate(90deg)" }} />
                  <span className="text-[10px] font-medium">4:5</span>
                </button>
                {/* 16:9 */}
                <button
                  onClick={() => setRatio("16:9")}
                  title="横長"
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${ratio === "16:9" ? "text-[#0095f6]" : "text-[#8e8e8e] hover:text-[#262626]"}`}
                >
                  <Maximize2 size={20} />
                  <span className="text-[10px] font-medium">16:9</span>
                </button>
              </div>
              <button
                className="text-[#8e8e8e] hover:text-[#262626] transition-colors p-2"
                title="複数選択"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Step: Caption ─── */}
        {step === "caption" && previewUrl && (
          <div className="flex" style={{ maxHeight: "600px" }}>
            {/* Left: image */}
            <div className="flex-shrink-0 bg-black overflow-hidden" style={{ width: "50%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full object-cover"
                style={{ ...ratioStyle, maxHeight: "600px" }}
              />
            </div>

            {/* Right: form */}
            <div className="flex-1 flex flex-col overflow-y-auto border-l border-[#dbdbdb]">
              {/* User */}
              <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
                <Avatar src={user?.profile_img} username={user?.username} size={32} />
                <span className="font-semibold text-sm">{user?.username}</span>
              </div>
              {uploadError && (
                <p className="mx-4 mb-2 text-xs text-[#ed4956] bg-[#fff0f1] rounded px-3 py-2">{uploadError}</p>
              )}

              {/* Caption textarea */}
              <div className="px-4 flex-1 min-h-0">
                <textarea
                  placeholder="キャプションを入力..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                  className="w-full text-sm resize-none outline-none placeholder-[#8e8e8e] leading-5"
                  style={{ minHeight: "140px" }}
                />
                <div className="flex items-center justify-between py-2 border-b border-[#dbdbdb]">
                  <button className="text-[#8e8e8e] hover:text-[#262626] transition-colors">
                    <Smile size={20} />
                  </button>
                  <span className="text-xs text-[#8e8e8e]">{caption.length}/2,200</span>
                </div>
              </div>

              {/* Location */}
              <div
                className="flex items-center justify-between px-4 border-b border-[#dbdbdb] flex-shrink-0"
                style={{ height: "44px" }}
              >
                <input
                  type="text"
                  placeholder="場所を追加"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 text-sm outline-none placeholder-[#8e8e8e]"
                />
                <MapPin size={20} className="text-[#8e8e8e] flex-shrink-0" />
              </div>

              {/* Collaborator */}
              <div
                className="flex items-center justify-between px-4 border-b border-[#dbdbdb] flex-shrink-0"
                style={{ height: "44px" }}
              >
                <span className="text-sm text-[#262626]">コラボレーターを追加</span>
                <UserPlus size={20} className="text-[#8e8e8e]" />
              </div>

              {/* Accessibility */}
              <div className="border-b border-[#dbdbdb] flex-shrink-0">
                <button
                  onClick={() => setShowAccessibility((v) => !v)}
                  className="flex items-center justify-between w-full px-4 text-sm"
                  style={{ height: "44px" }}
                >
                  <span>アクセシビリティ</span>
                  {showAccessibility ? (
                    <ChevronUp size={16} className="text-[#8e8e8e]" />
                  ) : (
                    <ChevronDown size={16} className="text-[#8e8e8e]" />
                  )}
                </button>
                {showAccessibility && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-[#8e8e8e] mb-2 leading-4">
                      代替テキストは視覚に障害のある人々のために写真の説明を自動作成します。
                    </p>
                    <input
                      type="text"
                      placeholder="代替テキストを入力..."
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      className="w-full border border-[#dbdbdb] rounded px-3 py-2 text-sm outline-none focus:border-[#a8a8a8]"
                    />
                  </div>
                )}
              </div>

              {/* Advanced settings */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center justify-between w-full px-4 text-sm"
                  style={{ height: "44px" }}
                >
                  <span>詳細設定</span>
                  {showAdvanced ? (
                    <ChevronUp size={16} className="text-[#8e8e8e]" />
                  ) : (
                    <ChevronDown size={16} className="text-[#8e8e8e]" />
                  )}
                </button>
                {showAdvanced && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">コメントをオフにする</span>
                      <div className="w-10 h-6 bg-[#dbdbdb] rounded-full cursor-not-allowed" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">いいね！数とビュー数を非表示</span>
                      <div className="w-10 h-6 bg-[#dbdbdb] rounded-full cursor-not-allowed" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step: Sharing ─── */}
        {step === "sharing" && (
          <div
            className="flex flex-col items-center justify-center gap-5"
            style={{ minHeight: "300px", padding: "48px 32px" }}
          >
            <div className="rainbow-spinner" />
            <p className="font-semibold text-base text-[#262626]">シェア中...</p>
          </div>
        )}

        {/* ─── Step: Done ─── */}
        {step === "done" && (
          <div
            className="flex flex-col items-center justify-center gap-5"
            style={{ padding: "56px 32px" }}
          >
            <div className="rainbow-circle-check">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
                <path
                  d="M10 20l8 8 14-14"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="font-semibold text-xl text-[#262626]">
              投稿がシェアされました。
            </p>
            <button
              onClick={onClose}
              className="text-[#0095f6] font-semibold text-sm mt-1 hover:text-[#1877f2] transition-colors"
            >
              完了
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
