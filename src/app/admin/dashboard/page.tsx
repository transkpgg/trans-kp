"use client";

import { Users, UserCheck, Clock, UserX, AlertTriangle, ArrowUpRight, ArrowDownRight, MoreHorizontal, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { mockDashboardStats, mockWeeklyChartData, mockAttendances } from "@/lib/mock-data";
import { formatTime, cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdminDashboardPage() {
  const stats = [
    { 
      label: "Total Karyawan", 
      value: mockDashboardStats.total_employees, 
      icon: Users, 
      color: "brand",
      trend: "+2 this month" 
    },
    { 
      label: "Hadir Hari Ini", 
      value: mockDashboardStats.present_today, 
      icon: UserCheck, 
      color: "emerald",
      trend: "84% kehadiran" 
    },
    { 
      label: "Terlambat", 
      value: mockDashboardStats.late_today, 
      icon: Clock, 
      color: "amber",
      trend: "-1 dari kemarin" 
    },
    { 
      label: "Tidak Hadir", 
      value: mockDashboardStats.absent_today, 
      icon: UserX, 
      color: "red",
      trend: "Sakit/Izin/Alpa" 
    },
  ];

  const recentAttendances = mockAttendances.filter(a => a.status !== 'absent').slice(0, 5);
  const alerts = mockAttendances.filter(a => a.gps_flag === 'suspect').slice(0, 3);

  return (
    <div className="space-y-6 slide-up">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label} 
              className={cn(
                "glass-card p-5 relative overflow-hidden group slide-up",
                stat.color === 'brand' && "border-l-4 border-l-brand-500",
                stat.color === 'emerald' && "border-l-4 border-l-emerald-500",
                stat.color === 'amber' && "border-l-4 border-l-amber-500",
                stat.color === 'red' && "border-l-4 border-l-red-500"
              )}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-xs text-surface-400 uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                  <p className="text-xs text-surface-500 mt-2">{stat.trend}</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl",
                  stat.color === 'brand' && "bg-brand-500/10 text-brand-400",
                  stat.color === 'emerald' && "bg-emerald-500/10 text-emerald-400",
                  stat.color === 'amber' && "bg-amber-500/10 text-amber-400",
                  stat.color === 'red' && "bg-red-500/10 text-red-400"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              {/* Background gradient effect on hover */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br from-transparent to-current",
                stat.color === 'brand' && "text-brand-500",
                stat.color === 'emerald' && "text-emerald-500",
                stat.color === 'amber' && "text-amber-500",
                stat.color === 'red' && "text-red-500"
              )} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="xl:col-span-2 glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-white text-lg">Statistik Kehadiran Mingguan</h3>
              <p className="text-sm text-surface-400">7 Hari terakhir untuk semua cabang</p>
            </div>
            <button className="p-2 text-surface-400 hover:text-white transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockWeeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.5 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Bar dataKey="hadir" stackId="a" radius={[0, 0, 4, 4]}>
                  {mockWeeklyChartData.map((entry, index) => (
                    <Cell key={`cell-hadir-${index}`} fill="#10b981" />
                  ))}
                </Bar>
                <Bar dataKey="terlambat" stackId="a">
                  {mockWeeklyChartData.map((entry, index) => (
                    <Cell key={`cell-telat-${index}`} fill="#f59e0b" />
                  ))}
                </Bar>
                <Bar dataKey="absen" stackId="a" radius={[4, 4, 0, 0]}>
                  {mockWeeklyChartData.map((entry, index) => (
                    <Cell key={`cell-absen-${index}`} fill="#ef4444" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-surface-300">Hadir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-surface-300">Terlambat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-surface-300">Absen</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Alerts */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Peringatan
              </h3>
              <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded-md">{alerts.length} Baru</span>
            </div>
            <div className="space-y-3">
              {alerts.length > 0 ? alerts.map((alert) => (
                <div key={`alert-${alert.id}`} className="p-3 bg-surface-900/50 border-l-2 border-l-amber-500 rounded-r-xl border border-y-surface-800 border-r-surface-800 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{alert.user_name}</p>
                    <p className="text-xs text-surface-400 mt-0.5">GPS Suspect terdeteksi saat check in dari lokasi tidak wajar.</p>
                    <p className="text-[10px] text-brand-400 mt-1">{format(new Date(alert.date), "dd MMM", { locale: id })} - {alert.check_in_time && formatTime(alert.check_in_time)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-surface-400 text-center py-4">Tidak ada peringatan keamanan saat ini.</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Aktivitas Terbaru</h3>
            </div>
            <div className="space-y-4">
              {recentAttendances.map((record) => (
                <div key={record.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center font-bold text-white border border-surface-700">
                    {record.user_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{record.user_name}</p>
                    <p className="text-xs text-surface-400 truncate">{record.branch_name}</p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-md inline-block mb-1",
                      record.status === 'present' ? "bg-emerald-500/10 text-emerald-400" :
                      record.status === 'late' ? "bg-amber-500/10 text-amber-400" :
                      "bg-blue-500/10 text-blue-400"
                    )}>
                      {record.status === 'present' ? 'HADIR' :
                       record.status === 'late' ? 'TELAT' : 'IZIN'}
                    </div>
                    <p className="text-xs text-surface-400 font-mono">
                      {record.check_in_time ? formatTime(record.check_in_time) : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
