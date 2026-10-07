"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

interface LoadingContextType {
  showLoading: (message?: string, submessage?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType>({
  showLoading: () => {},
  hideLoading: () => {},
  isLoading: false,
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<{
    show: boolean;
    message: string;
    submessage: string;
  }>({
    show: false,
    message: "Memproses data...",
    submessage: "Mohon tunggu sebentar",
  });

  const activeRequestsRef = useRef(0);
  const showStartTimeRef = useRef<number>(0);
  const minDurationMs = 350; // smooth minimum duration to prevent rapid flickering

  const showLoading = useCallback((message = "Memproses data...", submessage = "Mohon tunggu sebentar") => {
    activeRequestsRef.current += 1;
    showStartTimeRef.current = Date.now();
    setLoadingState({
      show: true,
      message,
      submessage,
    });
  }, []);

  const hideLoading = useCallback(() => {
    activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
    if (activeRequestsRef.current === 0) {
      const elapsed = Date.now() - showStartTimeRef.current;
      const remaining = Math.max(0, minDurationMs - elapsed);
      setTimeout(() => {
        if (activeRequestsRef.current === 0) {
          setLoadingState((prev) => ({ ...prev, show: false }));
        }
      }, remaining);
    }
  }, []);

  // Automatic client-side fetch interceptor for data modification requests
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      let url = "";
      let method = "GET";
      let customMsg = "";
      let customSubmsg = "";
      let skipLoading = false;

      try {
        const reqInput = args[0];
        const reqInit = args[1];

        if (typeof reqInput === "string") {
          url = reqInput;
        } else if (reqInput instanceof Request) {
          url = reqInput.url;
          method = reqInput.method || "GET";
        }

        if (reqInit && reqInit.method) {
          method = reqInit.method.toUpperCase();
        } else if (typeof reqInput !== "string" && reqInput instanceof Request) {
          method = reqInput.method.toUpperCase();
        }

        // Check headers
        const headers = reqInit?.headers;
        if (headers) {
          if (headers instanceof Headers) {
            if (headers.get("x-no-loading") === "true") skipLoading = true;
            customMsg = headers.get("x-loading-message") || "";
          } else if (typeof headers === "object") {
            const h = headers as Record<string, string>;
            if (h["x-no-loading"] === "true") skipLoading = true;
            if (h["x-loading-message"]) customMsg = h["x-loading-message"];
          }
        }
      } catch (_) {}

      // Skip background/keep-alive and GET requests
      const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
      const isExcluded = url.includes("/api/keep-alive") || url.includes("/api/admin/notifications");

      if (!isMutation || isExcluded || skipLoading) {
        return originalFetch(...args);
      }

      // Determine contextual loading message
      let message = customMsg || "Memproses data...";
      let submessage = customSubmsg || "Mohon tunggu sebentar";

      if (!customMsg) {
        if (url.includes("/api/auth/login")) {
          message = "Memproses login...";
          submessage = "Memverifikasi akun Anda";
        } else if (url.includes("/api/auth/logout")) {
          message = "Memproses logout...";
          submessage = "Membersihkan sesi akun";
        } else if (url.includes("/api/hotel-visits/check-out") || (url.includes("/api/hotel-visits") && method === "PUT")) {
          message = "Memproses Check-Out Hotel...";
          submessage = "Menyelesaikan kunjungan hotel";
        } else if (url.includes("/api/hotel-visits") && method === "POST") {
          message = "Memproses Check-In Hotel...";
          submessage = "Sinkronisasi lokasi & waktu";
        } else if (url.includes("/api/hotel-visits") && method === "DELETE") {
          message = "Menghapus Kunjungan Hotel...";
          submessage = "Menghapus data kunjungan";
        } else if (url.includes("/api/etoll/import")) {
          message = "Mengimpor Data E-Toll...";
          submessage = "Memproses dan memvalidasi file Excel";
        } else if (url.includes("/api/etoll") && method === "POST") {
          message = "Menyimpan Kartu E-Toll Baru...";
          submessage = "Mendaftarkan data kartu ke sistem";
        } else if (url.includes("/api/etoll") && method === "PUT") {
          message = "Memperbarui Data E-Toll...";
          submessage = "Menyimpan perubahan transaksi / saldo";
        } else if (url.includes("/api/etoll") && method === "DELETE") {
          message = "Menghapus Kartu E-Toll...";
          submessage = "Menghapus kartu dari database";
        } else if (url.includes("/api/users/import")) {
          message = "Mengimpor Data Karyawan...";
          submessage = "Memproses dan memvalidasi data user";
        } else if (url.includes("/api/users") && method === "POST") {
          message = "Menambahkan Pengguna Baru...";
          submessage = "Menyimpan data pengguna ke sistem";
        } else if (url.includes("/api/users") && method === "PUT") {
          message = "Memperbarui Data Pengguna...";
          submessage = "Menyimpan perubahan profil pengguna";
        } else if (url.includes("/api/users") && method === "DELETE") {
          message = "Menghapus Pengguna...";
          submessage = "Menghapus akun pengguna dari database";
        } else if (url.includes("/api/driver-bon") && method === "POST") {
          message = "Menyimpan Bon Pengemudi Baru...";
          submessage = "Sinkronisasi data ke server";
        } else if (url.includes("/api/driver-bon") && method === "PUT") {
          message = "Memperbarui Bon Pengemudi...";
          submessage = "Menyimpan perubahan bon pengemudi";
        } else if (url.includes("/api/driver-bon") && method === "DELETE") {
          message = "Menghapus Bon Pengemudi...";
          submessage = "Menghapus data dari database";
        } else {
          if (method === "POST") {
            message = "Menyimpan data baru...";
            submessage = "Sinkronisasi ke server";
          } else if (method === "PUT" || method === "PATCH") {
            message = "Memperbarui data...";
            submessage = "Menyimpan perubahan ke server";
          } else if (method === "DELETE") {
            message = "Menghapus data...";
            submessage = "Menghapus data dari server";
          }
        }
      }

      showLoading(message, submessage);

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        hideLoading();
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [showLoading, hideLoading]);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading: loadingState.show }}>
      {children}
      <LoadingOverlay
        isOpen={loadingState.show}
        message={loadingState.message}
        submessage={loadingState.submessage}
      />
    </LoadingContext.Provider>
  );
}
