"use client";

import React from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  submessage?: string;
}

export function LoadingOverlay({
  isOpen,
  message = "Memproses data...",
  submessage = "Mohon tunggu sebentar",
}: LoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all duration-300 animate-fadeIn">
      {/* Centered Glowing Card */}
      <div className="glass-card bg-surface-900/90 border border-brand-500/30 rounded-3xl p-8 shadow-2xl shadow-brand-500/20 max-w-sm w-full flex flex-col items-center text-center relative overflow-hidden animate-slideUp">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Spinner Container */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Outer Pulse Ring */}
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping opacity-75" />
          
          {/* Rotating Gradient Ring */}
          <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-brand-400 border-r-indigo-400 animate-spin" />
          
          {/* Center Spinning Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
          </div>
        </div>

        {/* Message */}
        <h4 className="text-base font-bold text-white tracking-wide">{message}</h4>
        <p className="text-xs text-surface-400 mt-1 font-medium">{submessage}</p>

        {/* Progress Bar Shimmer Accent */}
        <div className="w-full bg-surface-800 rounded-full h-1.5 mt-5 overflow-hidden relative">
          <div className="w-full h-full bg-gradient-to-r from-brand-500 via-indigo-400 to-brand-500 shimmer" />
        </div>
      </div>
    </div>
  );
}
