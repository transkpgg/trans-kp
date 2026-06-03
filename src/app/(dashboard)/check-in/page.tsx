"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Camera, CheckCircle2, ChevronLeft, Loader2, Target, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockBranches, mockCurrentUser } from "@/lib/mock-data";

type Step = "GPS" | "VALIDATION" | "CAMERA" | "SUCCESS";

export default function CheckInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("GPS");
  const [photo, setPhoto] = useState<string | null>(null);
  
  // GPS Data
  const branch = mockBranches.find(b => b.id === mockCurrentUser.branch_id) || mockBranches[0];
  const [accuracy, setAccuracy] = useState(0);
  const [distance, setDistance] = useState(0);
  
  // Validation Checks
  const [validations, setValidations] = useState([
    { id: 'acc', label: 'Akurasi GPS (≤ 20m)', status: 'pending' as 'pending' | 'checking' | 'passed' | 'failed' },
    { id: 'mock', label: 'Anti Mock Location', status: 'pending' as 'pending' | 'checking' | 'passed' | 'failed' },
    { id: 'time', label: 'Sinkronisasi Waktu', status: 'pending' as 'pending' | 'checking' | 'passed' | 'failed' },
    { id: 'dev', label: 'Device Fingerprint', status: 'pending' as 'pending' | 'checking' | 'passed' | 'failed' },
  ]);

  // Simulate Check-in Flow
  useEffect(() => {
    if (step === "GPS") {
      // Simulate GPS acquisition
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setAccuracy(Math.max(10, 100 - progress)); // simulate accuracy improving
        
        // Simulasikan jarak agar di bawah 100 meter (misal: 15m)
        setDistance(15);
        
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep("VALIDATION"), 1000);
        }
      }, 500);
      return () => clearInterval(interval);
    }

    if (step === "VALIDATION") {
      // Simulate sequential validations
      let currentCheck = 0;
      
      const runCheck = () => {
        if (currentCheck >= validations.length) {
          setTimeout(() => setStep("CAMERA"), 1000);
          return;
        }

        setValidations(prev => prev.map((v, i) => 
          i === currentCheck ? { ...v, status: 'checking' } : v
        ));

        setTimeout(() => {
          setValidations(prev => prev.map((v, i) => 
            i === currentCheck ? { ...v, status: 'passed' } : v
          ));
          currentCheck++;
          runCheck();
        }, 800);
      };
      
      runCheck();
    }
  }, [step]);

  const handleCapture = () => {
    // In a real app, this would use the Canvas API to get a frame from the video stream
    setPhoto("/placeholder-selfie.jpg");
  };

  const handleSubmit = () => {
    setStep("SUCCESS");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/home" className="p-2 rounded-full bg-surface-800 text-surface-200 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">Check In</h1>
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
        
        {/* STEP 1: GPS */}
        {step === "GPS" && (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full border border-brand-500/20" />
              <div className="absolute inset-4 rounded-full border border-brand-500/40" />
              <div className="absolute inset-8 rounded-full border border-brand-500/60" />
              <div className="absolute inset-0 rounded-full bg-brand-500/10 animate-ping opacity-75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-12 h-12 text-brand-500 pulse-glow rounded-full" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Mencari Lokasi</h2>
            <p className="text-surface-400">Pastikan GPS aktif dan Anda berada di area kantor.</p>
            
            <div className="mt-8 glass-card p-4 w-full text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Target Lokasi:</span>
                <span className="text-white font-medium">{branch.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Akurasi GPS:</span>
                <span className="text-brand-400 font-mono">{accuracy > 0 ? `${accuracy}m` : '...'}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: VALIDATION */}
        {step === "VALIDATION" && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-surface-800 flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-6">Validasi Keamanan</h2>
            
            <div className="w-full space-y-3">
              {validations.map((v) => (
                <div key={v.id} className="glass-card p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{v.label}</span>
                  <div>
                    {v.status === 'pending' && <span className="w-5 h-5 rounded-full border-2 border-surface-600 block" />}
                    {v.status === 'checking' && <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />}
                    {v.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {v.status === 'failed' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 glass-card p-4 border-emerald-500/30 bg-emerald-500/10 w-full fade-in" style={{ animationDelay: '3.5s', opacity: 0, animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Berada di area kantor</p>
                  <p className="text-xs text-emerald-500/80">Jarak: {distance}m dari titik pusat</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CAMERA */}
        {step === "CAMERA" && (
          <div className="flex flex-col items-center h-full max-h-[600px]">
            <h2 className="text-xl font-bold text-white mb-2">Ambil Foto Selfie</h2>
            <p className="text-sm text-surface-400 mb-6">Pastikan wajah terlihat jelas</p>
            
            {!photo ? (
              <div className="w-full flex-1 glass-card overflow-hidden relative flex flex-col">
                {/* Simulated Camera Viewfinder */}
                <div className="flex-1 bg-black relative flex items-center justify-center">
                  {/* Selfie Frame Overlay */}
                  <div className="absolute w-64 h-64 border-2 border-white/50 rounded-full flex items-center justify-center">
                    <UserPlaceholder className="w-24 h-24 text-white/30" />
                  </div>
                  {/* Camera guides */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-brand-500" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-brand-500" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-brand-500" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-brand-500" />
                </div>
                
                {/* Capture Button Area */}
                <div className="p-6 flex justify-center bg-surface-900 border-t border-surface-800">
                  <button 
                    onClick={handleCapture}
                    className="w-16 h-16 rounded-full bg-surface-700 border-4 border-surface-900 ring-2 ring-white flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
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
                  <button 
                    onClick={() => setPhoto(null)}
                    className="py-3.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors"
                  >
                    Ulangi
                  </button>
                  <button 
                    onClick={handleSubmit}
                    className="py-3.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all"
                  >
                    Kirim Absensi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center text-center h-full fade-in">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Check In Berhasil!</h2>
            <p className="text-surface-400 mb-8">Data absensi Anda telah disimpan.</p>
            
            <div className="glass-card p-6 w-full text-left space-y-4 mb-8">
              <div>
                <p className="text-xs text-surface-500 uppercase font-semibold tracking-wider">Waktu</p>
                <p className="font-medium text-white mt-1">
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase font-semibold tracking-wider">Lokasi</p>
                <p className="font-medium text-white mt-1">{branch.name}</p>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> GPS Valid
                </p>
              </div>
            </div>
            
            <Link 
              href="/home"
              className="w-full py-4 rounded-xl bg-surface-800 text-white font-medium hover:bg-surface-700 transition-colors block"
            >
              Kembali ke Home
            </Link>
          </div>
        )}
        
      </div>
    </div>
  );
}

// Simple Icon component since User from lucide is not imported in this specific scope sometimes
function UserPlaceholder({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
