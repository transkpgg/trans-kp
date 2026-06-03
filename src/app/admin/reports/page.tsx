"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Calendar, Filter, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { mockMonthlyChartData, mockBranches } from "@/lib/mock-data";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("harian");

  return (
    <div className="space-y-6 slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Laporan & Ekspor</h1>
        <p className="text-sm text-surface-400 mt-1">Unduh laporan absensi dalam format PDF atau Excel.</p>
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
                    onClick={() => setReportType("harian")}
                    className={`py-2 px-3 text-sm font-medium rounded-xl border transition-colors ${
                      reportType === "harian" 
                      ? "bg-brand-500/20 border-brand-500 text-brand-400" 
                      : "bg-surface-900 border-surface-700 text-surface-400 hover:bg-surface-800"
                    }`}
                  >
                    Harian Detail
                  </button>
                  <button 
                    onClick={() => setReportType("rekap")}
                    className={`py-2 px-3 text-sm font-medium rounded-xl border transition-colors ${
                      reportType === "rekap" 
                      ? "bg-brand-500/20 border-brand-500 text-brand-400" 
                      : "bg-surface-900 border-surface-700 text-surface-400 hover:bg-surface-800"
                    }`}
                  >
                    Rekap Bulanan
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Rentang Waktu</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="date" className="w-full pl-8 pr-2 py-2.5 bg-surface-900 border border-surface-700 text-white text-xs rounded-xl focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="date" className="w-full pl-8 pr-2 py-2.5 bg-surface-900 border border-surface-700 text-white text-xs rounded-xl focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Cabang</label>
                <select className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500">
                  <option value="all">Semua Cabang</option>
                  {mockBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
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
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-6">Trend Kehadiran (6 Bulan Terakhir)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockMonthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="hadir" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHadir)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Preview Data Laporan</h3>
              <span className="text-xs text-surface-400">Menampilkan 5 data teratas</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-surface-800 text-surface-400">
                    <th className="py-3 font-medium">Tanggal</th>
                    <th className="py-3 font-medium">NIK</th>
                    <th className="py-3 font-medium">Nama</th>
                    <th className="py-3 font-medium text-center">In</th>
                    <th className="py-3 font-medium text-center">Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/50 text-surface-200">
                  <tr>
                    <td className="py-3">01 Jun 2024</td>
                    <td className="py-3 font-mono text-brand-400">TKP-001</td>
                    <td className="py-3">Ahmad Rizki P.</td>
                    <td className="py-3 text-center">07:55</td>
                    <td className="py-3 text-center">16:10</td>
                  </tr>
                  <tr>
                    <td className="py-3">01 Jun 2024</td>
                    <td className="py-3 font-mono text-brand-400">TKP-003</td>
                    <td className="py-3">Budi Santoso</td>
                    <td className="py-3 text-center text-amber-400">08:15</td>
                    <td className="py-3 text-center">16:20</td>
                  </tr>
                  <tr>
                    <td className="py-3">01 Jun 2024</td>
                    <td className="py-3 font-mono text-brand-400">TKP-004</td>
                    <td className="py-3">Dewi Kartika</td>
                    <td className="py-3 text-center">07:45</td>
                    <td className="py-3 text-center">16:05</td>
                  </tr>
                  <tr>
                    <td className="py-3">01 Jun 2024</td>
                    <td className="py-3 font-mono text-brand-400">TKP-007</td>
                    <td className="py-3">Gunawan Wibowo</td>
                    <td className="py-3 text-center text-red-400">-</td>
                    <td className="py-3 text-center text-red-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 bg-surface-900/50 border border-surface-800 rounded-lg text-center">
              <p className="text-xs text-surface-400">Generate laporan untuk melihat data lengkap (Total 142 baris)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
