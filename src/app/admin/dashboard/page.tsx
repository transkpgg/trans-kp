"use client";

import { Users, Building2, CreditCard, Car } from "lucide-react";
import { formatTime, cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminDashboardPage() {
  const { data: usersData } = useSWR("/api/users", fetcher);
  const { data: hotelData } = useSWR("/api/hotel-visits", fetcher);
  const { data: etollData } = useSWR("/api/etoll", fetcher);

  const users = Array.isArray(usersData) ? usersData : [];
  const hotelVisits = Array.isArray(hotelData) ? hotelData : [];
  const etollCards = Array.isArray(etollData) ? etollData : [];

  const driverCount = users.filter((u: any) => u.role === "karyawan").length;
  const hotelVisitsThisMonth = hotelVisits.length;
  const totalCards = etollCards.length;
  const cardsInUse = etollCards.filter((c: any) => c.status === "in_use").length;
  const cardsAvailable = etollCards.filter((c: any) => c.status === "available" || c.status === "returned").length;
  const cardsLost = etollCards.filter((c: any) => c.status === "lost").length;

  // Hotel visit status breakdown
  const hotelSelesai = hotelVisits.filter((v: any) => v.check_out_time).length;
  const hotelMenginap = hotelVisits.filter((v: any) => !v.check_out_time).length;

  // E-Toll status chart data
  const etollChartData = [
    { name: "Dipakai", value: cardsInUse, color: "#f59e0b" },
    { name: "Tersedia", value: cardsAvailable, color: "#10b981" },
    { name: "Hilang", value: cardsLost, color: "#ef4444" },
  ];

  // Hotel pie chart data
  const hotelPieData = [
    { name: "Selesai", value: hotelSelesai, color: "#10b981" },
    { name: "Menginap", value: hotelMenginap, color: "#f59e0b" },
  ];

  // Hotel visits per driver (top 5)
  const driverVisitMap: Record<string, { name: string; count: number }> = {};
  hotelVisits.forEach((v: any) => {
    const name = v.user?.full_name || "Unknown";
    if (!driverVisitMap[name]) driverVisitMap[name] = { name, count: 0 };
    driverVisitMap[name].count++;
  });
  const topDrivers = Object.values(driverVisitMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const driverBarColors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"];

  const stats = [
    { label: "Total Pengemudi", value: driverCount, icon: Users, color: "brand", trend: "Aktif bulan ini" },
    { label: "Kunjungan Hotel", value: hotelVisitsThisMonth, icon: Building2, color: "emerald", trend: "Total bulan ini" },
    { label: "Total Kartu E-Toll", value: totalCards, icon: CreditCard, color: "amber", trend: "Kartu terdaftar" },
    { label: "E-Toll Dipakai", value: cardsInUse, icon: Car, color: "red", trend: "Sedang dipinjam" },
  ];

  const recentHotels = [...hotelVisits].sort((a: any, b: any) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime()).slice(0, 5);
  const activeEtolls = etollCards.filter((c: any) => c.status === "in_use").slice(0, 5);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-3 shadow-xl">
          <p className="text-white font-medium text-sm">{label || payload[0].name}</p>
          <p className="text-brand-400 text-xs mt-1">{payload[0].value} {payload[0].value === 1 ? 'item' : 'item'}</p>
        </div>
      );
    }
    return null;
  };

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Bar Chart: Kunjungan Hotel per Pengemudi */}
        <div className="xl:col-span-2 glass-card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-white text-lg">Kunjungan Hotel per Pengemudi</h3>
            <p className="text-sm text-surface-400">Top pengemudi dengan kunjungan terbanyak</p>
          </div>
          <div className="h-[280px] w-full">
            {topDrivers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDrivers} margin={{ top: 10, right: 10, left: -15, bottom: 0 }} barSize={32}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    dy={10}
                    tickFormatter={(val: string) => val.length > 10 ? val.substring(0, 10) + '…' : val}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.5 }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Kunjungan">
                    {topDrivers.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={driverBarColors[index % driverBarColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-surface-500 text-sm">Belum ada data kunjungan hotel.</div>
            )}
          </div>
        </div>

        {/* Pie Charts Column */}
        <div className="space-y-6">
          {/* Pie: Status Hotel */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-white mb-1">Status Kunjungan Hotel</h3>
            <p className="text-xs text-surface-400 mb-4">Selesai vs Masih Menginap</p>
            <div className="h-[160px] w-full">
              {hotelVisitsThisMonth > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hotelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {hotelPieData.map((entry, index) => (
                        <Cell key={`pie-hotel-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value: string) => <span className="text-xs text-surface-300">{value}</span>}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-surface-500 text-sm">Belum ada data.</div>
              )}
            </div>
          </div>

          {/* Pie: Status E-Toll */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-white mb-1">Status Kartu E-Toll</h3>
            <p className="text-xs text-surface-400 mb-4">Distribusi status semua kartu</p>
            <div className="h-[160px] w-full">
              {totalCards > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={etollChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {etollChartData.map((entry, index) => (
                        <Cell key={`pie-etoll-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value: string) => <span className="text-xs text-surface-300">{value}</span>}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-surface-500 text-sm">Belum ada kartu.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hotel Visits */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              Kunjungan Hotel Terbaru
            </h3>
          </div>
          <div className="space-y-4">
            {recentHotels.length > 0 ? recentHotels.map((visit: any) => (
              <div key={visit.id} className="flex items-center gap-3 p-3 bg-surface-900/50 rounded-xl border border-surface-800">
                <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center font-bold text-white border border-surface-700">
                  {visit.user?.full_name?.substring(0, 2).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{visit.hotel_name}</p>
                  <p className="text-xs text-surface-400 truncate">{visit.user?.full_name || "Pengemudi"}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold px-2 py-0.5 rounded-md inline-block mb-1 bg-emerald-500/10 text-emerald-400">
                    {format(new Date(visit.check_in_time), "dd MMM", { locale: id })}
                  </div>
                  <p className="text-xs text-surface-400 font-mono">
                    {formatTime(visit.check_in_time)}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-surface-400 text-center py-4">Belum ada kunjungan hotel.</p>
            )}
          </div>
        </div>

        {/* Active E-Toll */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-brand-500" />
              E-Toll Sedang Dipakai
            </h3>
          </div>
          <div className="space-y-4">
            {activeEtolls.length > 0 ? activeEtolls.map((card: any) => {
              const activeHistory = card.histories?.[0];
              const userName = activeHistory?.user?.full_name || "Pengemudi";
              
              return (
                <div key={card.id} className="flex items-center gap-3 p-3 bg-surface-900/50 rounded-xl border border-surface-800">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{card.name || card.card_name}</p>
                    <p className="text-xs text-surface-400 truncate">Oleh: {userName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold px-2 py-0.5 rounded-md inline-block mb-1 bg-amber-500/10 text-amber-400">
                      IN USE
                    </div>
                    <p className="text-xs text-brand-400 font-mono font-medium">
                      Rp {(card.balance / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-surface-400 text-center py-4">Tidak ada E-Toll yang sedang dipinjam.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
