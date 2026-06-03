"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, Search, CheckCircle2, AlertTriangle, Clock, MapPin, ArrowRight, X } from "lucide-react";
import { mockAttendances, mockCurrentUser } from "@/lib/mock-data";
import { formatTime, cn } from "@/lib/utils";
import { Attendance } from "@/types";

export default function HistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Filter records for current user and selected month
  const records = mockAttendances.filter(record => {
    const recordDate = new Date(record.date);
    return record.user_id === mockCurrentUser.id && 
           recordDate.getMonth() === selectedMonth && 
           recordDate.getFullYear() === selectedYear;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between slide-up">
        <h1 className="text-2xl font-bold text-white">Riwayat Absensi</h1>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="p-2 rounded-xl bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="glass-card p-4 flex gap-3 slide-up" style={{ animationDuration: '0.2s' }}>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-28 bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          >
            {[2023, 2024, 2025].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center fade-in">
            <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
              <CalendarIcon className="w-8 h-8 text-surface-500" />
            </div>
            <p className="text-white font-medium">Belum ada riwayat</p>
            <p className="text-sm text-surface-400 mt-1">Tidak ada data absensi untuk bulan ini.</p>
          </div>
        ) : (
          records.map((record, index) => (
            <div 
              key={record.id} 
              onClick={() => setSelectedRecord(record)}
              className="glass-card-hover p-4 cursor-pointer slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-white">
                    {format(new Date(record.date), "dd MMMM yyyy", { locale: id })}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">{record.branch_name}</p>
                </div>
                <div className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider",
                  record.status === 'present' ? "status-present" :
                  record.status === 'late' ? "status-late" :
                  record.status === 'permission' ? "status-permission" :
                  "status-absent"
                )}>
                  {record.status === 'present' ? 'Hadir' :
                   record.status === 'late' ? 'Telat' :
                   record.status === 'permission' ? 'Izin' : 'Absen'}
                </div>
              </div>

              {record.status !== 'absent' && record.status !== 'permission' && record.status !== 'sick' && (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-900/50 border border-surface-800/50">
                  <div className="flex-1 flex flex-col items-center justify-center relative">
                    <p className="text-xs text-surface-400 mb-1">Check In</p>
                    <p className="font-semibold text-white">
                      {record.check_in_time ? formatTime(record.check_in_time) : '-'}
                    </p>
                  </div>
                  
                  <div className="h-px bg-surface-700 w-8 relative">
                    <ArrowRight className="w-4 h-4 text-surface-600 absolute -top-2 left-2" />
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <p className="text-xs text-surface-400 mb-1">Check Out</p>
                    <p className="font-semibold text-white">
                      {record.check_out_time ? formatTime(record.check_out_time) : '-'}
                    </p>
                  </div>
                </div>
              )}
              
              {record.notes && (
                <div className="mt-3 text-sm text-surface-300 italic p-2 bg-surface-900/30 rounded-lg">
                  "{record.notes}"
                </div>
              )}
              
              {/* GPS Flag Indicator */}
              {record.gps_flag === 'suspect' && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>GPS Suspect (Perlu validasi admin)</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detail Modal Overlay */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900/50">
              <h3 className="font-semibold text-white">Detail Absensi</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-surface-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              <p className="text-center font-bold text-lg text-white mb-6">
                {format(new Date(selectedRecord.date), "EEEE, dd MMMM yyyy", { locale: id })}
              </p>
              
              {selectedRecord.check_in_time && (
                <div className="space-y-3 mb-6">
                  <h4 className="text-sm font-medium text-brand-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500" /> Check In
                  </h4>
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-xl bg-surface-800 border border-surface-700 overflow-hidden flex-shrink-0 relative">
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-surface-500">Foto Selfie</div>
                      {/* Placeholder for image */}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <p className="flex items-center gap-2 text-surface-200">
                        <Clock className="w-4 h-4 text-surface-400" /> {formatTime(selectedRecord.check_in_time)}
                      </p>
                      <p className="flex gap-2 text-surface-200 items-start">
                        <MapPin className="w-4 h-4 text-surface-400 shrink-0 mt-0.5" /> 
                        <span className="text-xs">{selectedRecord.branch_name}<br/>Akurasi: {Math.round(selectedRecord.check_in_accuracy || 0)}m</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedRecord.check_out_time && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Check Out
                  </h4>
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-xl bg-surface-800 border border-surface-700 overflow-hidden flex-shrink-0 relative">
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-surface-500">Foto Selfie</div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <p className="flex items-center gap-2 text-surface-200">
                        <Clock className="w-4 h-4 text-surface-400" /> {formatTime(selectedRecord.check_out_time)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-surface-700 bg-surface-900/50">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 rounded-xl bg-surface-800 text-white font-medium hover:bg-surface-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
