"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Loading animation state
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing System");
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const loginPromise = useRef<Promise<any> | null>(null);
  const loginResult = useRef<any>(null);
  const loginError = useRef<string | null>(null);

  const statuses = [
    "Synchronizing Systems",
    "Authenticating Credentials",
    "Loading User Data",
    "Finalizing Session",
  ];

  const startProgressAnimation = useCallback(() => {
    setProgress(0);
    setStatusText("Initializing System");

    let currentProgress = 0;

    progressInterval.current = setInterval(() => {
      // Slow down as we approach certain thresholds to wait for API
      let increment: number;
      if (currentProgress < 30) {
        increment = Math.random() * 1.5 + 0.5;
      } else if (currentProgress < 60) {
        increment = Math.random() * 0.8 + 0.2;
      } else if (currentProgress < 85) {
        increment = Math.random() * 0.4 + 0.1;
      } else {
        // Hold near 85-90% until API responds
        if (!loginResult.current && !loginError.current) {
          increment = currentProgress < 90 ? Math.random() * 0.1 : 0;
        } else {
          // API responded, rush to 100%
          increment = Math.random() * 3 + 2;
        }
      }

      currentProgress += increment;
      if (currentProgress > 100) currentProgress = 100;

      setProgress(currentProgress);

      // Update status text based on progress
      const statusIndex = Math.floor((currentProgress / 100) * statuses.length);
      const newStatus = statuses[Math.min(statusIndex, statuses.length - 1)];
      setStatusText(newStatus);

      if (currentProgress >= 100) {
        if (progressInterval.current) clearInterval(progressInterval.current);
        setStatusText("System Ready");
      }
    }, 40);
  }, []);

  // When progress reaches 100, handle the result
  useEffect(() => {
    if (progress >= 100 && isLoading) {
      const timeout = setTimeout(() => {
        if (loginError.current) {
          setError(loginError.current);
          setIsLoading(false);
          loginError.current = null;
          loginResult.current = null;
        } else if (loginResult.current) {
          const data = loginResult.current;
          if (data.user.role === "admin_cabang" || data.user.role === "super_admin") {
            router.push("/admin/dashboard");
          } else {
            router.push("/home");
          }
          loginResult.current = null;
        }
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [progress, isLoading, router]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    loginResult.current = null;
    loginError.current = null;

    // Start animation
    startProgressAnimation();

    // Fire API request
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal login");
      }

      loginResult.current = data;
    } catch (err: any) {
      loginError.current = err.message;
    }
  };

  return (
    <div className={cn(
      "glass-card p-8 w-full border-t border-t-white/10 shadow-2xl relative overflow-hidden transition-shadow duration-500",
      isLoading && "shadow-[0_0_40px_rgba(0,82,255,0.1)]"
    )}>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-[20px] rounded-2xl z-20 flex items-center justify-center"
          style={{ animation: "overlayFadeIn 0.3s ease-out forwards" }}
        >
          <div className="w-full max-w-[280px] flex flex-col items-center space-y-6"
            style={{ animation: "slideUpFade 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" }}
          >
            {/* "Please Wait" Header */}
            <div className="w-full text-center">
              <h2
                className="text-[10px] font-bold tracking-[0.6em] uppercase leading-none"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "#b7c4ff",
                }}
              >
                Please Wait
              </h2>
            </div>

            {/* Kinetic Loading Bar */}
            <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full relative overflow-hidden transition-all duration-75 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: "#0052FF",
                  boxShadow: "0 0 15px rgba(0,82,255,0.7)",
                }}
              >
                {/* Shine overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)",
                    animation: "shine 2.5s infinite linear",
                  }}
                />
              </div>
            </div>

            {/* Percentage & Status */}
            <div className="flex flex-col items-center space-y-4">
              {/* Percentage */}
              <div
                className="text-[11px] font-medium tracking-[0.2em] uppercase opacity-40"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "#b7c4ff",
                }}
              >
                {Math.floor(progress)}%
              </div>

              {/* Status Text */}
              <div
                className="text-[8px] font-semibold tracking-[0.25em] uppercase transition-opacity duration-300"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: progress >= 100 ? "#0052FF" : "rgba(100, 116, 139, 0.4)",
                  opacity: progress >= 100 ? 1 : undefined,
                }}
              >
                {statusText}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={cn("transition-opacity duration-300", isLoading && "opacity-20")}>
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
                disabled={isLoading}
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
                disabled={isLoading}
                className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-surface-600 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
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
                disabled={isLoading}
                className="w-4 h-4 rounded border-surface-600 text-brand-500 focus:ring-brand-500/50 bg-surface-900/50 accent-brand-500"
              />
              <label htmlFor="remember" className="text-sm text-surface-300 cursor-pointer">
                Remember Me
              </label>
            </div>
            <button type="button" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              Lupa Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:cursor-not-allowed group mt-2",
              isLoading 
                ? "bg-[#0052FF]/70 shadow-[0_0_20px_rgba(0,82,255,0.3)]" 
                : "bg-[#0052FF] hover:bg-[#003ec7] hover:shadow-lg hover:shadow-[#0052FF]/25"
            )}
          >
            {isLoading ? (
              <svg 
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ animation: "spinner-rotate 1s linear infinite" }}
              >
                <circle 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="47 16"
                />
              </svg>
            ) : (
              <>
                Masuk
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-surface-700/50 text-center">
          <p className="text-xs text-surface-500">
            Versi {process.env.APP_VERSION || "1.0.0"} &bull; &copy; {new Date().getFullYear()} Trans KP
          </p>
        </div>
      </div>

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spinner-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
