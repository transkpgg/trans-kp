"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Building2, 
  Calendar, 
  Search, 
  MapPin, 
  Clock, 
  ImageIcon, 
  X, 
  CheckCircle2, 
  LogOut, 
  Trash2, 
  AlertCircle,
  Users,
  BedDouble,
  RefreshCw,
  Filter
} from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { getDurationString, formatTime, cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const safeFormatDate = (dateStr: any, fmt: string) => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), fmt, { locale: id });
  } catch (e) {
    return "-";
  }
};

export default function AdminHotelVisitsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState({ 
    start: "", 
    end: "" 
  });

  const { data: visits, error, isLoading, mutate } = useSWR("/api/hotel-visits", fetcher, {
    refreshInterval: 8000,
  });
  
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);
  const [selectedMap, setSelectedMap] = useState<{ lat: number; lng: number; name: string; type: string } | null>(null);
  
  // Action Modals
  const [checkoutVisit, setCheckoutVisit] = useState<any | null>(null);
  const [deleteVisit, setDeleteVisit] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visitsData: any[] = Array.isArray(visits) ? visits : [];

  // Summary Metrics
  const totalVisits = visitsData.length;
  const activeVisitsCount = visitsData.filter((v: any) => !v.check_out_time).length;
  const completedVisitsCount = visitsData.filter((v: any) => !!v.check_out_time).length;
  const uniqueDriversCount = useMemo(() => {
    const driverIds = new Set(visitsData.map((v: any) => v.user_id || v.user?.username).filter(Boolean));
    return driverIds.size;
  }, [visitsData]);

  // Filtered List
  const filteredVisits = useMemo(() => {
    return visitsData.filter((visit: any) => {
      // Status filter
      if (statusFilter === "active" && visit.check_out_time) return false;
      if (statusFilter === "completed" && !visit.check_out_time) return false;

      // Search filter
      const q = search.toLowerCase();
      const matchSearch = 
        !search ||
        (visit.user?.full_name?.toLowerCase().includes(q) ?? false) ||
        (visit.user?.nik?.toLowerCase().includes(q) ?? false) ||
        (visit.user?.username?.toLowerCase().includes(q) ?? false) ||
        (visit.hotel_name?.toLowerCase().includes(q) ?? false) ||
        (visit.notes?.toLowerCase().includes(q) ?? false);

      if (!matchSearch) return false;

      // Date Range filter
      if (dateRange.start && visit.check_in_time) {
        const visitDate = format(new Date(visit.check_in_time), "yyyy-MM-dd");
        if (visitDate < dateRange.start) return false;
      }
      if (dateRange.end && visit.check_in_time) {
        const visitDate = format(new Date(visit.check_in_time), "yyyy-MM-dd");
        if (visitDate > dateRange.end) return false;
      }

      return true;
    });
  }, [visitsData, search, statusFilter, dateRange]);

  // Handler: Admin force check-out
  const handleAdminCheckout = async () => {
    if (!checkoutVisit) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/hotel-visits/${checkoutVisit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_out_lat: checkoutVisit.check_in_lat || -7.2575,
          check_out_lng: checkoutVisit.check_in_lng || 112.7521,
          selfie_check_out_url: checkoutVisit.selfie_check_in_url || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal check-out");
      }

      toast.success(`Check-out pengemudi ${checkoutVisit.user?.full_name || ""} berhasil diselesaikan.`);
      setCheckoutVisit(null);
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyelesaikan check-out");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Admin delete visit
  const handleDeleteVisit = async () => {
    if (!deleteVisit) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/hotel-visits/${deleteVisit.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menghapus");
      }

      toast.success("Data kunjungan hotel berhasil dihapus.");
      setDeleteVisit(null);
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus kunjungan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 slide-up">
        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-brand-400" />
              Monitoring Kunjungan Hotel
            </h1>
            <p className="text-sm text-surface-400 mt-1">
              Pantau check-in dan check-out hotel seluruh pengemudi secara real-time.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-semibold border border-surface-700 transition-colors w-fit"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-brand-400")} />
            Perbarui Data
          </button>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-card p-4 rounded-2xl border border-surface-800 bg-surface-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Total Kunjungan</span>
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{totalVisits}</p>
            <p className="text-[11px] text-surface-400 mt-0.5">Semua riwayat tercatat</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Sedang Menginap
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BedDouble className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-amber-400 mt-2">{activeVisitsCount}</p>
            <p className="text-[11px] text-surface-400 mt-0.5">Pengemudi aktif di hotel</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Selesai Check Out</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-emerald-400 mt-2">{completedVisitsCount}</p>
            <p className="text-[11px] text-surface-400 mt-0.5">Kunjungan terselesaikan</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-surface-800 bg-surface-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Pengemudi</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{uniqueDriversCount}</p>
            <p className="text-[11px] text-surface-400 mt-0.5">Total pengemudi terdaftar</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="glass-card p-4 rounded-2xl border border-surface-800 space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-800/80">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                statusFilter === "all"
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                  : "bg-surface-850 text-surface-400 hover:text-white hover:bg-surface-800"
              )}
            >
              Semua Kunjungan
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                {totalVisits}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                statusFilter === "active"
                  ? "bg-amber-500 text-amber-950 font-extrabold shadow-md shadow-amber-500/20"
                  : "bg-surface-850 text-surface-400 hover:text-amber-400 hover:bg-surface-800"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Sedang Menginap
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current font-mono">
                {activeVisitsCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                statusFilter === "completed"
                  ? "bg-emerald-500 text-emerald-950 font-extrabold shadow-md shadow-emerald-500/20"
                  : "bg-surface-850 text-surface-400 hover:text-emerald-400 hover:bg-surface-800"
              )}
            >
              Selesai
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current font-mono">
                {completedVisitsCount}
              </span>
            </button>
          </div>

          {/* Search & Date Controls */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input 
                type="text" 
                placeholder="Cari pengemudi, NIK, nama hotel, atau keterangan..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl text-sm focus:outline-none focus:border-brand-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-colors"
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <div className="bg-surface-900/90 border border-surface-700/80 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-surface-300">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" />
                  <span className="uppercase text-[11px] tracking-wider text-surface-400">Periode</span>
                  {(dateRange.start || dateRange.end) && (
                    <span className="w-2 h-2 rounded-full bg-brand-400 inline-block animate-pulse" />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = format(new Date(), "yyyy-MM-dd");
                      setDateRange({ start: today, end: today });
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all shrink-0",
                      dateRange.start === format(new Date(), "yyyy-MM-dd") && dateRange.end === format(new Date(), "yyyy-MM-dd")
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700"
                    )}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const startMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
                      const endMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
                      setDateRange({ start: startMonth, end: endMonth });
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-all shrink-0"
                  >
                    Bulan Ini
                  </button>
                  {(dateRange.start || dateRange.end) && (
                    <button
                      type="button"
                      onClick={() => setDateRange({ start: "", end: "" })}
                      className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all flex items-center gap-1 shrink-0"
                      title="Reset Periode"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center bg-surface-950 border border-surface-700 rounded-xl px-2.5 py-1.5 focus-within:border-brand-500 transition-colors">
                    <span className="text-[10px] font-bold text-surface-500 uppercase mr-1.5 shrink-0">
                      Dari
                    </span>
                    <input 
                      type="date" 
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full bg-transparent text-white text-xs font-mono focus:outline-none [color-scheme:dark]"
                      title="Dari Tanggal"
                    />
                  </div>
                </div>

                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center bg-surface-950 border border-surface-700 rounded-xl px-2.5 py-1.5 focus-within:border-brand-500 transition-colors">
                    <span className="text-[10px] font-bold text-surface-500 uppercase mr-1.5 shrink-0">
                      S/d
                    </span>
                    <input 
                      type="date" 
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full bg-transparent text-white text-xs font-mono focus:outline-none [color-scheme:dark]"
                      title="Sampai Tanggal"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredVisits.length === 0 ? (
            <div className="xl:col-span-2 glass-card p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-surface-800 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-surface-800/60 border border-surface-700/60 flex items-center justify-center mb-3">
                <Building2 className="w-7 h-7 text-surface-500" />
              </div>
              <p className="text-white font-semibold text-base">Tidak ada data kunjungan hotel</p>
              <p className="text-sm text-surface-400 mt-1 max-w-sm">
                {search || statusFilter !== "all" || dateRange.start || dateRange.end
                  ? "Tidak ada data yang cocok dengan kriteria pencarian dan filter Anda."
                  : "Belum ada kunjungan hotel yang tercatat dari driver."}
              </p>
              {(search || statusFilter !== "all" || dateRange.start || dateRange.end) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setDateRange({ start: "", end: "" });
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          ) : (
            filteredVisits.map((visit: any) => {
              const driverName = visit.user?.full_name || "Pengemudi";
              const driverNik = visit.user?.nik || visit.user?.username || "-";
              const initials = driverName.substring(0, 2).toUpperCase();
              const isStaying = !visit.check_out_time;

              return (
                <div 
                  key={visit.id} 
                  className={cn(
                    "glass-card overflow-hidden flex flex-col rounded-2xl border transition-all duration-200",
                    isStaying 
                      ? "border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5" 
                      : "border-surface-800 hover:border-surface-700"
                  )}
                >
                  {/* Card Header: Driver Info & Status */}
                  <div className={cn(
                    "p-4 border-b flex justify-between items-center",
                    isStaying 
                      ? "bg-amber-500/5 border-amber-500/20" 
                      : "bg-surface-900/50 border-surface-800"
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border",
                        isStaying
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-surface-800 border-surface-700 text-white"
                      )}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                          {driverName}
                        </p>
                        <p className="text-xs text-surface-400 font-mono mt-0.5">
                          NIK: <span className="text-brand-400 font-semibold">{driverNik}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {isStaying ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sedang Menginap
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      )}

                      {/* Admin Delete Action */}
                      <button
                        onClick={() => setDeleteVisit(visit)}
                        title="Hapus Kunjungan"
                        className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Hotel Name & Notes */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={cn(
                          "p-2.5 rounded-xl shrink-0 mt-0.5",
                          isStaying ? "bg-amber-500/15 text-amber-400" : "bg-brand-500/10 text-brand-400"
                        )}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-white leading-tight">
                            {visit.hotel_name}
                          </h3>
                          {visit.notes ? (
                            <p className="text-xs text-surface-300 mt-1.5 bg-surface-900/60 p-2 rounded-lg border border-surface-800 italic">
                              "{visit.notes}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-surface-500 mt-0.5 italic">Tidak ada catatan perjalanan dinas</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Timestamps Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-surface-900/70 border border-surface-800">
                          <p className="text-[10px] text-surface-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-brand-400" /> Check In
                          </p>
                          <p className="font-semibold text-white text-xs sm:text-sm">
                            {safeFormatDate(visit.check_in_time, "dd MMM yyyy")}
                          </p>
                          <p className="text-xs text-brand-400 font-mono font-semibold mt-0.5">
                            {formatTime(visit.check_in_time)} WIB
                          </p>
                        </div>

                        <div className={cn(
                          "p-3 rounded-xl border",
                          isStaying 
                            ? "bg-amber-500/5 border-amber-500/20" 
                            : "bg-surface-900/70 border-surface-800"
                        )}>
                          <p className="text-[10px] text-surface-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-brand-400" /> Check Out
                          </p>
                          {visit.check_out_time ? (
                            <>
                              <p className="font-semibold text-white text-xs sm:text-sm">
                                {safeFormatDate(visit.check_out_time, "dd MMM yyyy")}
                              </p>
                              <p className="text-xs text-brand-400 font-mono font-semibold mt-0.5">
                                {formatTime(visit.check_out_time)} WIB
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-amber-400 font-semibold italic mt-1">
                              Belum Check Out
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Media Proof & Actions Bar */}
                    <div className="pt-3 border-t border-surface-800/80 space-y-2.5">
                      {/* Check-in Proof */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-surface-400 font-medium">Validasi Check In:</span>
                        <div className="flex gap-1.5">
                          {visit.selfie_check_in_url ? (
                            <button 
                              onClick={() => setSelectedPhoto({ url: visit.selfie_check_in_url, title: `Selfie Check In - ${driverName}` })}
                              className="flex items-center gap-1 text-[11px] font-semibold text-surface-300 hover:text-white px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                            >
                              <ImageIcon className="w-3 h-3 text-brand-400" /> Foto Selfie
                            </button>
                          ) : (
                            <span className="text-[11px] text-surface-500 italic">Tanpa Foto</span>
                          )}
                          {visit.check_in_lat && visit.check_in_lng && (
                            <button 
                              onClick={() => setSelectedMap({ 
                                lat: visit.check_in_lat, 
                                lng: visit.check_in_lng, 
                                name: visit.hotel_name, 
                                type: "Lokasi Check In" 
                              })}
                              className="flex items-center gap-1 text-[11px] font-semibold text-surface-300 hover:text-white px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                            >
                              <MapPin className="w-3 h-3 text-emerald-400" /> Peta GPS
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Check-out Proof (if finished) */}
                      {visit.check_out_time && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-surface-400 font-medium">Validasi Check Out:</span>
                          <div className="flex gap-1.5">
                            {visit.selfie_check_out_url ? (
                              <button 
                                onClick={() => setSelectedPhoto({ url: visit.selfie_check_out_url, title: `Selfie Check Out - ${driverName}` })}
                                className="flex items-center gap-1 text-[11px] font-semibold text-surface-300 hover:text-white px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                              >
                                <ImageIcon className="w-3 h-3 text-brand-400" /> Foto Selfie
                              </button>
                            ) : (
                              <span className="text-[11px] text-surface-500 italic">Tanpa Foto</span>
                            )}
                            {visit.check_out_lat && visit.check_out_lng && (
                              <button 
                                onClick={() => setSelectedMap({ 
                                  lat: visit.check_out_lat, 
                                  lng: visit.check_out_lng, 
                                  name: visit.hotel_name, 
                                  type: "Lokasi Check Out" 
                                })}
                                className="flex items-center gap-1 text-[11px] font-semibold text-surface-300 hover:text-white px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700"
                              >
                                <MapPin className="w-3 h-3 text-emerald-400" /> Peta GPS
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Card Footer: Durasi & Admin Checkout Action */}
                      <div className="pt-2 border-t border-surface-800/50 flex items-center justify-between">
                        <div>
                          {visit.duration_minutes ? (
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                              Durasi: <span className="text-emerald-400 font-semibold">{getDurationString(visit.duration_minutes)}</span>
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-surface-500 italic">Sedang berjalan...</p>
                          )}
                        </div>

                        {/* Admin Force Checkout Button */}
                        {isStaying && (
                          <button
                            onClick={() => setCheckoutVisit(visit)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Selesaikan Check Out
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Foto Selfie Preview */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" 
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="glass-card max-w-md w-full overflow-hidden flex flex-col transform transition-all shadow-2xl rounded-2xl border border-surface-700" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900/70">
              <h2 className="font-bold text-white text-sm">{selectedPhoto.title}</h2>
              <button onClick={() => setSelectedPhoto(null)} className="p-1 hover:bg-surface-700 rounded-lg text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-black/70">
              <img 
                src={selectedPhoto.url} 
                alt="Selfie Driver" 
                className="rounded-xl max-h-[65vh] object-contain shadow-lg" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Peta Lokasi GPS */}
      {selectedMap && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" 
          onClick={() => setSelectedMap(null)}
        >
          <div 
            className="glass-card max-w-2xl w-full overflow-hidden flex flex-col transform transition-all shadow-2xl rounded-2xl border border-surface-700" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900/70">
              <div>
                <h2 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  {selectedMap.type} - {selectedMap.name}
                </h2>
                <p className="text-xs text-surface-400 font-mono mt-0.5">
                  Koordinat: {selectedMap.lat.toFixed(6)}, {selectedMap.lng.toFixed(6)}
                </p>
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
                src={`https://www.google.com/maps?q=${selectedMap.lat},${selectedMap.lng}&hl=id;z=15&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Admin Check-out */}
      {checkoutVisit && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in"
          onClick={() => !isSubmitting && setCheckoutVisit(null)}
        >
          <div 
            className="glass-card max-w-md w-full p-6 rounded-2xl border border-amber-500/30 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Selesaikan Kunjungan Pengemudi?</h3>
                <p className="text-xs text-surface-400 mt-0.5">Tindakan manual oleh Super Admin / Admin</p>
              </div>
            </div>

            <p className="text-xs text-surface-300 leading-relaxed bg-surface-900/60 p-3 rounded-xl border border-surface-800">
              Anda akan menyelesaikan check-out untuk pengemudi <strong className="text-white">{checkoutVisit.user?.full_name}</strong> di hotel <strong className="text-white">{checkoutVisit.hotel_name}</strong> saat ini. Durasi menginap akan dihitung otomatis.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCheckoutVisit(null)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAdminCheckout}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? "Memproses..." : "Ya, Selesaikan Check Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Kunjungan */}
      {deleteVisit && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in"
          onClick={() => !isSubmitting && setDeleteVisit(null)}
        >
          <div 
            className="glass-card max-w-md w-full p-6 rounded-2xl border border-red-500/30 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Data Kunjungan Hotel?</h3>
                <p className="text-xs text-surface-400 mt-0.5">Data yang dihapus tidak dapat dipulihkan</p>
              </div>
            </div>

            <p className="text-xs text-surface-300 leading-relaxed bg-surface-900/60 p-3 rounded-xl border border-surface-800">
              Apakah Anda yakin ingin menghapus data kunjungan pengemudi <strong className="text-white">{deleteVisit.user?.full_name}</strong> di hotel <strong className="text-white">{deleteVisit.hotel_name}</strong>?
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDeleteVisit(null)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteVisit}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
