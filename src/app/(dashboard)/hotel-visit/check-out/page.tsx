"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Camera, CheckCircle2, Clock, Building2 } from "lucide-react";
import useSWR from "swr";
import { cn, formatTime, getDurationString } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(res => res.json());

type Step = "INFO" | "SELFIE" | "SUCCESS";

export default function HotelCheckOutPage() {
  const [step, setStep] = useState<Step>("INFO");
  const [selfiePhoto, setSelfiePhoto] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get("id");
  const { data: visits } = useSWR("/api/hotel-visits", fetcher);
  const activeVisit = visits?.find((v: any) => v.id === id);

  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/hotel-visits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_out_lat: -7.257,
          check_out_lng: 112.752,
          selfie_check_out_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=300&h=300"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessData(data.visit);
        setStep("SUCCESS");
      } else {
        alert("Gagal melakukan check out");
      }
    } catch (e) {
      alert("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeVisit && step !== "SUCCESS") return <div className="p-8 text-white text-center">Loading...</div>;
  
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/hotel-visit")} className="p-2 rounded-full bg-surface-800 text-surface-200 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Check Out Hotel</h1>
      </div>

      <div className="flex items-center justify-between mb-8 px-8 relative">
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-surface-800 -z-10" />
        {[
          { key: "INFO", label: "Konfirmasi" },
          { key: "SELFIE", label: "Selfie" },
          { key: "SUCCESS", label: "Selesai" }
        ].map((s, i) => {
          const stepOrder = ["INFO", "SELFIE", "SUCCESS"];
          const currentIndex = stepOrder.indexOf(step);
          const isPassed = currentIndex > i;
          const isActive = currentIndex === i;
          
          return (
            <div key={s.key} className="flex flex-col items-center gap-2 bg-surface-950 px-4">
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

      <div className="flex-1 flex flex-col justify-center slide-up">
        
        {step === "INFO" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-6">{activeVisit.hotel_name}</h2>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 flex justify-between items-center">
                  <div className="flex items-center gap-3 text-surface-300">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Waktu Check In</span>
                  </div>
                  <span className="font-bold text-white text-sm">{formatTime(activeVisit.check_in_time)} WIB</span>
                </div>
                
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-500">Waktu Sekarang</span>
                  <span className="font-bold text-amber-400">{formatTime(new Date().toISOString())} WIB</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setStep("SELFIE")}
              className="w-full py-3.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all"
            >
              Lanjutkan Check Out
            </button>
          </div>
        )}

        {step === "SELFIE" && (
          <div className="flex flex-col items-center h-full max-h-[600px]">
            <h2 className="text-xl font-bold text-white mb-2">Foto Selfie Check Out</h2>
            <p className="text-sm text-surface-400 mb-6 text-center">Pastikan wajah terlihat jelas (kamera depan)</p>
            
            {!selfiePhoto ? (
              <div className="w-full flex-1 glass-card overflow-hidden relative flex flex-col">
                <div className="flex-1 bg-black relative flex items-center justify-center">
                  <div className="absolute w-64 h-64 border-2 border-white/50 rounded-full flex items-center justify-center">
                    <Camera className="w-16 h-16 text-white/30" />
                  </div>
                </div>
                <div className="p-6 flex justify-center bg-surface-900 border-t border-surface-800">
                  <button onClick={() => setSelfiePhoto(true)} className="w-16 h-16 rounded-full bg-surface-700 border-4 border-surface-900 ring-2 ring-white flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col fade-in">
                <div className="w-full flex-1 glass-card overflow-hidden bg-surface-800 flex items-center justify-center relative">
                   <div className="w-64 h-64 rounded-full border-4 border-brand-500 bg-surface-700 overflow-hidden relative flex items-center justify-center">
                    <span className="text-sm text-surface-400 absolute text-center">Simulasi SelfieTersimpan</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button onClick={() => setSelfiePhoto(false)} className="py-3.5 rounded-xl border border-surface-700 text-white font-medium">Ulangi</button>
                  <button onClick={() => handleCheckOut()} disabled={isLoading} className="py-3.5 rounded-xl gradient-brand text-white font-medium">
                    {isLoading ? "Mengirim..." : "Kirim Data"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center text-center h-full fade-in">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Check Out Berhasil!</h2>
            <p className="text-surface-400 mb-8">Data telah tersimpan di sistem.</p>
            
            <div className="glass-card p-6 w-full text-left space-y-4 mb-8">
              <div>
                <p className="text-xs text-surface-500 uppercase font-semibold">Nama Hotel</p>
                <p className="font-bold text-white mt-1 text-lg">{successData?.hotel_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">Total Durasi</p>
                  <p className="font-medium text-emerald-400 mt-1">{successData?.duration_minutes ? getDurationString(successData.duration_minutes) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">Waktu Selesai</p>
                  <p className="font-medium text-white mt-1">{successData?.check_out_time ? formatTime(successData.check_out_time) : '-'} WIB</p>
                </div>
              </div>
            </div>
            
            <button onClick={() => router.push("/hotel-visit")} className="w-full py-4 rounded-xl bg-surface-800 text-white font-medium hover:bg-surface-700 transition-colors block text-center">
              Kembali ke Daftar
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
