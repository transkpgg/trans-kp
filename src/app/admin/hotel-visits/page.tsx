"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Building2, Calendar, Search, MapPin, Clock, ImageIcon, X } from "lucide-react";
import useSWR from "swr";
import { getDurationString, formatTime, cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminHotelVisitsPage() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ 
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), 
    end: format(new Date(), "yyyy-MM-dd") 
  });

  const { data: visits, error } = useSWR("/api/hotel-visits", fetcher);
  
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<{lat: number, lng: number, name: string} | null>(null);

  const visitsData = Array.isArray(visits) ? visits : [];

  const filteredVisits = visitsData.filter((visit: any) => {
    return visit.user?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
           visit.hotel_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Monitoring Kunjungan Hotel</h1>
        <p className="text-sm text-surface-400 mt-1">Pantau check-in dan check-out hotel oleh driver.</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input 
            type="text" 
            placeholder="Cari nama driver atau hotel..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none z-10" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full sm:w-auto pl-9 pr-3 py-2.5 bg-surface-900 border border-surface-700 text-white text-sm rounded-xl focus:outline-none focus:border-brand-500 [color-scheme:dark]"
            />
          </div>
          <span className="text-surface-500 hidden sm:block">-</span>
          <div className="relative w-full sm:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none z-10" />
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full sm:w-auto pl-9 pr-3 py-2.5 bg-surface-900 border border-surface-700 text-white text-sm rounded-xl focus:outline-none focus:border-brand-500 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredVisits.map((visit: any) => (
          <div key={visit.id} className="glass-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-800 bg-surface-900/50 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center font-bold text-white border border-surface-600">
                  {visit.user?.full_name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{visit.user?.full_name}</p>
                  <p className="text-xs text-brand-400 font-mono mt-0.5">Driver</p>
                </div>
              </div>
              
              {!visit.check_out_time ? (
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sedang Menginap
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Selesai
                </span>
              )}
            </div>
            
            <div className="p-5 flex-1">
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{visit.hotel_name}</h3>
                  {visit.notes && <p className="text-sm text-surface-400 mt-1 italic">"{visit.notes}"</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                  <p className="text-xs text-surface-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Check In
                  </p>
                  <p className="font-medium text-white">
                    {format(new Date(visit.check_in_time), "dd MMM yyyy", { locale: id })}
                  </p>
                  <p className="text-sm text-brand-400 font-mono mt-0.5">
                    {formatTime(visit.check_in_time)} WIB
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                  <p className="text-xs text-surface-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Check Out
                  </p>
                  {visit.check_out_time ? (
                    <>
                      <p className="font-medium text-white">
                        {format(new Date(visit.check_out_time), "dd MMM yyyy", { locale: id })}
                      </p>
                      <p className="text-sm text-brand-400 font-mono mt-0.5">
                        {formatTime(visit.check_out_time)} WIB
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-surface-500 mt-2 italic">-</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-3 pt-4 border-t border-surface-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 font-medium">Data Check In:</span>
                  <div className="flex gap-2">
                    {visit.selfie_check_in_url && (
                      <button 
                        onClick={() => setSelectedPhoto(visit.selfie_check_in_url)}
                        className="flex items-center gap-1.5 text-xs font-medium text-surface-300 hover:text-white px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Foto
                      </button>
                    )}
                    {visit.check_in_lat && visit.check_in_lng && (
                      <button 
                        onClick={() => setSelectedMap({ lat: visit.check_in_lat, lng: visit.check_in_lng, name: visit.hotel_name })}
                        className="flex items-center gap-1.5 text-xs font-medium text-surface-300 hover:text-white px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Peta
                      </button>
                    )}
                  </div>
                </div>

                {visit.check_out_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-500 font-medium">Data Check Out:</span>
                    <div className="flex gap-2">
                      {visit.selfie_check_out_url && (
                        <button 
                          onClick={() => setSelectedPhoto(visit.selfie_check_out_url)}
                          className="flex items-center gap-1.5 text-xs font-medium text-surface-300 hover:text-white px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Foto
                        </button>
                      )}
                      {visit.check_out_lat && visit.check_out_lng && (
                        <button 
                          onClick={() => setSelectedMap({ lat: visit.check_out_lat, lng: visit.check_out_lng, name: visit.hotel_name })}
                          className="flex items-center gap-1.5 text-xs font-medium text-surface-300 hover:text-white px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Peta
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-2 mt-1 border-t border-surface-800/50">
                  {visit.duration_minutes ? (
                    <p className="text-sm font-bold text-white">
                      Durasi: <span className="text-emerald-400">{getDurationString(visit.duration_minutes)}</span>
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-surface-500">-</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center">
              <h2 className="font-bold text-white">Bukti Foto Selfie</h2>
              <button onClick={() => setSelectedPhoto(null)} className="p-1 hover:bg-surface-700 rounded-lg text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-black/50">
              <img src={selectedPhoto} alt="Selfie" className="rounded-xl max-h-[60vh] object-contain" />
            </div>
          </div>
        </div>
      )}

      {selectedMap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card max-w-2xl w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-white">Lokasi GPS Validasi</h2>
                <p className="text-xs text-surface-400 font-mono mt-1">{selectedMap.lat}, {selectedMap.lng}</p>
              </div>
              <button onClick={() => setSelectedMap(null)} className="p-1 hover:bg-surface-700 rounded-lg text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-video bg-surface-900">
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
