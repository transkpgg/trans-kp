"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Clock, Building2, ArrowRight, MapPin, CheckCircle2 } from "lucide-react";
import { formatTime, cn, getDurationString } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function UserHomePage() {
  const { data: meData } = useSWR("/api/auth/me", fetcher);
  const currentUser = meData?.user || { id: "", full_name: "Memuat..." };
  const [currentDate, setCurrentDate] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: visitsData } = useSWR("/api/hotel-visits", fetcher);
  const recentVisits = Array.isArray(visitsData) ? visitsData.slice(0, 5) : [];
  
  // Periksa apakah sedang menginap di hotel
  const activeVisit = recentVisits.find((v: any) => !v.check_out_time);

  return (
    <div className="space-y-6">
      
      {/* Date & Greeting Card */}
      <div className="glass-card p-6 fade-in relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-brand-400 font-medium mb-1">Selamat datang,</p>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-4">
            {currentUser.full_name}
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800/80 border border-surface-700 text-sm text-surface-300">
            <Clock className="w-4 h-4 text-brand-500" />
            {format(currentDate, "EEEE, dd MMMM yyyy", { locale: id })}
          </div>
        </div>
        
        {/* Decorative background */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl group-hover:bg-brand-500/20 transition-all duration-500" />
      </div>

      {/* Active Hotel Status (If Any) */}
      {activeVisit && (
        <div className="glass-card p-1 slide-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 to-brand-500/20 border border-amber-500/30">
          <div className="bg-surface-950/80 backdrop-blur-sm p-5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Sedang Menginap
                </p>
                <p className="font-bold text-white text-lg">{activeVisit.hotel_name}</p>
                <p className="text-xs text-surface-400 mt-0.5">Sejak {formatTime(activeVisit.check_in_time)}</p>
              </div>
            </div>
            <Link href={`/hotel-visit`} className="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors">
              Check Out
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 slide-up" style={{ animationDelay: "0.1s" }}>
        <Link 
          href="/hotel-visit"
          className="p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all gradient-brand shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95"
        >
          <div className="p-3 rounded-full bg-white/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-sm">Kunjungan Hotel</p>
          </div>
        </Link>

        <div className="p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all bg-surface-800/50 border border-surface-700/50">
          <div className="p-3 rounded-full bg-surface-700">
            <MapPin className="w-8 h-8 text-surface-500" />
          </div>
          <div className="text-center">
            <p className="font-bold text-surface-500 text-sm">Fitur Lainnya</p>
            <p className="text-[10px] text-surface-600 mt-1 uppercase tracking-wider">Segera Hadir</p>
          </div>
        </div>
      </div>

      {/* Recent Hotel Visits Section */}
      <div className="slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">Riwayat Kunjungan Hotel</h2>
          <Link href="/hotel-visit" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors">
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {(!recentVisits || recentVisits.length === 0) ? (
            <div className="glass-card p-6 text-center text-surface-400 text-sm">
              Belum ada riwayat kunjungan hotel bulan ini.
            </div>
          ) : (
            recentVisits.map((visit: any, index: number) => (
              <div 
                key={visit.id || index}
                className="glass-card p-4 flex items-center justify-between group hover:bg-surface-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{visit.hotel_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-medium text-surface-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(visit.check_in_time), "dd MMM yy", { locale: id })}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-surface-700" />
                      <p className="text-xs font-mono text-brand-400">{formatTime(visit.check_in_time)}</p>
                    </div>
                  </div>
                </div>
                
                {visit.check_out_time ? (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-surface-500">Durasi</p>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">{getDurationString(visit.duration_minutes)}</p>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20 uppercase tracking-wider animate-pulse">
                      Menginap
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}
