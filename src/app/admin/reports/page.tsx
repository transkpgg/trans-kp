"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Calendar, Filter, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { mockMonthlyChartData } from "@/lib/mock-data";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ReportsPage() {
  const [reportType, setReportType] = useState("hotel");
  
  const { data: hotelData } = useSWR("/api/hotel-visits", fetcher);
  const { data: etollData } = useSWR("/api/etoll", fetcher);

  const hotelVisits = Array.isArray(hotelData) ? hotelData : [];
  const etollCards = Array.isArray(etollData) ? etollData : [];

  return (
    <div className="space-y-6 slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Laporan & Ekspor</h1>
        <p className="text-sm text-surface-400 mt-1">Unduh laporan kunjungan hotel dan penggunaan E-Toll dalam format PDF atau Excel.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Report Generator Config */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Konfigurasi Laporan</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Jenis Laporan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setReportType("hotel")}
                    className={`py-2 px-3 text-sm font-medium rounded-xl border transition-colors ${
                      reportType === "hotel" 
                      ? "bg-brand-500/20 border-brand-500 text-brand-400" 
                      : "bg-surface-900 border-surface-700 text-surface-400 hover:bg-surface-800"
                    }`}
                  >
                    Kunjungan Hotel
                  </button>
                  <button 
                    onClick={() => setReportType("etoll")}
                    className={`py-2 px-3 text-sm font-medium rounded-xl border transition-colors ${
                      reportType === "etoll" 
                      ? "bg-brand-500/20 border-brand-500 text-brand-400" 
                      : "bg-surface-900 border-surface-700 text-surface-400 hover:bg-surface-800"
                    }`}
                  >
                    Penggunaan E-Toll
                  </button>
                </div>
              </div>

              {reportType === "hotel" && (
                <div className="space-y-1.5 slide-up">
                  <label className="text-xs font-medium text-surface-300">Rentang Waktu (Bulan)</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="month" className="w-full pl-8 pr-2 py-2.5 bg-surface-900 border border-surface-700 text-white text-xs rounded-xl focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
                  </div>
                </div>
              )}

              {reportType === "etoll" && (
                <div className="space-y-1.5 slide-up">
                  <label className="text-xs font-medium text-surface-300">Status Kartu E-Toll</label>
                  <select className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500">
                    <option value="all">Semua Status</option>
                    <option value="in_use">Sedang Dipinjam</option>
                    <option value="available">Tersedia / Sudah Kembali</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3 pt-6 border-t border-surface-800">
              <button className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 font-medium hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 group">
                <FileText className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                Unduh PDF
              </button>
              <button className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-medium hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 group">
                <FileSpreadsheet className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                Unduh Excel
              </button>
            </div>
          </div>
        </div>

        {/* Data Preview & Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {reportType === "hotel" && (
            <>
              <div className="glass-card p-6 slide-up">
                <h3 className="font-semibold text-white mb-6">Trend Kunjungan Hotel (6 Bulan Terakhir)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockMonthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHotel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value) => [value, "Kunjungan"]}
                      />
                      <Area type="monotone" dataKey="hadir" name="Total Kunjungan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHotel)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Preview Data Kunjungan Hotel</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-surface-800 text-surface-400">
                        <th className="py-3 font-medium">Tanggal</th>
                        <th className="py-3 font-medium">Pengemudi</th>
                        <th className="py-3 font-medium">Hotel</th>
                        <th className="py-3 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800/50 text-surface-200">
                      {hotelVisits.slice(0, 4).map((visit: any) => (
                        <tr key={visit.id}>
                          <td className="py-3">{format(new Date(visit.check_in_time), "dd MMM yyyy", { locale: id })}</td>
                          <td className="py-3 font-medium">{visit.user?.full_name || "Pengemudi"}</td>
                          <td className="py-3">{visit.hotel_name}</td>
                          <td className="py-3 text-center">
                            {visit.check_out_time ? (
                              <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded">Selesai</span>
                            ) : (
                              <span className="text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded">Menginap</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {reportType === "etoll" && (
            <div className="glass-card p-6 slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Preview Data E-Toll</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-surface-800 text-surface-400">
                      <th className="py-3 font-medium">No. Kartu</th>
                      <th className="py-3 font-medium">Nama Kartu</th>
                      <th className="py-3 font-medium">Sisa Saldo</th>
                      <th className="py-3 font-medium text-center">Status</th>
                      <th className="py-3 font-medium">Pemakai Aktif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/50 text-surface-200">
                    {etollCards.slice(0, 5).map((card: any) => {
                      const activeHistory = card.histories?.[0];
                      const activeUser = card.status === "in_use" && activeHistory?.user?.full_name ? activeHistory.user.full_name : "-";
                      return (
                        <tr key={card.id}>
                          <td className="py-3 font-mono text-brand-400">{card.card_number}</td>
                          <td className="py-3">{card.name || card.card_name}</td>
                          <td className="py-3">Rp {(card.balance / 1000).toFixed(0)}k</td>
                          <td className="py-3 text-center">
                            {card.status === "in_use" ? (
                              <span className="text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded">Dipakai</span>
                            ) : (
                              <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded">Tersedia</span>
                            )}
                          </td>
                          <td className="py-3 text-surface-400 text-xs">{activeUser}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
