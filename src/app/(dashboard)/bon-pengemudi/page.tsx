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
  FileText, 
  DollarSign, 
  Edit3, 
  Trash2, 
  X, 
  ChevronDown,
  MapPin
} from "lucide-react";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { INDONESIA_CITIES } from "@/lib/indonesia-cities";
import { formatRupiah, formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const KETERANGAN_OPTIONS = ["Antar", "Jemput", "Pergi Pulang", "Inap"];

export default function EmployeeBonPengemudiPage() {
  const { data: bonData, mutate: mutateBons, isLoading: isBonsLoading } = useSWR("/api/driver-bon", fetcher);
  const { data: userData } = useSWR("/api/users", fetcher);
  const { data: meData } = useSWR("/api/auth/me", fetcher);

  const currentUser = meData?.user;
  const bons = Array.isArray(bonData) ? bonData : [];
  const users = Array.isArray(userData) ? userData : [];

  // Filter States
  const [search, setSearch] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

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
  const [signatureUrl, setSignatureUrl] = useState("");

  // Search dropdown helpers
  const [citySearch, setCitySearch] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  const [driverSearch, setDriverSearch] = useState("");
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  // Filtered cities
  const filteredCities = useMemo(() => {
    if (!citySearch) return INDONESIA_CITIES;
    return INDONESIA_CITIES.filter((city) =>
      city.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [citySearch]);

  // Filtered users for driver dropdown
  const filteredDrivers = useMemo(() => {
    if (!driverSearch) return users;
    return users.filter(
      (u: any) =>
        u.full_name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
        u.nik?.toLowerCase().includes(driverSearch.toLowerCase())
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

      return matchSearch && matchStart && matchEnd;
    });
  }, [bons, search, startDateFilter, endDateFilter]);

  // Summary Metrics
  const totalNominal = useMemo(() => {
    return filteredBons.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  }, [filteredBons]);

  const openCreateModal = () => {
    setEditingBon(null);
    setBonDate(format(new Date(), "yyyy-MM-dd"));
    setNopol("");
    if (currentUser) {
      setSelectedDriverId(currentUser.id || "");
      setDriverName(currentUser.full_name || "");
      setDriverNik(currentUser.nik || "");
      setDriverSearch(currentUser.full_name || "");
    } else {
      setSelectedDriverId("");
      setDriverName("");
      setDriverNik("");
      setDriverSearch("");
    }
    setDestination("");
    setCitySearch("");
    setNoSpd("");
    setDepartureDate(format(new Date(), "yyyy-MM-dd"));
    setNominalDisplay("");
    setKeterangan("Pergi Pulang");
    setSignatureUrl("");
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
    setSignatureUrl(bon.signature_url || "");
    setIsModalOpen(true);
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
        mutateBons();
      } else {
        const err = await res.json();
        toast.error(err.message || "Gagal menyimpan data");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data Bon Pengemudi ini?")) return;

    try {
      const res = await fetch(`/api/driver-bon/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Bon Pengemudi berhasil dihapus");
        mutateBons();
      } else {
        toast.error("Gagal menghapus data");
      }
    } catch (e) {
      toast.error("Kesalahan koneksi jaringan");
    }
  };

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
        "TTD": bon.signature_url ? "Ada TTD" : "Ada"
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 22 },
        { wch: 15 },
        { wch: 25 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 10 },
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
    <div className="space-y-6 pb-20 md:pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-emerald-400" />
            Bon Pengemudi
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Pencatatan & laporan bon perjalanan pengemudi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-white font-medium flex items-center gap-2 border border-surface-700 transition-all text-xs sm:text-sm"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Tarik Laporan Excel
          </button>

          <button
            onClick={openCreateModal}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            Tambah Bon
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Total Bon Transaksi</p>
            <h3 className="text-2xl font-bold text-white mt-1">{filteredBons.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <FileText className="h-6 w-6 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-5 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Total Nominal Bon</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{formatRupiah(totalNominal)}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <input
            type="text"
            placeholder="Cari Nopol, Pengemudi, No SPD, atau Tujuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-900/60 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
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
                <th className="py-3.5 px-4 font-semibold text-center">TTD</th>
                <th className="py-3.5 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {isBonsLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-surface-500">
                    Memuat data Bon Pengemudi...
                  </td>
                </tr>
              ) : filteredBons.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-surface-500">
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
                    <td className="py-3.5 px-4 font-medium text-emerald-400 whitespace-nowrap">
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
                      <span className="text-xs text-emerald-400 font-medium">Ada TTD</span>
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
                <Receipt className="h-5 w-5 text-emerald-400" />
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
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Nopol */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Nopol Kendaraan <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: B 1234 ABC"
                    value={nopol}
                    onChange={(e) => setNopol(e.target.value.toUpperCase())}
                    required
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
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
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                            className="p-2.5 hover:bg-emerald-500/20 cursor-pointer transition-colors flex items-center justify-between text-sm"
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
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-surface-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                            className="p-2.5 hover:bg-emerald-500/20 cursor-pointer transition-colors text-sm text-white flex items-center gap-2"
                          >
                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
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
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <p className="text-[10px] text-surface-500">Pemisah titik ribuan otomatis seperti aplikasi bank.</p>
                </div>
              </div>

              {/* Keterangan Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Keterangan Perjalanan <span className="text-red-400">*</span>
                </label>
                <select
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {KETERANGAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-surface-900 text-white">
                      {opt}
                    </option>
                  ))}
                </select>
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? "Simpan..." : editingBon ? "Simpan Perubahan" : "Buat Bon Pengemudi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
