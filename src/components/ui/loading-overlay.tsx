"use client";

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  submessage?: string;
}

export function LoadingOverlay({
  isOpen = false,
}: LoadingOverlayProps) {
  // Disabled loading overlay popups as requested
  return null;
}
