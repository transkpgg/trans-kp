"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Filter, MapPin, Clock, CheckCircle2, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { mockAttendances, mockBranches } from "@/lib/mock-data";
import { formatTime, cn } from "@/lib/utils";
import { Attendance } from "@/types";

export default function AttendanceMonitoringPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);

  // Filter logic
  const filteredRecords = mockAttendances.filter(record => {
    const matchesDate = record.date === selectedDate;
    const matchesBranch = selectedBranch === "all" || record.branch_id === selectedBranch;
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus;
    
    return matchesDate && matchesBranch && matchesStatus;
  });

  // Calculate stats based on filtered date and branch
  const statsBase = mockAttendances.filter(r => r.date === selectedDate && (selectedBranch === "all" || r.branch_id === selectedBranch));
  const statsHadir = statsBase.filter(r => r.status === 'present').length;
  const statsTelat = statsBase.filter(r => r.status === 'late').length;
  const statsAbsen = statsBase.filter(r => r.status === 'absent').length;
  const statsIzin = statsBase.filter(r => r.status === 'permission' || r.status === 'sick').length;

  return (
    <div className="space-y-6 slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Monitoring Absensi</h1>
        <p className="text-sm text-surface-400 mt-1">Pantau kehadiran karyawan secara real-time.</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-l-2 border-l-emerald-500">
          <p className="text-xs text-surface-400 uppercase font-semibold mb-1">Hadir (Tepat Waktu)</p>
          <p className="text-2xl font-bold text-white">{statsHadir}</p>
        </div>
        <div className="glass-card p-4 border-l-2 border-l-amber-500">
          <p className="text-xs text-surface-400 uppercase font-semibold mb-1">Hadir (Terlambat)</p>
          <p className="text-2xl font-bold text-white">{statsTelat}</p>
        </div>
        <div className="glass-card p-4 border-l-2 border-l-red-500">
          <p className="text-xs text-surface-400 uppercase font-semibold mb-1">Tidak Hadir (Alpa)</p>
          <p className="text-2xl font-bold text-white">{statsAbsen}</p>
        </div>
        <div className="glass-card p-4 border-l-2 border-l-blue-500">
          <p className="text-xs text-surface-400 uppercase font-semibold mb-1">Sakit / Izin</p>
          <p className="text-2xl font-bold text-white">{statsIzin}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-auto pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 [color-scheme:dark]"
          />
        </div>
        
        <select 
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full md:w-48 bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500"
        >
          <option value="all">Semua Cabang</option>
          {mockBranches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full md:w-48 bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500"
        >
          <option value="all">Semua Status</option>
          <option value="present">Hadir</option>
          <option value="late">Terlambat</option>
          <option value="permission">Izin/Sakit</option>
          <option value="absent">Alpa</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-surface-800 bg-surface-900/50">
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Karyawan</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Cabang</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-center">Waktu</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-center">Keamanan GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {filteredRecords.length > 0 ? filteredRecords.map((record) => (
                <tr 
                  key={record.id} 
                  onClick={() => setSelectedRecord(record)}
                  className="hover:bg-surface-800/50 transition-colors cursor-pointer group"
                >
                  <td className="p-4">
                    <p className="font-medium text-white group-hover:text-brand-400 transition-colors">{record.user_name}</p>
                    <p className="text-xs text-surface-400 font-mono mt-0.5">{record.user_nik}</p>
                  </td>
                  <td className="p-4 text-sm text-surface-300">
                    {record.branch_name}
                  </td>
                  <td className="p-4">
                    {record.status !== 'absent' && record.status !== 'permission' && record.status !== 'sick' ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-brand-400 font-medium">IN</p>
                          <p className="font-mono text-sm text-white">{record.check_in_time ? formatTime(record.check_in_time) : '--:--'}</p>
                        </div>
                        <div className="w-px h-6 bg-surface-700" />
                        <div className="text-center">
                          <p className="text-xs text-surface-400 font-medium">OUT</p>
                          <p className="font-mono text-sm text-white">{record.check_out_time ? formatTime(record.check_out_time) : '--:--'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-surface-500 text-sm">-</div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className={cn(
                      "inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase",
                      record.status === 'present' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      record.status === 'late' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      record.status === 'permission' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      "bg-red-500/10 text-red-400 border border-red-500/20"
                    )}>
                      {record.status === 'present' ? 'Hadir' :
                       record.status === 'late' ? 'Telat' :
                       record.status === 'permission' ? 'Izin' : 'Absen'}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {record.gps_flag === 'valid' && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aman
                      </div>
                    )}
                    {record.gps_flag === 'suspect' && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Suspect
                      </div>
                    )}
                    {record.gps_flag === 'outside_geofence' && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5" /> Luar Area
                      </div>
                    )}
                    {!record.gps_flag && (
                      <span className="text-surface-500 text-xs">-</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-surface-400">
                    Tidak ada data absensi untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal Overlay */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={() => setSelectedRecord(null)}>
          <div className="glass-card w-full max-w-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-700 flex justify-between items-start bg-surface-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedRecord.user_name}</h2>
                <p className="text-brand-400 font-mono text-sm mt-1">{selectedRecord.user_nik} &bull; {selectedRecord.branch_name}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-surface-400 hover:text-white bg-surface-800 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-950 overflow-y-auto max-h-[70vh]">
              
              {/* Check In Info */}
              {selectedRecord.check_in_time ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Data Check In
                  </h3>
                  
                  <div className="aspect-square rounded-2xl bg-surface-800 border-2 border-surface-700 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center text-surface-500">
                      Foto Selfie
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm bg-surface-900 p-4 rounded-xl border border-surface-800">
                    <div className="flex justify-between">
                      <span className="text-surface-400">Waktu:</span>
                      <span className="text-white font-medium">{formatTime(selectedRecord.check_in_time)} WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Status GPS:</span>
                      <span className={cn(
                        "font-medium", 
                        selectedRecord.gps_flag === 'valid' ? 'text-emerald-400' : 'text-amber-400'
                      )}>
                        {selectedRecord.gps_flag === 'valid' ? 'Valid' : 'Suspect (Mock)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Akurasi:</span>
                      <span className="text-white font-mono">{Math.round(selectedRecord.check_in_accuracy || 0)} meter</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Koordinat:</span>
                      <span className="text-brand-400 font-mono text-xs">{selectedRecord.check_in_lat?.toFixed(5)}, {selectedRecord.check_in_lng?.toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center bg-surface-900 rounded-2xl border border-dashed border-surface-700">
                  <p className="text-surface-500">Tidak ada data check in</p>
                </div>
              )}

              {/* Check Out Info */}
              {selectedRecord.check_out_time ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" /> Data Check Out
                  </h3>
                  
                  <div className="aspect-square rounded-2xl bg-surface-800 border-2 border-surface-700 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center text-surface-500">
                      Foto Selfie
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm bg-surface-900 p-4 rounded-xl border border-surface-800">
                    <div className="flex justify-between">
                      <span className="text-surface-400">Waktu:</span>
                      <span className="text-white font-medium">{formatTime(selectedRecord.check_out_time)} WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Akurasi:</span>
                      <span className="text-white font-mono">{Math.round(selectedRecord.check_out_accuracy || 0)} meter</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Koordinat:</span>
                      <span className="text-brand-400 font-mono text-xs">{selectedRecord.check_out_lat?.toFixed(5)}, {selectedRecord.check_out_lng?.toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-surface-900 rounded-2xl border border-dashed border-surface-700">
                  <Clock className="w-8 h-8 text-surface-600 mb-2" />
                  <p className="text-surface-500">Belum check out</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
