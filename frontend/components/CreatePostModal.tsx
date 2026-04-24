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
  Film,
} from "lucide-react";
import { postsApi, mediaApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./Avatar";

type Step = "select" | "crop" | "caption" | "sharing" | "done";
type Ratio = "1:1" | "4:5" | "16:9";

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_VIDEO_DURATION_SEC = 60;

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

export function CreatePostModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [altText, setAltText] = useState("");
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [isDragging, setIsDragging] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  /* ---- ファイル選択・バリデーション ---- */
  const applyFile = useCallback((f: File) => {
    setUploadError("");
    const fileIsVideo = f.type.startsWith("video/");

    if (fileIsVideo) {
      // サイズチェック
      if (f.size > MAX_VIDEO_SIZE_BYTES) {
        setUploadError(`動画は${formatBytes(MAX_VIDEO_SIZE_BYTES)}以下にしてください（現在: ${formatBytes(f.size)}）`);
        return;
      }
      // 動画の長さをブラウザで確認
      const url = URL.createObjectURL(f);
      const tmpVideo = document.createElement("video");
      tmpVideo.preload = "metadata";
      tmpVideo.src = url;
      tmpVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const dur = tmpVideo.duration;
        if (dur > MAX_VIDEO_DURATION_SEC) {
          setUploadError(`動画は${MAX_VIDEO_DURATION_SEC}秒以下にしてください（現在: ${formatDuration(dur)}）`);
          return;
        }
        setVideoDuration(dur);
        setFile(f);
        setIsVideo(true);
        setPreviewUrl(URL.createObjectURL(f));
        setStep("crop");
      };
      tmpVideo.onerror = () => {
        URL.revokeObjectURL(url);
        setUploadError("動画ファイルを読み込めませんでした");
      };
    } else {
      setFile(f);
      setIsVideo(false);
      setVideoDuration(null);
      setPreviewUrl(URL.createObjectURL(f));
      setStep("crop");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) applyFile(f);
  }, [applyFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /* ---- 投稿処理 ---- */
  const handleShare = async () => {
    setUploadError("");
    setUploadProgress(0);
    setStep("sharing");
    try {
      let mediaUrl = "";
      let thumbnailUrl = "";
      let duration: number | undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("media_type", isVideo ? "video" : "image");

        const res = await mediaApi.upload(formData, (percent) => {
          setUploadProgress(percent);
        });

        const raw: string = res.data.url ?? res.data.media_url ?? "";
        mediaUrl = raw.startsWith("/") ? `http://localhost:8888${raw}` : raw;

        if (isVideo) {
          const thumbRaw: string = res.data.thumbnail_url ?? "";
          thumbnailUrl = thumbRaw.startsWith("/") ? `http://localhost:8888${thumbRaw}` : thumbRaw;
          duration = res.data.duration ?? undefined;
        }
      }

      if (!mediaUrl) {
        setUploadError("アップロードに失敗しました。再度お試しください。");
        setStep("caption");
        return;
      }

      await postsApi.create({
        caption,
        location,
        media_type: isVideo ? "video" : "photo",
        media_files: [
          {
            media_url: mediaUrl,
            media_order: 1,
            ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
            ...(duration !== undefined ? { duration } : {}),
          },
        ],
      });

      onCreated();
      setStep("done");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "投稿に失敗しました。再度お試しください。";
      setUploadError(msg);
      setStep("caption");
    }
  };

  /* ---- 戻る ---- */
  const goBack = () => {
    if (step === "crop") {
      setFile(null);
      setPreviewUrl("");
      setIsVideo(false);
      setVideoDuration(null);
      setStep("select");
    } else if (step === "caption") {
      setStep("crop");
    }
  };

  /* ---- レイアウト ---- */
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
        {/* ─── ヘッダー ─── */}
        {step !== "done" && (
          <div
            className="flex items-center justify-between px-4 border-b border-[#dbdbdb]"
            style={{ height: "44px" }}
          >
            {(step === "crop" || step === "caption") ? (
              <button onClick={goBack} className="text-[#262626] hover:text-[#8e8e8e] transition-colors">
                <ChevronLeft size={24} />
              </button>
            ) : step === "select" ? (
              <button onClick={onClose} className="text-[#262626] hover:text-[#8e8e8e] transition-colors">
                <X size={20} />
              </button>
            ) : (
              <div className="w-6" />
            )}

            <span className="font-semibold text-sm">{TITLES[step]}</span>

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

        {/* ─── ステップ: ファイル選択 ─── */}
        {step === "select" && (
          <div
            className="flex flex-col items-center justify-center gap-5 transition-colors"
            style={{
              minHeight: "380px",
              padding: "48px 32px",
              background: isDragging ? "#e8f4fd" : "#fff",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
          >
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
              <rect x="6" y="20" width="42" height="36" rx="3" stroke="#262626" strokeWidth="2.5" fill="none"/>
              <rect x="32" y="26" width="42" height="36" rx="3" stroke="#262626" strokeWidth="2.5" fill="white"/>
              <circle cx="47" cy="38" r="5.5" stroke="#262626" strokeWidth="2.5"/>
              <path d="M33 58 41 48 47 55 53 48 62 58" stroke="#262626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>

            <p className="text-xl text-[#262626]">写真や動画をここにドラッグ</p>
            <p className="text-sm text-[#8e8e8e]">
              写真: JPEG / PNG（最大10MB）<br />
              動画: MP4 / MOV（最大100MB・60秒以内）
            </p>

            {uploadError && (
              <p className="text-sm text-[#ed4956] text-center bg-[#fff0f1] rounded px-4 py-2">
                {uploadError}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,video/mp4,video/quicktime,video/avi"
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

        {/* ─── ステップ: プレビュー ─── */}
        {step === "crop" && previewUrl && (
          <div>
            <div className="relative bg-black overflow-hidden" style={{ ...ratioStyle, maxHeight: "520px" }}>
              {isVideo ? (
                <video
                  ref={videoPreviewRef}
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* 動画情報バー */}
            {isVideo && file && (
              <div className="flex items-center gap-3 px-4 py-2 bg-[#fafafa] border-t border-[#dbdbdb] text-xs text-[#8e8e8e]">
                <Film size={14} className="flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="flex-shrink-0">{formatBytes(file.size)}</span>
                {videoDuration !== null && (
                  <span className="flex-shrink-0">{formatDuration(videoDuration)}</span>
                )}
              </div>
            )}

            {/* アスペクト比ツールバー（画像のみ） */}
            {!isVideo && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#dbdbdb]">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRatio("1:1")}
                    title="正方形"
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${ratio === "1:1" ? "text-[#0095f6]" : "text-[#8e8e8e] hover:text-[#262626]"}`}
                  >
                    <Crop size={20} />
                    <span className="text-[10px] font-medium">1:1</span>
                  </button>
                  <button
                    onClick={() => setRatio("4:5")}
                    title="縦長"
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${ratio === "4:5" ? "text-[#0095f6]" : "text-[#8e8e8e] hover:text-[#262626]"}`}
                  >
                    <Maximize2 size={20} style={{ transform: "rotate(90deg)" }} />
                    <span className="text-[10px] font-medium">4:5</span>
                  </button>
                  <button
                    onClick={() => setRatio("16:9")}
                    title="横長"
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${ratio === "16:9" ? "text-[#0095f6]" : "text-[#8e8e8e] hover:text-[#262626]"}`}
                  >
                    <Maximize2 size={20} />
                    <span className="text-[10px] font-medium">16:9</span>
                  </button>
                </div>
                <button className="text-[#8e8e8e] hover:text-[#262626] transition-colors p-2" title="複数選択">
                  <Copy size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── ステップ: キャプション入力 ─── */}
        {step === "caption" && previewUrl && (
          <div className="flex" style={{ maxHeight: "600px" }}>
            {/* 左: プレビュー */}
            <div className="flex-shrink-0 bg-black overflow-hidden" style={{ width: "50%" }}>
              {isVideo ? (
                <video
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  style={{ ...ratioStyle, maxHeight: "600px" }}
                  muted
                  playsInline
                  loop
                  autoPlay
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                  style={{ ...ratioStyle, maxHeight: "600px" }}
                />
              )}
            </div>

            {/* 右: フォーム */}
            <div className="flex-1 flex flex-col overflow-y-auto border-l border-[#dbdbdb]">
              <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
                <Avatar src={user?.profile_img} username={user?.username} size={32} />
                <span className="font-semibold text-sm">{user?.username}</span>
              </div>

              {uploadError && (
                <p className="mx-4 mb-2 text-xs text-[#ed4956] bg-[#fff0f1] rounded px-3 py-2">{uploadError}</p>
              )}

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

              <div
                className="flex items-center justify-between px-4 border-b border-[#dbdbdb] flex-shrink-0"
                style={{ height: "44px" }}
              >
                <span className="text-sm text-[#262626]">コラボレーターを追加</span>
                <UserPlus size={20} className="text-[#8e8e8e]" />
              </div>

              {!isVideo && (
                <div className="border-b border-[#dbdbdb] flex-shrink-0">
                  <button
                    onClick={() => setShowAccessibility((v) => !v)}
                    className="flex items-center justify-between w-full px-4 text-sm"
                    style={{ height: "44px" }}
                  >
                    <span>アクセシビリティ</span>
                    {showAccessibility ? <ChevronUp size={16} className="text-[#8e8e8e]" /> : <ChevronDown size={16} className="text-[#8e8e8e]" />}
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
              )}

              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center justify-between w-full px-4 text-sm"
                  style={{ height: "44px" }}
                >
                  <span>詳細設定</span>
                  {showAdvanced ? <ChevronUp size={16} className="text-[#8e8e8e]" /> : <ChevronDown size={16} className="text-[#8e8e8e]" />}
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

        {/* ─── ステップ: アップロード中 ─── */}
        {step === "sharing" && (
          <div
            className="flex flex-col items-center justify-center gap-5"
            style={{ minHeight: "300px", padding: "48px 32px" }}
          >
            <div className="rainbow-spinner" />
            <p className="font-semibold text-base text-[#262626]">シェア中...</p>

            {/* プログレスバー */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full max-w-[240px]">
                <div className="h-1.5 bg-[#dbdbdb] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0095f6] rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[#8e8e8e] text-center mt-1">{uploadProgress}%</p>
              </div>
            )}
          </div>
        )}

        {/* ─── ステップ: 完了 ─── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center gap-5" style={{ padding: "56px 32px" }}>
            <div className="rainbow-circle-check">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
                <path d="M10 20l8 8 14-14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-semibold text-xl text-[#262626]">投稿がシェアされました。</p>
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
