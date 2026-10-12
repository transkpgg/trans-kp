"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Fuel,
  Gauge,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Car,
  User,
  MapPin,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  Activity,
  Layers,
  X,
  Eye,
  Wifi,
  WifiOff,
  Calendar,
  DollarSign,
  ChevronRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRp } from "@/lib/fuel-monitoring";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FuelMonitoringPage() {
  const [activeTab, setActiveTab] = useState<"fleet" | "anomalies" | "trips" | "config">("fleet");

  // Filters
  const [search, setSearch] = useState("");
  const [nopolFilter, setNopolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const [verifyStatus, setVerifyStatus] = useState("sedang_diperiksa");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Data fetching
  const { data: tripsData, mutate: mutateTrips, isLoading: isLoadingTrips } = useSWR(
    `/api/fuel-monitoring/trips${startDate ? `?startDate=${startDate}` : ""}${endDate ? `${startDate ? "&" : "?"}endDate=${endDate}` : ""}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const { data: anomaliesData, mutate: mutateAnomalies, isLoading: isLoadingAnomalies } = useSWR(
    "/api/fuel-monitoring/anomalies",
    fetcher,
    { refreshInterval: 15000 }
  );

  const { data: vehiclesData } = useSWR("/api/vehicles", fetcher);
  const { data: configData, mutate: mutateConfig } = useSWR("/api/fuel-monitoring/config", fetcher);

  const trips: any[] = Array.isArray(tripsData) ? tripsData : [];
  const anomalies: any[] = Array.isArray(anomaliesData) ? anomaliesData : [];
  const vehicles: any[] = Array.isArray(vehiclesData) ? vehiclesData : [];

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch =
        !search ||
        t.nopol?.toLowerCase().includes(search.toLowerCase()) ||
        t.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));

      const matchNopol = nopolFilter === "all" || t.nopol === nopolFilter;
      const matchStatus = statusFilter === "all" || t.anomaly_status === statusFilter;

      return matchSearch && matchNopol && matchStatus;
    });
  }, [trips, search, nopolFilter, statusFilter]);

  // Overall Statistics KPI
  const stats = useMemo(() => {
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((acc, t) => acc + (t.odo_distance || 0), 0);
    const totalFuelUsed = trips.reduce((acc, t) => acc + (t.fuel_used || 0), 0);
    const totalFuelCost = trips.reduce((acc, t) => acc + (t.fuel_cost || 0), 0);

    const avgKml = totalDistance > 0 && totalFuelUsed > 0 ? Number((totalDistance / totalFuelUsed).toFixed(2)) : 0;
    const avgL100km = totalDistance > 0 && totalFuelUsed > 0 ? Number(((totalFuelUsed / totalDistance) * 100).toFixed(2)) : 0;
    const avgCostPerKm = totalDistance > 0 && totalFuelCost > 0 ? Math.round(totalFuelCost / totalDistance) : 0;

    const criticalAnomalies = anomalies.filter((a) => a.severity === "critical" && a.status !== "tidak_terbukti").length;
    const warningAnomalies = anomalies.filter((a) => a.severity === "warning" && a.status !== "tidak_terbukti").length;
    const pendingReviewCount = anomalies.filter((a) => a.status === "baru" || a.status === "sedang_diperiksa").length;

    const connectedVehiclesCount = trips.filter((t) => t.sensor_status === "terhubung").length;

    return {
      totalTrips,
      totalDistance,
      totalFuelUsed,
      totalFuelCost,
      avgKml,
      avgL100km,
      avgCostPerKm,
      criticalAnomalies,
      warningAnomalies,
      pendingReviewCount,
      connectedVehiclesCount,
    };
  }, [trips, anomalies]);

  // Handle Verify Anomaly Submit
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnomaly) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/fuel-monitoring/anomalies/${selectedAnomaly.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: verifyStatus,
          verification_notes: verifyNotes,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        setIsVerifyModalOpen(false);
        setSelectedAnomaly(null);
        mutateAnomalies();
        mutateTrips();
      } else {
        toast.error(result.message || "Gagal memperbarui status anomali");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsVerifying(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (filteredTrips.length === 0) {
      toast.warning("Tidak ada data untuk diekspor");
      return;
    }

    const dataToExport = filteredTrips.map((t, idx) => ({
      No: idx + 1,
      Tanggal: t.trip_date ? format(new Date(t.trip_date), "dd/MM/yyyy HH:mm") : "-",
      Nopol: t.nopol,
      Pengemudi: t.driver_name,
      "KM Awal": t.start_km,
      "KM Akhir": t.end_km,
      "Jarak Tempuh (km)": t.odo_distance,
      "Jarak GPS (km)": t.gps_distance ?? "Belum Terhubung",
      "BBM Terpakai (L)": t.fuel_used,
      "Pengisian (L)": t.fuel_refill,
      "Biaya BBM (Rp)": t.fuel_cost,
      "Konsumsi Aktual (km/L)": t.actual_kml,
      "Liter / 100km": t.actual_l100km,
      "Biaya / km (Rp)": t.cost_per_km,
      "Standar Kendaraan (km/L)": t.standard_kml ?? "-",
      "Selisih (%)": t.diff_percent ? `${t.diff_percent}%` : "0%",
      "Status Evaluasi":
        t.anomaly_status === "indikasi_anomali"
          ? "Indikasi Anomali"
          : t.anomaly_status === "perlu_diperiksa"
          ? "Perlu Diperiksa"
          : "Normal",
      "Sensor Telemetri": t.sensor_status === "terhubung" ? "Terhubung" : "Belum Terhubung",
      Metode: t.calculation_method,
      Catatan: t.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit BBM");
    XLSX.writeFile(wb, `Laporan_Monitoring_BBM_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast.success("Laporan Excel berhasil diunduh");
  };

  return (
    <div className="space-y-6 slide-up pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Monitoring BBM & Deteksi Anomali</h1>
              <p className="text-xs text-surface-400 mt-0.5">
                Pengawasan konsumsi bahan bakar, audit km/liter, telemetri tangki, dan investigasi deviasi armada.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-surface-700 bg-surface-900/60 text-surface-200 text-sm font-medium hover:bg-surface-800 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export Excel
          </button>
          <button
            onClick={() => setIsAddTripModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-medium hover:shadow-lg hover:shadow-brand-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Catat Perjalanan & BBM
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Konsumsi BBM</span>
            <Fuel className="w-4 h-4 text-brand-400" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-white">
              {stats.totalFuelUsed.toLocaleString("id-ID")} <span className="text-xs text-surface-400 font-normal">Liter</span>
            </h3>
            <p className="text-[11px] text-surface-400 mt-1">
              Total Pembelian: <span className="text-surface-200 font-medium">{formatRp(stats.totalFuelCost)}</span>
            </p>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata Konsumsi</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-emerald-400">
              {stats.avgKml} <span className="text-xs text-surface-400 font-normal">km/L</span>
            </h3>
            <p className="text-[11px] text-surface-400 mt-1">
              Setara: <span className="text-surface-200 font-medium">{stats.avgL100km} L/100km</span> • Biaya: <span className="text-surface-200 font-medium">{formatRp(stats.avgCostPerKm)}/km</span>
            </p>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Jarak Tempuh</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-cyan-400">
              {stats.totalDistance.toLocaleString("id-ID")} <span className="text-xs text-surface-400 font-normal">km</span>
            </h3>
            <p className="text-[11px] text-surface-400 mt-1">
              Dari <span className="text-white font-medium">{stats.totalTrips}</span> catatan perjalanan terdata
            </p>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Temuan Anomali</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-rose-400">{stats.criticalAnomalies + stats.warningAnomalies}</h3>
            <span className="text-xs text-surface-400">kasus ({stats.pendingReviewCount} perlu verifikasi)</span>
          </div>
          <p className="text-[11px] text-rose-300/80 mt-1">
            {stats.criticalAnomalies} Kritis • {stats.warningAnomalies} Peringatan deviasi
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-surface-800 pb-2 overflow-x-auto">
        {[
          { id: "fleet", label: "Ringkasan & Real-Time Armada", icon: Car },
          { id: "anomalies", label: `Deteksi Anomali (${anomalies.filter(a => a.status === 'baru').length} Baru)`, icon: ShieldAlert, badgeColor: "bg-rose-500/20 text-rose-300" },
          { id: "trips", label: "Riwayat & Audit BBM", icon: FileSpreadsheet },
          { id: "config", label: "Konfigurasi Ambang Batas", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-sm"
                : "text-surface-400 hover:text-white hover:bg-surface-800/60"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content 1: FLEET OVERVIEW & REAL-TIME */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          {/* Transparency Notice banner */}
          <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-800 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-surface-300 leading-relaxed">
              <span className="font-semibold text-white">Status Sensor Telemetri & GPS: </span>
              Armada yang belum terpasang perangkat keras sensor tangki atau GPS tracker secara transparan bertanda{" "}
              <span className="text-surface-400 font-semibold px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700">
                Belum Terhubung
              </span>
              . Data konsumsi armada tersebut dihitung akurat melalui metode <span className="text-white font-medium">Full-to-Full</span> dan audit struk transaksi tanpa data rekaan.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const latestTrip = trips.find((t) => t.nopol === v.nopol);
              const isSensorConnected = latestTrip?.sensor_status === "terhubung";
              const fuelPercent = latestTrip?.fuel_percent ?? null;
              const standardKml = v.fuel_consumption || latestTrip?.standard_kml;
              const actualKml = latestTrip?.actual_kml;

              return (
                <div key={v.id} className="glass-card p-5 space-y-4 hover:border-surface-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-base">{v.nopol}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-surface-800 text-surface-300 border border-surface-700">
                          {v.type || "Mobil"}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 mt-1">{v.name}</p>
                    </div>

                    {/* Sensor Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {isSensorConnected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <Wifi className="w-3 h-3" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-surface-400 bg-surface-800 border border-surface-700 px-2 py-0.5 rounded-full" title="Sensor tangki/GPS IoT belum terpasang">
                          <WifiOff className="w-3 h-3 text-surface-500" /> Belum Terhubung
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fuel Tank Level Indicator */}
                  <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-surface-400 flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-amber-400" /> Level Tangki BBM
                      </span>
                      {fuelPercent !== null ? (
                        <span className="font-mono font-bold text-white">
                          {latestTrip.current_fuel_level} L ({fuelPercent}%)
                        </span>
                      ) : (
                        <span className="text-surface-500 italic text-[11px]">Sensor Belum Terhubung</span>
                      )}
                    </div>

                    <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          fuelPercent === null
                            ? "w-0"
                            : fuelPercent < 20
                            ? "bg-rose-500"
                            : fuelPercent < 45
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${fuelPercent ?? 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-surface-500">
                      <span>Status Mesin: {latestTrip?.vehicle_status || "Parkir"}</span>
                      <span>Kapasitas: {v.tank_capacity || 60} L</span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-surface-900/50 border border-surface-800">
                      <span className="text-[10px] text-surface-400 uppercase font-semibold">Konsumsi Aktual</span>
                      <p className="font-bold text-white text-sm mt-0.5">
                        {actualKml ? `${actualKml} km/L` : "-"}
                      </p>
                      <span className="text-[10px] text-surface-400">
                        {latestTrip?.actual_l100km ? `${latestTrip.actual_l100km} L/100km` : ""}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-surface-900/50 border border-surface-800">
                      <span className="text-[10px] text-surface-400 uppercase font-semibold">Standar Kendaraan</span>
                      <p className="font-bold text-surface-200 text-sm mt-0.5">
                        {standardKml ? `${standardKml} km/L` : "-"}
                      </p>
                      {latestTrip?.diff_percent !== undefined && latestTrip?.diff_percent !== null && (
                        <span
                          className={cn(
                            "text-[10px] font-semibold",
                            latestTrip.diff_percent > 15 ? "text-rose-400" : "text-emerald-400"
                          )}
                        >
                          {latestTrip.diff_percent > 0 ? `+${latestTrip.diff_percent}% boros` : `${latestTrip.diff_percent}% hemat`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-800 flex items-center justify-between text-xs text-surface-400">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-surface-500" />
                      {latestTrip?.driver_name || "Belum ada perjalanan"}
                    </span>
                    {latestTrip && (
                      <button
                        onClick={() => {
                          setSelectedTrip(latestTrip);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 text-[11px]"
                      >
                        Detail Audit <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 2: DETEKSI ANOMALI */}
      {activeTab === "anomalies" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-surface-300 leading-relaxed">
              <span className="font-bold text-amber-300">Prinsip Analisis Investigasi: </span>
              Seluruh temuan sistem berlabel <span className="text-white font-semibold italic">“Indikasi Anomali”</span>.
              Kondisi kemacetan ekstrem, kemiringan posisi tangki saat parkir di lereng, dan penggunaan AC/idle time
              dapat memengaruhi data. Verifikasi temuan dengan konfirmasi lapangan sebelum mengambil kesimpulan.
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                <input
                  type="text"
                  placeholder="Cari nopol, pengemudi, jenis..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="text-xs text-surface-400">
                Total <span className="text-white font-semibold">{anomalies.length}</span> temuan tersimpan
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="uppercase tracking-wider text-surface-400 border-b border-surface-800 bg-surface-900/50">
                    <th className="px-4 py-3">Waktu & Tanggal</th>
                    <th className="px-4 py-3">Kendaraan / Pengemudi</th>
                    <th className="px-4 py-3">Indikasi Temuan</th>
                    <th className="px-4 py-3">Besar Selisih</th>
                    <th className="px-4 py-3">Tingkat</th>
                    <th className="px-4 py-3">Status Verifikasi</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {isLoadingAnomalies ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-surface-500">
                        Memuat data anomali...
                      </td>
                    </tr>
                  ) : anomalies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-surface-500">
                        Tidak ada indikasi anomali yang terdeteksi. Seluruh konsumsi armada dalam batas wajar.
                      </td>
                    </tr>
                  ) : (
                    anomalies.map((a) => (
                      <tr key={a.id} className="hover:bg-surface-800/25 transition-colors">
                        <td className="px-4 py-3 font-mono text-surface-300">
                          {format(new Date(a.timestamp), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-white">{a.nopol}</span>
                          <p className="text-[11px] text-surface-400">{a.driver_name || "Tidak diketahui"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-surface-200">{a.title}</span>
                          <p className="text-[11px] text-surface-400 mt-0.5 line-clamp-1">{a.description}</p>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-amber-300">
                          {a.diff_value || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              a.severity === "critical"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : a.severity === "warning"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            )}
                          >
                            {a.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold capitalize",
                              a.status === "selesai"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : a.status === "tidak_terbukti"
                                ? "bg-surface-800 text-surface-400"
                                : a.status === "sedang_diperiksa"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-rose-500/15 text-rose-300 animate-pulse"
                            )}
                          >
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedAnomaly(a);
                              setVerifyStatus(a.status);
                              setVerifyNotes(a.verification_notes || "");
                              setIsVerifyModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-surface-700 bg-surface-900 text-brand-400 hover:bg-brand-500/10 transition-colors text-[11px] font-medium"
                          >
                            Tindak Lanjut
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: RIWAYAT & AUDIT BBM */}
      {activeTab === "trips" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Pencarian</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Nopol, pengemudi..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Armada (Nopol)</label>
                <select
                  value={nopolFilter}
                  onChange={(e) => setNopolFilter(e.target.value)}
                  className="mt-1 w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="all">Semua Kendaraan</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.nopol}>
                      {v.nopol} - {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Status Evaluasi</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="normal">🟢 Normal</option>
                  <option value="perlu_diperiksa">🟡 Perlu Diperiksa</option>
                  <option value="indikasi_anomali">🔴 Indikasi Anomali</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Periode</label>
                <div className="flex gap-1.5 mt-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-1/2 bg-surface-950 border border-surface-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-1/2 bg-surface-950 border border-surface-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="uppercase tracking-wider text-surface-400 border-b border-surface-800 bg-surface-900/50">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Kendaraan & Pengemudi</th>
                    <th className="px-4 py-3">KM Awal - Akhir</th>
                    <th className="px-4 py-3">Jarak</th>
                    <th className="px-4 py-3">BBM Terpakai</th>
                    <th className="px-4 py-3">Konsumsi Aktual</th>
                    <th className="px-4 py-3">Standar</th>
                    <th className="px-4 py-3">Biaya/km</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {isLoadingTrips ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-surface-500">
                        Memuat data audit...
                      </td>
                    </tr>
                  ) : filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-surface-500">
                        Belum ada catatan perjalanan dan BBM. Klik &quot;Catat Perjalanan & BBM&quot; untuk menambahkan data.
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-800/25 transition-colors">
                        <td className="px-4 py-3 font-mono text-surface-300">
                          {format(new Date(t.trip_date), "dd/MM/yy HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-white">{t.nopol}</span>
                          <p className="text-[11px] text-surface-400">{t.driver_name}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-surface-300">
                          {t.start_km.toLocaleString()} - {t.end_km.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-cyan-300">
                          {t.odo_distance} km
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className="text-white font-bold">{t.fuel_used} L</span>
                          {t.fuel_refill > 0 && (
                            <p className="text-[10px] text-surface-500">+{t.fuel_refill} L isi</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className="text-emerald-400 font-bold">{t.actual_kml} km/L</span>
                          <p className="text-[10px] text-surface-500">{t.actual_l100km} L/100km</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-surface-300">
                          {t.standard_kml ? `${t.standard_kml} km/L` : "-"}
                          {t.diff_percent !== null && t.diff_percent !== undefined && (
                            <p
                              className={cn(
                                "text-[10px] font-semibold",
                                t.diff_percent > 15 ? "text-rose-400" : "text-emerald-400"
                              )}
                            >
                              {t.diff_percent > 0 ? `+${t.diff_percent}%` : `${t.diff_percent}%`}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-surface-200">
                          {formatRp(t.cost_per_km)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              t.anomaly_status === "indikasi_anomali"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : t.anomaly_status === "perlu_diperiksa"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            )}
                          >
                            {t.anomaly_status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedTrip(t);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                            title="Lihat Detail Audit"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: CONFIGURATION THRESHOLDS */}
      {activeTab === "config" && (
        <div className="glass-card max-w-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-400" /> Pengaturan Ambang Batas Deteksi Anomali
            </h3>
            <p className="text-xs text-surface-400 mt-1">
              Konfigurasi parameter otomatis untuk mendeteksi indikasi anomali dan manipulasi konsumsi BBM armada.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              try {
                const res = await fetch("/api/fuel-monitoring/config", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    max_consumption_diff_percent: fd.get("max_consumption_diff_percent"),
                    sudden_drop_liter: fd.get("sudden_drop_liter"),
                    max_gps_odo_diff_percent: fd.get("max_gps_odo_diff_percent"),
                    offline_timeout_minutes: fd.get("offline_timeout_minutes"),
                  }),
                });
                const result = await res.json();
                if (res.ok) {
                  toast.success(result.message);
                  mutateConfig();
                } else {
                  toast.error(result.message || "Gagal menyimpan konfigurasi");
                }
              } catch {
                toast.error("Terjadi kesalahan jaringan");
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                Toleransi Deviasi Konsumsi BBM (%)
              </label>
              <input
                type="number"
                name="max_consumption_diff_percent"
                step="any"
                defaultValue={configData?.max_consumption_diff_percent ?? 20}
                required
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[11px] text-surface-500">
                Jika konsumsi aktual lebih boros dari persentase ini dibanding standar kendaraan, sistem otomatis menandai sebagai indikasi anomali.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                Batas Penurunan BBM Tiba-Tiba saat Parkir (Liter)
              </label>
              <input
                type="number"
                name="sudden_drop_liter"
                step="any"
                defaultValue={configData?.sudden_drop_liter ?? 5}
                required
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[11px] text-surface-500">
                Penurunan level tangki melebihi batas ini saat mesin mati/parkir akan memicu peringatan kritis indikasi pencurian/kebocoran.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                Toleransi Selisih Jarak GPS vs Odometer (%)
              </label>
              <input
                type="number"
                name="max_gps_odo_diff_percent"
                step="any"
                defaultValue={configData?.max_gps_odo_diff_percent ?? 15}
                required
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[11px] text-surface-500">
                Ambang batas selisih rekaman odometer manual terhadap jarak tracking GPS.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                Batas Waktu Sensor Offline / Terputus (Menit)
              </label>
              <input
                type="number"
                name="offline_timeout_minutes"
                defaultValue={configData?.offline_timeout_minutes ?? 60}
                required
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[11px] text-surface-500">
                Jika perangkat telemetri tidak mengirimkan data melewati durasi ini, status kendaraan akan otomatis ditandai offline.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all"
              >
                Simpan Konfigurasi Ambang Batas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 1: Catat Perjalanan & Konsumsi BBM Manual */}
      {isAddTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const payload = Object.fromEntries(fd.entries());
              try {
                const res = await fetch("/api/fuel-monitoring/trips", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                const result = await res.json();
                if (res.ok) {
                  toast.success(result.message);
                  setIsAddTripModalOpen(false);
                  mutateTrips();
                  mutateAnomalies();
                } else {
                  toast.error(result.message || "Gagal menyimpan data perjalanan");
                }
              } catch {
                toast.error("Terjadi kesalahan jaringan");
              }
            }}
            className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" /> Catat Perjalanan & Konsumsi BBM
              </h2>
              <button
                type="button"
                onClick={() => setIsAddTripModalOpen(false)}
                className="text-surface-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Nopol Kendaraan <span className="text-red-400">*</span>
                </label>
                <select
                  name="nopol"
                  required
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Pilih Kendaraan</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.nopol}>
                      {v.nopol} ({v.type || "Mobil"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Nama Pengemudi <span className="text-red-400">*</span>
                </label>
                <input
                  name="driver_name"
                  required
                  placeholder="Nama pengemudi"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Kilometer Awal <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="start_km"
                  required
                  min={0}
                  step="any"
                  placeholder="Contoh: 15420"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Kilometer Akhir <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="end_km"
                  required
                  min={0}
                  step="any"
                  placeholder="Contoh: 15620"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  BBM Terpakai (L) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="fuel_used"
                  required
                  step="any"
                  min={0.1}
                  placeholder="Contoh: 20"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  BBM Diisi (L)
                </label>
                <input
                  type="number"
                  name="fuel_refill"
                  step="any"
                  min={0}
                  defaultValue={0}
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Biaya BBM (Rp)
                </label>
                <input
                  type="number"
                  name="fuel_cost"
                  min={0}
                  placeholder="Contoh: 200000"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Metode Perhitungan
                </label>
                <select
                  name="calculation_method"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="full_to_full">Full-to-Full (Standar Struk)</option>
                  <option value="sensor_tangki">Sensor Level Tangki Terkalibrasi</option>
                  <option value="flow_meter">Fuel Flow Meter</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Jarak GPS (opsional)
                </label>
                <input
                  type="number"
                  name="gps_distance"
                  step="any"
                  placeholder="Kosongkan bila belum ada GPS"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                Catatan / Rute Perjalanan
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Rute perjalanan, kondisi lalu lintas..."
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddTripModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-surface-700 text-surface-300 hover:bg-surface-800 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-xl gradient-brand text-white text-xs font-semibold hover:shadow-lg"
              >
                Simpan & Hitung Konsumsi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Detail Audit Perjalanan */}
      {isDetailModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-brand-400" /> Detail Audit Konsumsi BBM
                </h2>
                <p className="text-xs text-surface-400 font-mono mt-0.5">
                  {selectedTrip.nopol} — {selectedTrip.driver_name}
                </p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-surface-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-950/80 border border-surface-800">
                <div>
                  <span className="text-surface-400">Tanggal Perjalanan</span>
                  <p className="font-semibold text-white mt-0.5">
                    {format(new Date(selectedTrip.trip_date), "dd MMMM yyyy HH:mm", { locale: id })}
                  </p>
                </div>
                <div>
                  <span className="text-surface-400">Status Sensor</span>
                  <p className="font-semibold text-white mt-0.5 capitalize">
                    {selectedTrip.sensor_status === "terhubung" ? "🟢 Terhubung" : "⚪ Belum Terhubung"}
                  </p>
                </div>
                <div>
                  <span className="text-surface-400">Jarak Odometer</span>
                  <p className="font-mono font-bold text-white mt-0.5">
                    {selectedTrip.odo_distance} km ({selectedTrip.start_km} - {selectedTrip.end_km})
                  </p>
                </div>
                <div>
                  <span className="text-surface-400">Jarak GPS</span>
                  <p className="font-mono font-bold text-cyan-300 mt-0.5">
                    {selectedTrip.gps_distance ? `${selectedTrip.gps_distance} km` : "Belum Terhubung"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-950/80 border border-surface-800 text-center">
                <div>
                  <span className="text-[10px] text-surface-400 uppercase">Konsumsi Aktual</span>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{selectedTrip.actual_kml} km/L</p>
                </div>
                <div>
                  <span className="text-[10px] text-surface-400 uppercase">Standar Kendaraan</span>
                  <p className="text-base font-bold text-surface-200 mt-0.5">
                    {selectedTrip.standard_kml ? `${selectedTrip.standard_kml} km/L` : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-surface-400 uppercase">Biaya / km</span>
                  <p className="text-base font-bold text-amber-300 mt-0.5">{formatRp(selectedTrip.cost_per_km)}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-950/80 border border-surface-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-surface-400">BBM Terpakai:</span>
                  <span className="font-mono font-semibold text-white">{selectedTrip.fuel_used} Liter</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Total Pengisian:</span>
                  <span className="font-mono font-semibold text-white">{selectedTrip.fuel_refill} Liter ({formatRp(selectedTrip.fuel_cost)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Metode Pengukuran:</span>
                  <span className="capitalize text-surface-200">{selectedTrip.calculation_method.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Pencatatan:</span>
                  <span className="text-surface-200">{selectedTrip.is_manual ? "Diinput Manual" : "Telemetri Otomatis"}</span>
                </div>
              </div>

              {selectedTrip.notes && (
                <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                  <span className="text-surface-400 text-[10px] uppercase font-semibold">Catatan Perjalanan</span>
                  <p className="text-surface-200 mt-0.5">{selectedTrip.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full px-4 py-2 rounded-xl bg-surface-800 text-surface-200 hover:bg-surface-700 text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Verifikasi & Tindak Lanjut Anomali */}
      {isVerifyModalOpen && selectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleVerifySubmit}
            className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" /> Verifikasi Indikasi Anomali
                </h2>
                <p className="text-xs text-surface-400 font-mono mt-0.5">
                  {selectedAnomaly.nopol} — {selectedAnomaly.title}
                </p>
              </div>
              <button type="button" onClick={() => setIsVerifyModalOpen(false)} className="text-surface-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-950 border border-surface-800 space-y-1 text-xs">
              <p className="text-surface-300">{selectedAnomaly.description}</p>
              <div className="flex gap-4 pt-1.5 text-surface-400 text-[11px]">
                <span>Tingkat: <strong className="uppercase text-white">{selectedAnomaly.severity}</strong></span>
                <span>Selisih: <strong className="text-amber-300 font-mono">{selectedAnomaly.diff_value || "-"}</strong></span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                Status Pemeriksaan <span className="text-red-400">*</span>
              </label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value)}
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="sedang_diperiksa">Sedang Diperiksa</option>
                <option value="selesai">Selesai (Terverifikasi & Ditindaklanjuti)</option>
                <option value="tidak_terbukti">Tidak Terbukti (Wajar karena rute macet/tanjakan/kemiringan tangki)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                Catatan Investigasi & Bukti
              </label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                rows={3}
                placeholder="Catat hasil klarifikasi pengemudi, bukti struk, atau kondisi jalan..."
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-surface-700 text-surface-300 hover:bg-surface-800 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-1 px-4 py-2 rounded-xl gradient-brand text-white text-xs font-semibold hover:shadow-lg disabled:opacity-50"
              >
                {isVerifying ? "Menyimpan..." : "Simpan Status Verifikasi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
