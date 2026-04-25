"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface Props {
  src: string;
  hlsSrc?: string;
  poster?: string;
  className?: string;
  loop?: boolean;
  autoPlayWhenVisible?: boolean;
  onViewed?: () => void;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function VideoPlayer({ src, hlsSrc, poster, className = "", loop = true, autoPlayWhenVisible = false, onViewed }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedRef = useRef(false);
  const ignoreNextClickRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackSrc, setPlaybackSrc] = useState(src);

  useEffect(() => {
    const video = videoRef.current;
    if (hlsSrc && video?.canPlayType("application/vnd.apple.mpegurl")) {
      setPlaybackSrc(hlsSrc);
      return;
    }
    setPlaybackSrc(src);
  }, [src, hlsSrc]);

  // スクロールで画面外に出たら自動停止
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && autoPlayWhenVisible && video.paused) {
          video.play().catch(() => {});
          setPlaying(true);
          return;
        }

        if (!entry.isIntersecting && !video.paused) {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlayWhenVisible]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 2500);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
      revealControls();
    } else {
      video.pause();
      setPlaying(false);
      setShowControls(true);
    }
  }, [revealControls]);

  const toggleMutedState = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMutedState();
  }, [toggleMutedState]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextVolume = Number(e.target.value);
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setMuted(video.muted);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration);
    setProgress((video.currentTime / video.duration) * 100);
    if (!viewedRef.current && video.currentTime >= Math.min(2, video.duration * 0.5)) {
      viewedRef.current = true;
      onViewed?.();
    }
  }, [onViewed]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    const bar = progressBarRef.current;
    if (!video || !bar || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
  }, []);

  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video?.requestFullscreen) video.requestFullscreen();
  }, []);

  const handleContainerClick = useCallback(() => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }
    togglePlay();
  }, [togglePlay]);

  const handleTouchEnd = useCallback(() => {
    if (window.matchMedia("(pointer: coarse)").matches) {
      ignoreNextClickRef.current = true;
      toggleMutedState();
      revealControls();
    }
  }, [revealControls, toggleMutedState]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-black cursor-pointer select-none overflow-hidden ${className}`}
      onClick={handleContainerClick}
      onTouchEnd={handleTouchEnd}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={playbackSrc}
        poster={poster}
        className="w-full h-full object-cover"
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onEnded={() => { setPlaying(false); setShowControls(true); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* 一時停止時: 再生ボタンオーバーレイ */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-3">
            <Play size={32} className="text-white fill-white ml-0.5" />
          </div>
        </div>
      )}

      {/* コントロールバー */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-6 transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* シークバー */}
        <div
          ref={progressBarRef}
          className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer hover:h-1.5 transition-all"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-white rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="text-white hover:text-white/80 transition-colors"
              aria-label={playing ? "一時停止" : "再生"}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-white/80 transition-colors"
              aria-label={muted ? "ミュート解除" : "ミュート"}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              onClick={(e) => e.stopPropagation()}
              className="hidden h-1 w-20 accent-white sm:block"
              aria-label="音量"
            />
            <span className="min-w-[86px] text-xs font-medium tabular-nums text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <button
            onClick={handleFullscreen}
            className="text-white hover:text-white/80 transition-colors"
            aria-label="フルスクリーン"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
