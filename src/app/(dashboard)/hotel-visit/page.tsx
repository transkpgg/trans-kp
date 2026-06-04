"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Building2, Clock, MapPin, ChevronRight, CheckCircle2, ImageIcon, X } from "lucide-react";
import useSWR from "swr";
import { formatTime, getDurationString, cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HotelVisitListPage() {
  const { data: visitsData, error } = useSWR("/api/hotel-visits", fetcher);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<{lat: number, lng: number, name: string} | null>(null);
  
  const visits = (Array.isArray(visitsData) ? visitsData.filter((v: any) => 
    new Date(v.check_in_time).getMonth() === selectedMonth
  ) : []).sort((a: any, b: any) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());

  const activeVisit = Array.isArray(visitsData) ? visitsData.find((v: any) => !v.check_out_time) : null;

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <div className="space-y-6 slide-up">
      <h1 className="text-2xl font-bold text-white">Kunjungan Hotel</h1>
      
      {!activeVisit ? (
        <Link 
          href="/hotel-visit/check-in"
          className="w-full gradient-brand p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Check In Hotel Baru</h2>
              <p className="text-sm text-brand-100 mt-0.5">Catat kunjungan hotel untuk perjalanan dinas</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </Link>
      ) : (
        <div className="w-full bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden">
          {/* Pulse effect */}
          <div className="absolute top-0 right-0 p-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Building2 className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Check Out Tertunda</h2>
              <p className="text-sm text-surface-400">Anda sedang menginap di <strong className="text-white">{activeVisit.hotel_name}</strong></p>
            </div>
          </div>
          <Link 
            href={`/hotel-visit/check-out?id=${activeVisit.id}`}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-center block transition-colors shadow-lg shadow-amber-500/20"
          >
            Lakukan Check Out Sekarang
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Riwayat Kunjungan</h3>
        <select 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="bg-surface-800 border border-surface-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
        >
          {months.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {visits.length === 0 ? (
          <div className="glass-card p-10 flex flex-col items-center justify-center text-center border-dashed border-2 fade-in">
            <div className="w-16 h-16 rounded-full bg-surface-800/50 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-surface-500" />
            </div>
            <p className="text-white font-medium">Belum ada kunjungan hotel</p>
            <p className="text-sm text-surface-400 mt-1">Anda belum melakukan check-in hotel bulan ini.</p>
          </div>
        ) : (
          visits.map((visit: any, index: number) => (
            <div 
              key={visit.id} 
              className="glass-card overflow-hidden slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-4 border-b border-surface-800 bg-surface-900/30 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg">{visit.hotel_name}</h3>
                  {visit.notes && <p className="text-xs text-surface-400 mt-1 italic">"{visit.notes}"</p>}
                </div>
                {!visit.check_out_time && (
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Menginap
                  </span>
                )}
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-surface-500 uppercase font-bold tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Check In
                    </p>
                    <p className="font-medium text-white text-sm">
                      {format(new Date(visit.check_in_time), "dd MMM yy", { locale: id })}
                    </p>
                    <p className="text-xs text-brand-400 font-mono">
                      {formatTime(visit.check_in_time)} WIB
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-1 border-l border-surface-800 pl-4">
                    <p className="text-[10px] text-surface-500 uppercase font-bold tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Check Out
                    </p>
                    {visit.check_out_time ? (
                      <>
                        <p className="font-medium text-white text-sm">
                          {format(new Date(visit.check_out_time), "dd MMM yy", { locale: id })}
                        </p>
                        <p className="text-xs text-brand-400 font-mono">
                          {formatTime(visit.check_out_time)} WIB
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-400 font-medium italic mt-1">Belum Check Out</p>
                    )}
                  </div>
                </div>



                {!visit.check_out_time ? (
                  <Link 
                    href={`/hotel-visit/check-out?id=${visit.id}`}
                    className="w-full py-2.5 rounded-xl border-2 border-brand-500/50 text-brand-400 font-medium text-center block hover:bg-brand-500/10 transition-colors"
                  >
                    Lakukan Check Out
                  </Link>
                ) : (
                  <div className="pt-3 border-t border-surface-800 flex items-center justify-between">
                    <p className="text-xs text-surface-400">Total Durasi:</p>
                    <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> 
                      {visit.duration_minutes ? getDurationString(visit.duration_minutes) : '-'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center">
              <h2 className="font-bold text-white">Bukti Foto</h2>
              <button onClick={() => setSelectedPhoto(null)} className="p-1 hover:bg-surface-700 rounded-lg text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-black/50">
              <img src={selectedPhoto} alt="Foto Bukti" className="rounded-xl max-h-[60vh] object-contain" />
            </div>
          </div>
        </div>
      )}

      {selectedMap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card max-w-2xl w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-white">Lokasi Peta</h2>
                <p className="text-xs text-surface-400 font-mono mt-1">{selectedMap.lat}, {selectedMap.lng}</p>
              </div>
              <button onClick={() => setSelectedMap(null)} className="p-1 hover:bg-surface-700 rounded-lg text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-[4/3] bg-surface-900">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.google.com/maps?q=${selectedMap.lat},${selectedMap.lng}&hl=es;z=14&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
