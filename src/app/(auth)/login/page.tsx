"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff, Check, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore remembered credentials on mount
  useEffect(() => {
    let isMounted = true;
    const checkExistingSessionAndRemember = async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.user && isMounted) {
            if (meData.user.role === "admin_cabang" || meData.user.role === "super_admin") {
              router.push("/admin/dashboard");
            } else {
              router.push("/home");
            }
            return;
          }
        }

        const saved = localStorage.getItem("transkp_remembered_credentials");
        if (saved) {
          const { username: u, password: p, rememberMe: r } = JSON.parse(saved);
          if (u && isMounted) {
            setUsername(u);
            setPassword(p || "");
            setRememberMe(!!r);
          }
        }
      } catch (e) {
        console.error("Session check error:", e);
      }
    };

    checkExistingSessionAndRemember();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Username atau password salah");
      }

      if (rememberMe) {
        localStorage.setItem(
          "transkp_remembered_credentials",
          JSON.stringify({ username, password, rememberMe: true })
        );
      } else {
        localStorage.removeItem("transkp_remembered_credentials");
      }

      if (data.user.role === "admin_cabang" || data.user.role === "super_admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/home");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat login");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card p-8 w-full border-t border-t-white/10 shadow-2xl relative overflow-hidden transition-shadow duration-500">
      <div className="flex flex-col items-center mb-8 mt-4">
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ letterSpacing: "-0.02em" }}>Trans KP</h1>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-300 ml-1">Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-surface-500" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-surface-600 disabled:cursor-not-allowed"
              placeholder="Masukkan username"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-300">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-surface-500" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-surface-600 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-500 hover:text-surface-300 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="hidden"
            />
            <label
              htmlFor="remember"
              className="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 cursor-pointer select-none transition-colors"
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                  rememberMe
                    ? "bg-brand-500 border-brand-500 text-white"
                    : "border-surface-600 bg-surface-900/50"
                )}
              >
                {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              Ingat Saya
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !username || !password}
          className="w-full gradient-brand hover:opacity-95 text-white font-medium py-3 rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
