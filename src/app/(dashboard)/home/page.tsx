"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { MapPin, LogOut, Clock, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { mockCurrentUser, mockWeeklyChartData, mockAttendances } from "@/lib/mock-data";
import { formatTime, cn } from "@/lib/utils";

export default function UserHomePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Fake timer just for UI feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = format(currentDate, "yyyy-MM-dd");
  const todayAttendance = mockAttendances.find(
    a => a.user_id === mockCurrentUser.id && a.date === todayStr
  );

  const hasCheckedIn = !!todayAttendance?.check_in_time;
  const hasCheckedOut = !!todayAttendance?.check_out_time;
  
  // Get recent 3 attendances (excluding today if checked in)
  const recentAttendances = mockAttendances
    .filter(a => a.user_id === mockCurrentUser.id && a.date !== todayStr && a.status !== 'absent')
    .slice(0, 3);

  return (
    <div className="space-y-6">
      
      {/* Date Card */}
      <div className="glass-card p-5 fade-in">
        <p className="text-surface-400 text-sm">Hari ini</p>
        <p className="text-2xl font-bold text-white tracking-tight mt-1">
          {format(currentDate, "EEEE, dd MMMM yyyy", { locale: id })}
        </p>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-4 slide-up" style={{ animationDelay: "0.1s" }}>
        <Link 
          href={hasCheckedIn ? "#" : "/check-in"}
          className={cn(
            "p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all",
            hasCheckedIn 
              ? "bg-surface-800/50 border border-surface-700/50 opacity-50 cursor-not-allowed" 
              : "gradient-success shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95"
          )}
        >
          <div className="p-3 rounded-full bg-white/20">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-lg">Check In</p>
            {hasCheckedIn && todayAttendance?.check_in_time && (
              <p className="text-xs text-white/80 mt-1">{formatTime(todayAttendance.check_in_time)}</p>
            )}
          </div>
        </Link>

        <Link 
          href={hasCheckedOut || !hasCheckedIn ? "#" : "/check-out"}
          className={cn(
            "p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all",
            hasCheckedOut || !hasCheckedIn
              ? "bg-surface-800/50 border border-surface-700/50 opacity-50 cursor-not-allowed" 
              : "gradient-brand shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95"
          )}
        >
          <div className="p-3 rounded-full bg-white/20">
            <LogOut className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-lg">Check Out</p>
            {hasCheckedOut && todayAttendance?.check_out_time && (
              <p className="text-xs text-white/80 mt-1">{formatTime(todayAttendance.check_out_time)}</p>
            )}
          </div>
        </Link>
      </div>

      {/* Status & Schedule Cards */}
      <div className="grid grid-cols-1 gap-4 slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-surface-800">
              <CalendarIcon className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Jadwal Hari Ini</p>
              <p className="font-medium text-white mt-0.5">Shift Pagi (08:00 - 17:00)</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-surface-800">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Status Kehadiran</p>
              {hasCheckedIn ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-medium text-white">
                    {todayAttendance?.status === 'late' ? 'Terlambat' : 'Tepat Waktu'}
                  </p>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              ) : (
                <p className="font-medium text-surface-300 mt-0.5">Belum Check In</p>
              )}
            </div>
          </div>
          {hasCheckedIn && todayAttendance?.check_in_time && (
            <div className="text-right">
              <p className="text-2xl font-bold text-white tracking-tighter">{formatTime(todayAttendance.check_in_time)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="glass-card p-5 slide-up" style={{ animationDelay: "0.3s" }}>
        <h3 className="font-medium text-white mb-4">Statistik 7 Hari Terakhir</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockWeeklyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: '#1e293b', opacity: 0.5 }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <Bar dataKey="hadir" stackId="a" radius={[4, 4, 0, 0]}>
                {mockWeeklyChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#10b981" />
                ))}
              </Bar>
              <Bar dataKey="terlambat" stackId="a" radius={[4, 4, 0, 0]}>
                {mockWeeklyChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#f59e0b" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="slide-up" style={{ animationDelay: "0.4s" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">Aktivitas Terakhir</h3>
          <Link href="/history" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="space-y-3">
          {recentAttendances.map((record) => (
            <div key={record.id} className="glass-card p-4 flex items-center justify-between group cursor-pointer hover:bg-surface-800/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  record.status === 'present' ? "bg-emerald-500/10 text-emerald-400" :
                  record.status === 'late' ? "bg-amber-500/10 text-amber-400" :
                  "bg-surface-800 text-surface-400"
                )}>
                  {record.status === 'present' ? <CheckCircle2 className="w-5 h-5" /> : 
                   record.status === 'late' ? <AlertTriangle className="w-5 h-5" /> : 
                   <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">
                    {format(new Date(record.date), "dd MMM yyyy", { locale: id })}
                  </p>
                  <p className="text-xs text-surface-400 flex items-center gap-1">
                    {record.check_in_time && formatTime(record.check_in_time)} 
                    {record.check_out_time && (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        {formatTime(record.check_out_time)}
                      </>
                    )}
                  </p>
                </div>
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
          ))}
        </div>
      </div>
      
    </div>
  );
}
