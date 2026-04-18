"use client";

import { useEffect } from "react";

export interface PostMenuItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "bold" | "cancel";
  hasDividerAbove?: boolean;
}

interface PostMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PostMenuItem[];
}

export function PostMenuModal({ isOpen, onClose, items }: PostMenuModalProps) {
  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // スクロールロック
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantClass: Record<NonNullable<PostMenuItem["variant"]>, string> = {
    danger:  "text-[#ed4956] font-normal",
    bold:    "text-[#262626] font-bold",
    cancel:  "text-[#262626] font-semibold",
    default: "text-[#262626] font-normal",
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] bg-white rounded-xl overflow-hidden shadow-2xl
                   animate-[menuFadeIn_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              item.onClick();
            }}
            className={`
              w-full py-3.5 text-sm text-center transition-colors
              hover:bg-[#fafafa] active:bg-[#f0f0f0]
              ${item.hasDividerAbove ? "border-t border-[#dbdbdb]" : ""}
              ${variantClass[item.variant ?? "default"]}
            `}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
