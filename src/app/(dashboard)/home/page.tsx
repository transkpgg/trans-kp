"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Building2, 
  Receipt, 
  Calculator, 
  Fuel, 
  CreditCard, 
  Database, 
  FileBarChart, 
  Clock
} from "lucide-react";
import { formatTime, cn, getInitials } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function UserHomePage() {
  const { data: meData } = useSWR("/api/auth/me", fetcher);
  const currentUser = meData?.user || { id: "", full_name: "Memuat...", jabatan: "Staf", nik: "-", role: "karyawan" };
  const isAdmin = currentUser.role === "admin_cabang" || currentUser.role === "super_admin";

  const [currentDate, setCurrentDate] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: visitsData } = useSWR("/api/hotel-visits", fetcher);
  const recentVisits = Array.isArray(visitsData) ? visitsData : [];
  
  // Periksa apakah sedang menginap di hotel
  const activeVisits = recentVisits.filter((v: any) => !v.check_out_time);
  const activeVisit = !isAdmin ? activeVisits[0] : null;

  // Kumpulan 7 Menu Layanan Utama Beranda
  const menuList = [
    {
      name: "Kunjungan Hotel",
      href: isAdmin ? "/admin/hotel-visits" : "/hotel-visit",
      icon: Building2,
      color: "border-indigo-500/40 bg-gradient-to-br from-indigo-500/20 to-blue-600/10 text-indigo-400 shadow-indigo-500/10",
    },
    {
      name: "Bon Pengemudi",
      href: "/bon-pengemudi",
      icon: Receipt,
      color: "border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-teal-600/10 text-emerald-400 shadow-emerald-500/10",
    },
    {
      name: "Hitung UPD",
      href: "/admin/upd",
      icon: Calculator,
      color: "border-purple-500/40 bg-gradient-to-br from-purple-500/20 to-violet-600/10 text-purple-400 shadow-purple-500/10",
    },
    {
      name: "Monitoring BBM",
      href: "/admin/fuel-monitoring",
      icon: Fuel,
      color: "border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-400 shadow-amber-500/10",
    },
    {
      name: "Kartu E-Toll",
      href: "/admin/etoll",
      icon: CreditCard,
      color: "border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-pink-600/10 text-rose-400 shadow-rose-500/10",
    },
    {
      name: "Master Data",
      href: "/admin/master",
      icon: Database,
      color: "border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/20 to-purple-600/10 text-fuchsia-400 shadow-fuchsia-500/10",
    },
    {
      name: "Laporan & Rekap",
      href: "/admin/reports",
      icon: FileBarChart,
      color: "border-teal-500/40 bg-gradient-to-br from-teal-500/20 to-emerald-600/10 text-teal-400 shadow-teal-500/10",
    },
  ];

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      
      {/* Profil Header Pengguna (Gaya Aplikasi Mobile Enterprise) */}
      <div className="glass-card p-4 relative overflow-hidden rounded-2xl border border-surface-800 bg-gradient-to-r from-surface-900/90 to-surface-900/60 shadow-lg">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full gradient-brand flex items-center justify-center font-bold text-base text-white shadow-md shadow-brand-500/20 shrink-0">
            {getInitials(currentUser.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-tight">
              {currentUser.nik && currentUser.nik !== "-" ? `${currentUser.nik} - ` : ""}{currentUser.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-brand-400 font-medium truncate">
                {currentUser.jabatan || "Karyawan Operasional"}
              </span>
              {isAdmin && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase shrink-0">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tanggal & Hari Aktif */}
        <div className="mt-3 pt-2.5 border-t border-surface-800/80 flex items-center justify-between text-xs text-surface-400">
          <span className="flex items-center gap-1.5 font-medium text-[11px] sm:text-xs">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            {format(currentDate, "EEEE, dd MMMM yyyy", { locale: id })}
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sistem Aktif
          </span>
        </div>
      </div>

      {/* Kartu Status Aktif (Tampil jika pengemudi sedang menginap di hotel atau jika admin memonitor) */}
      {isAdmin && activeVisits.length > 0 ? (
        <div className="glass-card p-3.5 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-surface-900 to-brand-500/15 border border-amber-500/30 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                  Monitoring Hotel Pengemudi
                </p>
                <p className="font-bold text-white text-xs sm:text-sm truncate mt-0.5">
                  {activeVisits.length} Pengemudi Sedang Menginap
                </p>
                <p className="text-[10px] text-surface-400 truncate">
                  {activeVisits.map((v: any) => v.user?.full_name || v.hotel_name).slice(0, 2).join(", ")}
                  {activeVisits.length > 2 ? ` +${activeVisits.length - 2} lainnya` : ""}
                </p>
              </div>
            </div>
            <Link 
              href="/admin/hotel-visits" 
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all shrink-0"
            >
              Pantau
            </Link>
          </div>
        </div>
      ) : activeVisit && (
        <div className="glass-card p-3.5 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-surface-900 to-brand-500/15 border border-amber-500/30 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                  Sedang Menginap
                </p>
                <p className="font-bold text-white text-xs sm:text-sm truncate mt-0.5">{activeVisit.hotel_name}</p>
                <p className="text-[10px] text-surface-400">Mulai {formatTime(activeVisit.check_in_time)}</p>
              </div>
            </div>
            <Link 
              href="/hotel-visit" 
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all shrink-0"
            >
              Check Out
            </Link>
          </div>
        </div>
      )}

      {/* Grid Kumpulan Menu Pintas Utama (Muat dalam 1 layar tanpa scroll) */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-surface-800 shadow-lg">
        {/* Grid Ikon Menu Pintas: 4 kolom rapi */}
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {menuList.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center text-center group cursor-pointer select-none transition-transform active:scale-95"
              >
                {/* Ikon Lingkaran dengan Ring Warna Khas */}
                <div 
                  className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-md",
                    item.color
                  )}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-3" strokeWidth={2.2} />
                </div>
                {/* Label Menu */}
                <span className="text-[10px] sm:text-[11px] font-semibold text-surface-300 group-hover:text-white transition-colors mt-1.5 leading-tight max-w-[76px] line-clamp-2">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
