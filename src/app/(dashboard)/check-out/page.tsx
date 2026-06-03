"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Camera, CheckCircle2, ChevronLeft, Loader2, Target, ShieldCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockBranches, mockCurrentUser, mockAttendances } from "@/lib/mock-data";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type Step = "GPS" | "VALIDATION" | "CAMERA" | "SUCCESS";

export default function CheckOutPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("GPS");
  const [photo, setPhoto] = useState<string | null>(null);
  
  const branch = mockBranches.find(b => b.id === mockCurrentUser.branch_id) || mockBranches[0];
  const [accuracy, setAccuracy] = useState(0);

  // Find today's check in to calculate duration
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAttendance = mockAttendances.find(
    a => a.user_id === mockCurrentUser.id && a.date === todayStr && a.check_in_time
  );

  // Simulated duration (e.g. 8 hours)
  const durationStr = "8 Jam 15 Menit";

  // Simulate Check-out Flow (same as Check-in but shorter for demo)
  useEffect(() => {
    if (step === "GPS") {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        setAccuracy(Math.max(10, 100 - progress));
        
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep("VALIDATION"), 800);
        }
      }, 500);
      return () => clearInterval(interval);
    }

    if (step === "VALIDATION") {
      setTimeout(() => setStep("CAMERA"), 2000);
    }
  }, [step]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/home" className="p-2 rounded-full bg-surface-800 text-surface-200 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">Check Out</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 px-2 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-surface-800 -z-10" />
        
        {[
          { key: "GPS", label: "Lokasi" },
          { key: "VALIDATION", label: "Validasi" },
          { key: "CAMERA", label: "Foto" },
          { key: "SUCCESS", label: "Selesai" }
        ].map((s, i) => {
          const stepOrder = ["GPS", "VALIDATION", "CAMERA", "SUCCESS"];
          const currentIndex = stepOrder.indexOf(step);
          const isPassed = currentIndex > i;
          const isActive = currentIndex === i;
          
          return (
            <div key={s.key} className="flex flex-col items-center gap-2 bg-surface-950 px-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                isPassed ? "bg-brand-500 border-brand-500 text-white" :
                isActive ? "bg-surface-950 border-brand-500 text-brand-500" :
                "bg-surface-950 border-surface-700 text-surface-600"
              )}>
                {isPassed ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-semibold",
                isActive || isPassed ? "text-brand-400" : "text-surface-600"
              )}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col justify-center slide-up">
        
        {step === "GPS" && (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full border border-brand-500/20" />
              <div className="absolute inset-4 rounded-full border border-brand-500/40" />
              <div className="absolute inset-0 rounded-full bg-brand-500/10 animate-ping opacity-75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-12 h-12 text-brand-500 pulse-glow rounded-full" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Mencari Lokasi</h2>
            <p className="text-surface-400">Verifikasi lokasi sebelum check out.</p>
          </div>
        )}

        {step === "VALIDATION" && (
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-surface-800 flex items-center justify-center mb-6 relative">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin absolute" />
              <ShieldCheck className="w-6 h-6 text-brand-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Validasi Keamanan</h2>
            <p className="text-surface-400 mb-8">Memeriksa mock location & koordinat...</p>
          </div>
        )}

        {step === "CAMERA" && (
          <div className="flex flex-col items-center h-full max-h-[600px]">
            <h2 className="text-xl font-bold text-white mb-2">Ambil Foto Check Out</h2>
            <p className="text-sm text-surface-400 mb-6">Selfie untuk konfirmasi kepulangan</p>
            
            {!photo ? (
              <div className="w-full flex-1 glass-card overflow-hidden relative flex flex-col">
                <div className="flex-1 bg-black relative flex items-center justify-center">
                  <div className="absolute w-64 h-64 border-2 border-white/50 rounded-full flex items-center justify-center">
                    <UserPlaceholder className="w-24 h-24 text-white/30" />
                  </div>
                </div>
                <div className="p-6 flex justify-center bg-surface-900 border-t border-surface-800">
                  <button 
                    onClick={() => setPhoto("/placeholder-selfie.jpg")}
                    className="w-16 h-16 rounded-full bg-surface-700 border-4 border-surface-900 ring-2 ring-white flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col fade-in">
                <div className="w-full flex-1 glass-card overflow-hidden bg-surface-800 relative flex items-center justify-center">
                  <div className="w-64 h-64 rounded-full border-4 border-brand-500 bg-surface-700 overflow-hidden relative flex items-center justify-center shadow-lg shadow-brand-500/20">
                    <span className="text-sm text-surface-400 absolute">Simulasi Foto Captured</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button onClick={() => setPhoto(null)} className="py-3.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
                    Ulangi
                  </button>
                  <button onClick={() => setStep("SUCCESS")} className="py-3.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all">
                    Kirim Check Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center text-center h-full fade-in">
            <div className="w-24 h-24 rounded-full bg-brand-500/20 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
              <LogOut className="w-10 h-10 text-brand-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Check Out Berhasil!</h2>
            <p className="text-surface-400 mb-8">Terima kasih atas kerja keras Anda hari ini.</p>
            
            <div className="glass-card p-6 w-full text-left space-y-4 mb-8 border-t-4 border-t-brand-500">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">Check In</p>
                  <p className="font-medium text-white mt-1">08:00 WIB</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">Check Out</p>
                  <p className="font-medium text-white mt-1">16:15 WIB</p>
                </div>
              </div>
              <div className="pt-4 border-t border-surface-800">
                <p className="text-xs text-surface-500 uppercase font-semibold">Durasi Kerja</p>
                <p className="text-xl font-bold text-brand-400 mt-1">{durationStr}</p>
              </div>
            </div>
            
            <Link href="/home" className="w-full py-4 rounded-xl bg-surface-800 text-white font-medium hover:bg-surface-700 transition-colors block">
              Kembali ke Home
            </Link>
          </div>
        )}
        
      </div>
    </div>
  );
}

function UserPlaceholder({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
