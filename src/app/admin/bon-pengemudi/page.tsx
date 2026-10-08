"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  Receipt, 
  Plus, 
  Search, 
  Download, 
  Calendar, 
  Car, 
  User, 
  MapPin, 
  FileText, 
  DollarSign, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  ListFilter,
  Check,
  ChevronDown,
  PenTool,
  Eye
} from "lucide-react";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { INDONESIA_CITIES } from "@/lib/indonesia-cities";
import { formatRupiah, formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";
import { SignaturePad } from "@/components/ui/signature-pad";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const KETERANGAN_OPTIONS = ["Antar", "Jemput", "Pergi Pulang", "Inap"];

export default function BonPengemudiPage() {
  const { data: bonData, mutate: mutateBons, isLoading: isBonsLoading } = useSWR("/api/driver-bon", fetcher);
  const { data: userData } = useSWR("/api/users", fetcher);
  const { data: vehicleData } = useSWR("/api/vehicles", fetcher);
  const { data: destinationData } = useSWR("/api/destinations", fetcher);

  const bons = Array.isArray(bonData) ? bonData : [];
  const users = Array.isArray(userData) ? userData : [];

  // Smooth Loading Overlay State
  const [loadingState, setLoadingState] = useState<{ show: boolean; message: string; submessage?: string }>({
    show: false,
    message: "",
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "lunas" | "belum_lunas">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBon, setEditingBon] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [bonDate, setBonDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nopol, setNopol] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverNik, setDriverNik] = useState("");
  const [destination, setDestination] = useState("");
  const [noSpd, setNoSpd] = useState("");
  const [departureDate, setDepartureDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nominalDisplay, setNominalDisplay] = useState("");
  const [keterangan, setKeterangan] = useState("Pergi Pulang");
  const [status, setStatus] = useState("belum_lunas");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [viewingSignatureUrl, setViewingSignatureUrl] = useState<string | null>(null);

  // Search dropdown helpers
  const [citySearch, setCitySearch] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  const [driverSearch, setDriverSearch] = useState("");
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  // Master Luar Kota (fallback ke daftar bawaan bila master masih kosong)
  const masterCities: string[] = useMemo(() => {
    const list = Array.isArray(destinationData)
      ? destinationData.filter((d: any) => d.is_active).map((d: any) => d.city as string)
      : [];
    return list.length > 0 ? list : INDONESIA_CITIES;
  }, [destinationData]);

  const activeVehicles: any[] = useMemo(
    () => (Array.isArray(vehicleData) ? vehicleData.filter((v: any) => v.is_active) : []),
    [vehicleData]
  );

  // Filtered cities
  const filteredCities = useMemo(() => {
    if (!citySearch) return masterCities;
    return masterCities.filter((city) =>
      city.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [citySearch, masterCities]);

  // Filtered users for driver dropdown
  const filteredDrivers = useMemo(() => {
    if (!driverSearch) return users;
    return users.filter(
      (u: any) =>
        u.full_name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        u.nik.toLowerCase().includes(driverSearch.toLowerCase())
    );
  }, [users, driverSearch]);

  // Filtered Bon list
  const filteredBons = useMemo(() => {
    return bons.filter((b: any) => {
      const matchSearch =
        !search ||
        b.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.driver_nik?.toLowerCase().includes(search.toLowerCase()) ||
        b.nopol?.toLowerCase().includes(search.toLowerCase()) ||
        b.destination?.toLowerCase().includes(search.toLowerCase()) ||
        b.no_spd?.toLowerCase().includes(search.toLowerCase());

      const bDate = b.bon_date ? new Date(b.bon_date).toISOString().split("T")[0] : "";
      const matchStart = !startDateFilter || bDate >= startDateFilter;
      const matchEnd = !endDateFilter || bDate <= endDateFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "lunas" && b.status === "lunas") ||
        (statusFilter === "belum_lunas" && b.status !== "lunas");

      return matchSearch && matchStart && matchEnd && matchStatus;
    });
  }, [bons, search, startDateFilter, endDateFilter, statusFilter]);

  // Summary Metrics
  const totalNominal = useMemo(() => {
    return filteredBons.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  }, [filteredBons]);

  const totalNominalLunas = useMemo(() => {
    return filteredBons.filter((b: any) => b.status === "lunas").reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  }, [filteredBons]);

  const totalNominalBelumLunas = useMemo(() => {
    return filteredBons.filter((b: any) => b.status !== "lunas").reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  }, [filteredBons]);

  const openCreateModal = () => {
    setEditingBon(null);
    setBonDate(format(new Date(), "yyyy-MM-dd"));
    setNopol("");
    setSelectedDriverId("");
    setDriverName("");
    setDriverNik("");
    setDestination("");
    setCitySearch("");
    setNoSpd("");
    setDepartureDate(format(new Date(), "yyyy-MM-dd"));
    setNominalDisplay("");
    setKeterangan("Pergi Pulang");
    setStatus("belum_lunas");
    setSignatureUrl("");
    setShowSignaturePad(false);
    setIsModalOpen(true);
  };

  const openEditModal = (bon: any) => {
    setEditingBon(bon);
    setBonDate(bon.bon_date ? format(new Date(bon.bon_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setNopol(bon.nopol || "");
    setSelectedDriverId(bon.driver_id || "");
    setDriverName(bon.driver_name || "");
    setDriverNik(bon.driver_nik || "");
    setDestination(bon.destination || "");
    setCitySearch(bon.destination || "");
    setNoSpd(bon.no_spd || "");
    setDepartureDate(bon.departure_date ? format(new Date(bon.departure_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setNominalDisplay(formatCurrencyInput(bon.amount || 0));
    setKeterangan(bon.keterangan || "Pergi Pulang");
    setStatus(bon.status || "belum_lunas");
    setSignatureUrl(bon.signature_url || "");
    setShowSignaturePad(!!bon.signature_url);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (bonId: string, currentStatus: string) => {
    const newStatus = currentStatus === "lunas" ? "belum_lunas" : "lunas";
    setLoadingState({ show: true, message: "Mengubah status pembayaran...", submessage: `Mengubah ke status ${newStatus === "lunas" ? "LUNAS 🟢" : "BELUM LUNAS 🔴"}` });
    try {
      const res = await fetch(`/api/driver-bon/${bonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status pembayaran diubah ke ${newStatus === "lunas" ? "LUNAS 🟢" : "BELUM LUNAS 🔴"}`);
        await mutateBons();
      } else {
        toast.error("Gagal memperbarui status");
      }
    } catch (e) {
      toast.error("Kesalahan jaringan");
    } finally {
      setLoadingState({ show: false, message: "" });
    }
  };

  const handleDriverSelect = (userObj: any) => {
    setSelectedDriverId(userObj.id);
    setDriverName(userObj.full_name);
    setDriverNik(userObj.nik || "-");
    setDriverSearch(userObj.full_name);
    setIsDriverDropdownOpen(false);
  };

  const handleCitySelect = (cityName: string) => {
    setDestination(cityName);
    setCitySearch(cityName);
    setIsCityDropdownOpen(false);
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatCurrencyInput(rawVal);
    setNominalDisplay(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nopol || !driverName || !destination || !noSpd || !nominalDisplay) {
      toast.error("Mohon isi semua field data wajib!");
      return;
    }

    const numericAmount = parseCurrencyInput(nominalDisplay);
    if (numericAmount <= 0) {
      toast.error("Nominal pengemudi harus lebih dari 0");
      return;
    }

    setIsSubmitting(true);
    setLoadingState({
      show: true,
      message: editingBon ? "Memperbarui Bon Pengemudi..." : "Menyimpan Bon Pengemudi Baru...",
      submessage: "Sinkronisasi data ke server",
    });

    const payload = {
      bon_date: bonDate,
      nopol: nopol.toUpperCase(),
      driver_id: selectedDriverId || null,
      driver_name: driverName,
      driver_nik: driverNik || "-",
      destination,
      no_spd: noSpd,
      departure_date: departureDate,
      amount: numericAmount,
      keterangan,
      status,
      signature_url: signatureUrl || null,
    };

    try {
      const url = editingBon ? `/api/driver-bon/${editingBon.id}` : "/api/driver-bon";
      const method = editingBon ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingBon ? "Bon Pengemudi berhasil diperbarui!" : "Bon Pengemudi berhasil dibuat!");
        setIsModalOpen(false);
        await mutateBons();
      } else {
        const err = await res.json();
        toast.error(err.message || "Gagal menyimpan data");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
      setLoadingState({ show: false, message: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data Bon Pengemudi ini?")) return;

    setLoadingState({
      show: true,
      message: "Menghapus data Bon Pengemudi...",
      submessage: "Menghapus rekord dari database",
    });

    try {
      const res = await fetch(`/api/driver-bon/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Bon Pengemudi berhasil dihapus");
        await mutateBons();
      } else {
        toast.error("Gagal menghapus data");
      }
    } catch (e) {
      toast.error("Kesalahan koneksi jaringan");
    } finally {
      setLoadingState({ show: false, message: "" });
    }
  };

  // Download exact Excel layout as in user screenshot
  const handleExportExcel = () => {
    try {
      if (filteredBons.length === 0) {
        toast.error("Tidak ada data Bon Pengemudi untuk ditarik laporan.");
        return;
      }

      const excelData = filteredBons.map((bon: any) => ({
        "tanggal Bon Pengemudi": bon.bon_date ? format(new Date(bon.bon_date), "dd/MM/yyyy") : "-",
        "Nopol": bon.nopol || "-",
        "Nama Pengemudi": bon.driver_name || "-",
        "NIK Pengemudi": bon.driver_nik || "-",
        "Tujuan": bon.destination || "-",
        "No SPD": bon.no_spd || "-",
        "Tanggal berangkat": bon.departure_date ? format(new Date(bon.departure_date), "dd/MM/yyyy") : "-",
        "Nominal Pengemudi": formatRupiah(bon.amount || 0).replace("Rp ", ""),
        "Keterangan": bon.keterangan || "-",
        "Status Pembayaran": bon.status === "lunas" ? "Lunas" : "Belum Lunas",
        "TTD": bon.signature_url ? "Ada TTD" : "Belum TTD"
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Format column widths for clean readability
      ws['!cols'] = [
        { wch: 22 }, // tanggal Bon Pengemudi
        { wch: 15 }, // Nopol
        { wch: 25 }, // Nama Pengemudi
        { wch: 18 }, // NIK Pengemudi
        { wch: 22 }, // Tujuan
        { wch: 18 }, // No SPD
        { wch: 20 }, // Tanggal berangkat
        { wch: 20 }, // Nominal Pengemudi
        { wch: 18 }, // Keterangan
        { wch: 10 }, // TTD
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Bon Pengemudi");

      const filename = `Laporan_Bon_Pengemudi_${format(new Date(), "ddMMyyyy_HHmm")}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success("Laporan Excel Bon Pengemudi berhasil diunduh!", {
        description: `File: ${filename}`
      });
    } catch (e) {
      console.error("Export Excel error:", e);
      toast.error("Gagal menarik laporan Excel.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-brand-400" />
            Bon Pengemudi
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Pencatatan, pembuatan bon perjalanan, dan penarikan laporan Excel
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-white font-medium flex items-center gap-2 border border-surface-700 transition-all shadow-lg text-sm"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Tarik Laporan Excel
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center gap-2 transition-all shadow-lg shadow-brand-600/30 text-sm"
          >
            <Plus className="h-4 w-4" />
            Tambah Bon Pengemudi
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Total Bon Transaksi</p>
              <h3 className="text-2xl font-bold text-white mt-1">{filteredBons.length} <span className="text-xs text-surface-400 font-normal">({formatRupiah(totalNominal)})</span></h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <FileText className="h-6 w-6 text-brand-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Lunas 🟢</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{formatRupiah(totalNominalLunas)}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border border-red-500/20 bg-red-500/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-400 font-medium uppercase tracking-wider">Belum Lunas 🔴</p>
              <h3 className="text-2xl font-bold text-red-400 mt-1">{formatRupiah(totalNominalBelumLunas)}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input
              type="text"
              placeholder="Cari Pengemudi, NIK, Nopol, No SPD, atau Tujuan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-900/60 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-surface-900/60 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-300">
              <Calendar className="h-4 w-4 text-surface-500" />
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
              <span>s/d</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>

            {(startDateFilter || endDateFilter || search || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStartDateFilter("");
                  setEndDateFilter("");
                  setStatusFilter("all");
                }}
                className="p-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                title="Reset Filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Status Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-surface-800/60">
          <span className="text-xs text-surface-400 font-medium mr-1">Filter Status:</span>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === "all"
                ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30"
                : "bg-surface-800/80 text-surface-400 hover:bg-surface-700 hover:text-white"
            }`}
          >
            Semua Status
          </button>
          <button
            onClick={() => setStatusFilter("lunas")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === "lunas"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500/50"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            }`}
          >
            🟢 Lunas
          </button>
          <button
            onClick={() => setStatusFilter("belum_lunas")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === "belum_lunas"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-500/50"
                : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
            }`}
          >
            🔴 Belum Lunas
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-surface-300">
            <thead className="bg-surface-900/80 text-surface-400 font-medium text-xs uppercase tracking-wider border-b border-surface-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Tgl Bon</th>
                <th className="py-3.5 px-4 font-semibold">Nopol</th>
                <th className="py-3.5 px-4 font-semibold">Nama Pengemudi</th>
                <th className="py-3.5 px-4 font-semibold">NIK</th>
                <th className="py-3.5 px-4 font-semibold">Tujuan</th>
                <th className="py-3.5 px-4 font-semibold">No SPD</th>
                <th className="py-3.5 px-4 font-semibold">Tgl Berangkat</th>
                <th className="py-3.5 px-4 font-semibold text-right">Nominal</th>
                <th className="py-3.5 px-4 font-semibold">Keterangan</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">TTD</th>
                <th className="py-3.5 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {isBonsLoading ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-surface-500">
                    Memuat data Bon Pengemudi...
                  </td>
                </tr>
              ) : filteredBons.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-surface-500">
                    Belum ada data Bon Pengemudi
                  </td>
                </tr>
              ) : (
                filteredBons.map((b: any) => (
                  <tr key={b.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-surface-400 whitespace-nowrap">
                      {b.bon_date ? format(new Date(b.bon_date), "dd/MM/yyyy") : "-"}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                      {b.nopol}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                      {b.driver_name}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-surface-400 whitespace-nowrap">
                      {b.driver_nik}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-brand-300 whitespace-nowrap">
                      {b.destination}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-surface-300 whitespace-nowrap">
                      {b.no_spd}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-surface-400 whitespace-nowrap">
                      {b.departure_date ? format(new Date(b.departure_date), "dd/MM/yyyy") : "-"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400 text-right whitespace-nowrap">
                      {formatRupiah(b.amount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                          b.keterangan === "Inap"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : b.keterangan === "Pergi Pulang"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : b.keterangan === "Antar"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {b.keterangan}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(b.id, b.status)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm hover:scale-105 ${
                          b.status === "lunas"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
                        }`}
                        title="Klik untuk mengubah status pembayaran"
                      >
                        {b.status === "lunas" ? "🟢 Lunas" : "🔴 Belum Lunas"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {b.signature_url ? (
                        <button
                          onClick={() => setViewingSignatureUrl(b.signature_url)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5 mx-auto transition-colors"
                        >
                          <PenTool className="h-3 w-3" />
                          Ada TTD
                        </button>
                      ) : (
                        <span className="text-xs text-surface-500 font-medium">Belum TTD</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                          title="Edit Bon"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-brand-400" />
                {editingBon ? "Edit Bon Pengemudi" : "Tambah Bon Pengemudi Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Bon Pengemudi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Tanggal Bon Pengemudi <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={bonDate}
                    onChange={(e) => setBonDate(e.target.value)}
                    required
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Nopol */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Nopol Kendaraan <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    list="vehicle-nopol-options"
                    placeholder="Pilih dari Master Kendaraan / ketik manual"
                    value={nopol}
                    onChange={(e) => setNopol(e.target.value.toUpperCase())}
                    required
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <datalist id="vehicle-nopol-options">
                    {activeVehicles.map((v: any) => (
                      <option key={v.id} value={v.nopol}>{v.name}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Pengemudi (Dropdown List Searchable) */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Nama Pengemudi (Dropdown List) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pilih atau cari pengemudi..."
                      value={driverName}
                      onFocus={() => setIsDriverDropdownOpen(true)}
                      onChange={(e) => {
                        setDriverName(e.target.value);
                        setDriverSearch(e.target.value);
                        setIsDriverDropdownOpen(true);
                      }}
                      required
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 pointer-events-none" />
                  </div>

                  {/* Driver Dropdown Popup */}
                  {isDriverDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface-900 border border-surface-700 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-surface-800">
                      {filteredDrivers.length === 0 ? (
                        <div className="p-3 text-xs text-surface-500 text-center">Pengemudi tidak ditemukan</div>
                      ) : (
                        filteredDrivers.map((u: any) => (
                          <div
                            key={u.id}
                            onClick={() => handleDriverSelect(u)}
                            className="p-2.5 hover:bg-brand-500/20 cursor-pointer transition-colors flex items-center justify-between text-sm"
                          >
                            <span className="font-medium text-white">{u.full_name}</span>
                            <span className="text-xs font-mono text-surface-400">NIK: {u.nik || "-"}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* NIK Pengemudi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    NIK Pengemudi (Otomatis)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-filled dari Pengemudi"
                    value={driverNik}
                    onChange={(e) => setDriverNik(e.target.value)}
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tujuan (Dropdown List Seluruh Kota di Indonesia) */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Tujuan Kota (Dropdown Indonesia) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari & pilih kota tujuan..."
                      value={citySearch}
                      onFocus={() => setIsCityDropdownOpen(true)}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setDestination(e.target.value);
                        setIsCityDropdownOpen(true);
                      }}
                      required
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 pointer-events-none" />
                  </div>

                  {/* City Dropdown Popup */}
                  {isCityDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface-900 border border-surface-700 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-surface-800">
                      {filteredCities.length === 0 ? (
                        <div className="p-3 text-xs text-surface-500 text-center">Kota tidak ditemukan</div>
                      ) : (
                        filteredCities.map((city) => (
                          <div
                            key={city}
                            onClick={() => handleCitySelect(city)}
                            className="p-2.5 hover:bg-brand-500/20 cursor-pointer transition-colors text-sm text-white flex items-center gap-2"
                          >
                            <MapPin className="h-3.5 w-3.5 text-brand-400" />
                            {city}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* No SPD */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    No SPD (Surat Perjalanan Dinas) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SPD-2026-001"
                    value={noSpd}
                    onChange={(e) => setNoSpd(e.target.value)}
                    required
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Berangkat */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Tanggal Berangkat <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    required
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Nominal Pengemudi (Bank-style Auto Format) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Nominal Pengemudi (Format Bank) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">Rp</span>
                    <input
                      type="text"
                      placeholder="1.500.000"
                      value={nominalDisplay}
                      onChange={handleNominalChange}
                      required
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                  </div>
                  <p className="text-[10px] text-surface-500">Pemisah titik ribuan otomatis seperti aplikasi bank.</p>
                </div>
              </div>

              {/* Keterangan & Status Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Keterangan Perjalanan <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    {KETERANGAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-surface-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Status Pembayaran <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="belum_lunas" className="bg-surface-900 text-red-400 font-semibold">🔴 Belum Lunas</option>
                    <option value="lunas" className="bg-surface-900 text-emerald-400 font-semibold">🟢 Lunas</option>
                  </select>
                </div>
              </div>

              {/* Tombol & Area Tanda Tangan Virtual (TTD) */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignaturePad(!showSignaturePad)}
                  className="w-full py-3 px-4 rounded-xl bg-surface-800 hover:bg-surface-700 text-brand-400 border border-brand-500/30 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md group"
                >
                  <PenTool className="h-4 w-4 text-brand-400 group-hover:scale-110 transition-transform" />
                  {showSignaturePad
                    ? "Tutup Area Tanda Tangan (TTD)"
                    : signatureUrl
                    ? "✍️ Lihat / Ubah Tanda Tangan Virtual (TTD)"
                    : "✍️ Klik untuk Buka Area Tanda Tangan (TTD Virtual)"}
                </button>

                {showSignaturePad && (
                  <div className="p-4 bg-surface-950/80 border border-surface-800 rounded-xl space-y-3 animate-fadeIn">
                    <SignaturePad
                      value={signatureUrl}
                      onChange={(dataUrl) => setSignatureUrl(dataUrl)}
                    />
                    {signatureUrl ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium pt-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Tanda tangan virtual tersimpan & siap dikirim.
                      </div>
                    ) : (
                      <p className="text-[11px] text-surface-500">
                        Coretkan tanda tangan pengemudi di kotak di atas.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 font-medium text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-lg shadow-brand-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? "Simpan..." : editingBon ? "Simpan Perubahan" : "Buat Bon Pengemudi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Signature Modal */}
      {viewingSignatureUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl p-6 shadow-2xl relative flex flex-col items-center space-y-4">
            <button
              onClick={() => setViewingSignatureUrl(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PenTool className="h-5 w-5 text-brand-400" />
              Tanda Tangan Pengemudi (TTD)
            </h3>

            <div className="w-full bg-surface-950 p-4 border border-surface-800 rounded-xl flex items-center justify-center min-h-[160px]">
              <img
                src={viewingSignatureUrl}
                alt="Tanda Tangan Pengemudi"
                className="max-h-40 max-w-full object-contain filter invert contrast-200"
              />
            </div>

            <button
              onClick={() => setViewingSignatureUrl(null)}
              className="w-full py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-white text-sm font-medium transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
