"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Wrench, 
  Download, 
  Upload, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  Eye, 
  Trash2, 
  RefreshCw, 
  X, 
  Printer, 
  FileSpreadsheet, 
  ShieldAlert,
  ArrowLeft,
  Clock,
  Gauge,
  MapPin
} from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { ChecklistDocumentModal } from "@/components/vehicle-checklist/checklist-document-modal";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminVehicleMaintenancePage() {
  const { data: meData, isLoading: isMeLoading } = useSWR("/api/auth/me", fetcher);
  const currentUser = meData?.user;

  // Akses HANYA untuk Super Admin dan Admin Perawatan Kendaraan
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isMaintenanceAdmin = currentUser?.jabatan === "Admin Perawatan Kendaraan";
  const hasAccess = isSuperAdmin || isMaintenanceAdmin;

  const { data: checklistsData, mutate, isLoading } = useSWR(
    hasAccess ? "/api/vehicle-checklists" : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  const checklists: any[] = Array.isArray(checklistsData) ? checklistsData : [];
  const { data: vehiclesData } = useSWR(hasAccess ? "/api/vehicles" : null, fetcher);
  const vehicles: any[] = Array.isArray(vehiclesData) ? vehiclesData : [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "laik" | "perbaikan">("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Import Excel State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Summary Metrics
  const totalChecklists = checklists.length;
  const goodConditionCount = checklists.filter((c: any) => c.status === "Baik / Laik Jalan").length;
  const needRepairCount = checklists.filter((c: any) => c.status === "Perlu Perbaikan").length;
  const uniqueVehiclesCount = useMemo(() => {
    return new Set(checklists.map((c: any) => c.nopol).filter(Boolean)).size;
  }, [checklists]);

  // Filtered List
  const filteredChecklists = useMemo(() => {
    return checklists.filter((item: any) => {
      // Status
      if (statusFilter === "laik" && item.status !== "Baik / Laik Jalan") return false;
      if (statusFilter === "perbaikan" && item.status !== "Perlu Perbaikan") return false;

      // Search
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (item.nopol?.toLowerCase().includes(q) ?? false) ||
        (item.checklist_no?.toLowerCase().includes(q) ?? false) ||
        (item.technician_name?.toLowerCase().includes(q) ?? false) ||
        (item.driver_name?.toLowerCase().includes(q) ?? false) ||
        (item.destination?.toLowerCase().includes(q) ?? false) ||
        (item.general_notes?.toLowerCase().includes(q) ?? false);

      if (!matchSearch) return false;

      // Date Range
      if (dateRange.start && item.date) {
        const itemDate = format(new Date(item.date), "yyyy-MM-dd");
        if (itemDate < dateRange.start) return false;
      }
      if (dateRange.end && item.date) {
        const itemDate = format(new Date(item.date), "yyyy-MM-dd");
        if (itemDate > dateRange.end) return false;
      }

      return true;
    });
  }, [checklists, search, statusFilter, dateRange]);

  // Export ke Excel Sesuai Format "LAPORAN CHEK LIST KENDARAAN PENUMPANG"
  const handleExportExcel = () => {
    if (filteredChecklists.length === 0) {
      toast.error("Tidak ada data ceklis untuk diekspor.");
      return;
    }

    // Grouping data berdasarkan tanggal inspeksi (yyyy-MM-dd)
    const groupedByDate: Record<string, any[]> = {};
    filteredChecklists.forEach((item: any) => {
      const dStr = item.date ? format(new Date(item.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      if (!groupedByDate[dStr]) {
        groupedByDate[dStr] = [];
      }
      groupedByDate[dStr].push(item);
    });

    const dateKeys = Object.keys(groupedByDate).sort();
    if (dateKeys.length === 0) {
      toast.error("Tidak ada data tanggal yang valid untuk diekspor.");
      return;
    }

    const wb = XLSX.utils.book_new();

    dateKeys.forEach((dateKey) => {
      const items = groupedByDate[dateKey];
      const dateObj = new Date(dateKey);
      // Format nama tab: ddMMMyy (contoh: 15Okt26)
      const sheetName = format(dateObj, "ddMMMyy", { locale: id });
      // Format judul tanggal: TANGGAL [d MMMM yyyy] (contoh: TANGGAL 15 Oktober 2026)
      const formattedDateTitle = format(dateObj, "d MMMM yyyy", { locale: id });

      // Urutkan data berdasarkan jam inspeksi / keberangkatan (terbaru ke terlama)
      const sortedItems = [...items].sort((a: any, b: any) => {
        const timeA = a.inspection_time || "";
        const timeB = b.inspection_time || "";
        return timeB.localeCompare(timeA);
      });

      // Baris data terisi
      const rows: any[][] = sortedItems.map((c: any, index: number) => {
        // Cari jenis kendaraan dari master
        const vMatch = vehicles.find((v: any) =>
          v.nopol?.replace(/\s+/g, "").toUpperCase() === (c.nopol || "").replace(/\s+/g, "").toUpperCase()
        );
        const jenisKend = vMatch?.type || vMatch?.name || "Mini Bus";

        // Format KM (contoh: 310,118)
        let formattedKm = c.kilometer || "-";
        const cleanKm = Number(String(c.kilometer).replace(/[^0-9]/g, ""));
        if (!isNaN(cleanKm) && cleanKm > 0) {
          formattedKm = cleanKm.toLocaleString("en-US");
        }

        // Format Jam (contoh: 16.00)
        const formattedJam = (c.inspection_time || "-").replace(":", ".");
        const tujuan = c.destination || "Stanby";
        const keterangan = c.status === "Baik / Laik Jalan" ? "Siap" : (c.general_notes || "Perlu Perbaikan");

        return [
          index + 1,
          c.nopol || "-",
          jenisKend,
          formattedKm,
          formattedJam,
          c.driver_name || "-",
          tujuan,
          keterangan,
        ];
      });

      // Lengkapi baris template minimal 15 baris sesuai format fisik
      const minRows = 15;
      for (let r = rows.length + 1; r <= minRows; r++) {
        rows.push([r, "", "", "", "", "", "", "Siap"]);
      }

      // Struktur sheet lengkap:
      // Baris 1: Kosong
      // Baris 2: Kosong
      // Baris 3: Judul (LAPORAN CHEK LIST KENDARAAN PENUMPANG)
      // Baris 4: Tanggal otomatis (TANGGAL 15 Oktober 2026)
      // Baris 5: Kosong
      // Baris 6: Header Kolom
      // Baris 7: Header Kolom Baris 2 (untuk merge)
      // Baris 8+: Data
      const sheetData: any[][] = [
        [],
        [],
        ["LAPORAN CHEK LIST KENDARAAN PENUMPANG"],
        [`TANGGAL ${formattedDateTitle}`],
        [],
        ["No Urut", "No Pol", "Jenis Kend.", "KM", "Jam", "Pengemudi", "Tujuan", "Keterangan"],
        ["", "", "", "", "", "", "", ""],
        ...rows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Penggabungan cell (Merges)
      ws["!merges"] = [
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // A3:H3 (Judul)
        { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, // A4:H4 (Tanggal)
        { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }, // A6:A7 (No Urut)
        { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } }, // B6:B7 (No Pol)
        { s: { r: 5, c: 2 }, e: { r: 6, c: 2 } }, // C6:C7 (Jenis Kend.)
        { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } }, // D6:D7 (KM)
        { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } }, // E6:E7 (Jam)
        { s: { r: 5, c: 5 }, e: { r: 6, c: 5 } }, // F6:F7 (Pengemudi)
        { s: { r: 5, c: 6 }, e: { r: 6, c: 6 } }, // G6:G7 (Tujuan)
        { s: { r: 5, c: 7 }, e: { r: 6, c: 7 } }, // H6:H7 (Keterangan)
      ];

      // Lebar kolom
      ws["!cols"] = [
        { wch: 10 }, // A: No Urut
        { wch: 16 }, // B: No Pol
        { wch: 16 }, // C: Jenis Kend.
        { wch: 14 }, // D: KM
        { wch: 12 }, // E: Jam
        { wch: 28 }, // F: Pengemudi
        { wch: 20 }, // G: Tujuan
        { wch: 16 }, // H: Keterangan
      ];

      // Tinggi baris
      ws["!rows"] = [
        { hpt: 12 },
        { hpt: 12 },
        { hpt: 26 }, // Title
        { hpt: 20 }, // Tanggal
        { hpt: 10 },
        { hpt: 18 }, // Header 1
        { hpt: 18 }, // Header 2
        ...rows.map(() => ({ hpt: 22 })),
      ];

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fileName = `Laporan_Chek_List_Kendaraan_Penumpang_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Berhasil mengekspor Laporan Chek List Kendaraan Penumpang (${dateKeys.length} sheet tanggal)!`);
  };

  // Download Template Import
  const handleDownloadTemplate = () => {
    const template = [
      {
        "Nomor Polisi": "AG 7244 BJ",
        "Tanggal (YYYY-MM-DD)": format(new Date(), "yyyy-MM-dd"),
        "Jam": "11.00",
        "Kilometer": 267071,
        "Indikator BBM": "F",
        "Tujuan": "Pamekasan",
        "Pengemudi": "Febri",
        "Teknisi": currentUser?.full_name || "Teknisi",
        "Status": "Baik / Laik Jalan",
        "Catatan": "Kondisi prima",
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Ceklis");
    XLSX.writeFile(wb, "Template_Import_Ceklis_Kendaraan.xlsx");
    toast.success("Template Excel berhasil diunduh.");
  };

  // Import File Handler
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        toast.error("File Excel tidak memiliki data.");
        return;
      }

      let successCount = 0;
      for (const row of rows) {
        const nopol = row["Nomor Polisi"] || row["nopol"] || row["Nopol"];
        const kilometer = row["Kilometer"] || row["km"] || row["KM"] || 0;
        if (!nopol) continue;

        await fetch("/api/vehicle-checklists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nopol: String(nopol).trim().toUpperCase(),
            kilometer: parseInt(String(kilometer)),
            inspection_time: row["Jam"] || "08.00",
            destination: row["Tujuan"] || null,
            fuel_level: row["Indikator BBM"] || "F",
            driver_name: row["Pengemudi"] || null,
            technician_name: row["Teknisi"] || currentUser?.full_name || "Teknisi",
            status: row["Status"] || "Baik / Laik Jalan",
            general_notes: row["Catatan"] || null,
          }),
        });
        successCount++;
      }

      toast.success(`Berhasil mengimpor ${successCount} data ceklis kendaraan.`);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses file Excel.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/vehicle-checklists/${deleteItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menghapus");
      }
      toast.success("Data ceklis berhasil dihapus.");
      setDeleteItem(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus data ceklis");
    } finally {
      setIsDeleting(false);
    }
  };

  // If user does not have access
  if (!isMeLoading && !hasAccess) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-red-500/30 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Akses Terbatas: Super Admin & Admin Perawatan Kendaraan</h2>
        <p className="text-sm text-surface-400 leading-relaxed">
          Menu monitoring <strong>Perawatan Kendaraan</strong> ini khusus untuk <strong>Super Admin</strong> dan <strong>Admin Perawatan Kendaraan</strong> guna memantau data hasil inspeksi teknisi.
        </p>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold shadow-lg shadow-brand-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 slide-up pb-16">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Panel Pengawasan & Monitoring
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1 flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-brand-400" />
            Perawatan Kendaraan (Monitoring Ceklis Teknisi)
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Monitoring data pemeriksaan fisik & kelayakan armada dari teknisi sebelum keberangkatan.
          </p>
        </div>

        {/* Action Buttons: Export Excel, Import, Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-700 bg-surface-900 text-surface-300 hover:text-white hover:bg-surface-800 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-surface-400" />
            Template
          </button>

          <label className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-700 bg-surface-900 text-surface-300 hover:text-white hover:bg-surface-800 text-xs font-semibold transition-all cursor-pointer",
            isUploading && "opacity-50 pointer-events-none"
          )}>
            <Upload className="w-3.5 h-3.5 text-surface-400" />
            {isUploading ? "Mengimpor..." : "Import Excel"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export ke Excel
          </button>

          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 text-surface-300 border border-surface-700 transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-brand-400")} />
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 rounded-2xl border border-surface-800 bg-surface-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Total Ceklis Masuk</span>
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{totalChecklists}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Semua riwayat ceklis teknisi</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Laik Jalan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2">{goodConditionCount}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Kondisi armada prima & lengkap</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Perlu Perbaikan
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-400 mt-2">{needRepairCount}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Ada catatan rusak / kurang</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-surface-800 bg-surface-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Armada Diperiksa</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{uniqueVehiclesCount}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Nopol kendaraan unik</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 rounded-2xl border border-surface-800 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-800/80">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              statusFilter === "all"
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                : "bg-surface-850 text-surface-400 hover:text-white hover:bg-surface-800"
            )}
          >
            Semua Ceklis
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
              {totalChecklists}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("laik")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              statusFilter === "laik"
                ? "bg-emerald-500 text-emerald-950 font-extrabold shadow-md shadow-emerald-500/20"
                : "bg-surface-850 text-surface-400 hover:text-emerald-400 hover:bg-surface-800"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Laik Jalan
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current font-mono">
              {goodConditionCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("perbaikan")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              statusFilter === "perbaikan"
                ? "bg-amber-500 text-amber-950 font-extrabold shadow-md shadow-amber-500/20"
                : "bg-surface-850 text-surface-400 hover:text-amber-400 hover:bg-surface-800"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Perlu Perbaikan
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current font-mono">
              {needRepairCount}
            </span>
          </button>
        </div>

        {/* Search & Date Controls */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Cari nopol kendaraan, teknisi, pengemudi, kota tujuan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Container */}
            <div className="bg-surface-900/90 border border-surface-700/80 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-surface-300">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" />
                  <span className="uppercase text-[11px] tracking-wider text-surface-400">Periode</span>
                  {(dateRange.start || dateRange.end) && (
                    <span className="w-2 h-2 rounded-full bg-brand-400 inline-block animate-pulse" />
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = format(new Date(), "yyyy-MM-dd");
                      setDateRange({ start: today, end: today });
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all shrink-0",
                      dateRange.start === format(new Date(), "yyyy-MM-dd") && dateRange.end === format(new Date(), "yyyy-MM-dd")
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700"
                    )}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const startMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
                      const endMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
                      setDateRange({ start: startMonth, end: endMonth });
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-all shrink-0"
                  >
                    Bulan Ini
                  </button>
                  {(dateRange.start || dateRange.end) && (
                    <button
                      type="button"
                      onClick={() => setDateRange({ start: "", end: "" })}
                      className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all flex items-center gap-1 shrink-0"
                      title="Reset Periode"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Date Inputs Grid (Mobile: 2 Columns, Desktop: Inline Flex) */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center bg-surface-950 border border-surface-700 rounded-xl px-2.5 py-1.5 focus-within:border-brand-500 transition-colors">
                    <span className="text-[10px] font-bold text-surface-500 uppercase mr-1.5 shrink-0">
                      Dari
                    </span>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full bg-transparent text-white text-xs font-mono focus:outline-none [color-scheme:dark]"
                      title="Dari Tanggal"
                    />
                  </div>
                </div>

                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center bg-surface-950 border border-surface-700 rounded-xl px-2.5 py-1.5 focus-within:border-brand-500 transition-colors">
                    <span className="text-[10px] font-bold text-surface-500 uppercase mr-1.5 shrink-0">
                      S/d
                    </span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full bg-transparent text-white text-xs font-mono focus:outline-none [color-scheme:dark]"
                      title="Sampai Tanggal"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="glass-card overflow-hidden rounded-2xl border border-surface-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-surface-300">
            <thead className="bg-surface-900/60 text-surface-400 border-b border-surface-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="p-4">No Ceklis & Tanggal</th>
                <th className="p-4">Kendaraan</th>
                <th className="p-4">Odometer & BBM</th>
                <th className="p-4">Tujuan</th>
                <th className="p-4">Teknisi & Driver</th>
                <th className="p-4">Status Kelayakan</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {filteredChecklists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-surface-400">
                    <Wrench className="w-10 h-10 text-surface-500 mx-auto mb-2 opacity-50" />
                    <p className="text-white font-semibold text-sm">Tidak ada data ceklis kendaraan</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {search || statusFilter !== "all" || dateRange.start || dateRange.end
                        ? "Tidak ada data yang cocok dengan kriteria filter."
                        : "Belum ada laporan pemeriksaan dari teknisi."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredChecklists.map((item: any) => (
                  <tr key={item.id} className="hover:bg-surface-900/40 transition-colors">
                    {/* No Ceklis & Tanggal */}
                    <td className="p-4 whitespace-nowrap">
                      <p className="font-mono font-bold text-white text-xs">{item.checklist_no || "CHK"}</p>
                      <p className="text-surface-400 text-[11px] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand-400" />
                        {format(new Date(item.date), "dd MMM yyyy", { locale: id })} {item.inspection_time && `• ${item.inspection_time}`}
                      </p>
                    </td>

                    {/* Kendaraan */}
                    <td className="p-4 whitespace-nowrap">
                      <p className="font-bold text-white font-mono tracking-wider text-sm">{item.nopol}</p>
                      <span className="text-[10px] text-surface-500 uppercase">Armada Operasional</span>
                    </td>

                    {/* Odometer & BBM */}
                    <td className="p-4 whitespace-nowrap font-mono">
                      <p className="font-bold text-emerald-400 text-xs flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {item.kilometer?.toLocaleString()} KM
                      </p>
                      <p className="text-[11px] text-amber-400 mt-0.5">BBM: {item.fuel_level}</p>
                    </td>

                    {/* Tujuan */}
                    <td className="p-4">
                      <p className="font-medium text-white text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
                        {item.destination || "Dalam Kota"}
                      </p>
                      {item.general_notes && (
                        <p className="text-[10px] text-surface-400 italic truncate max-w-xs mt-0.5">"{item.general_notes}"</p>
                      )}
                    </td>

                    {/* Teknisi & Driver */}
                    <td className="p-4 whitespace-nowrap">
                      <p className="text-white font-medium text-xs">
                        Teknisi: <span className="text-brand-300 font-semibold">{item.technician_name}</span>
                      </p>
                      {item.driver_name && (
                        <p className="text-surface-400 text-[11px] mt-0.5">
                          Driver: {item.driver_name}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1",
                        item.status === "Baik / Laik Jalan"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      )}>
                        {item.status === "Baik / Laik Jalan" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedDetail(item)}
                          title="Lihat Lembar Ceklis Fisik"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-semibold border border-surface-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-400" />
                          Lembar Ceklis
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          title="Hapus Data"
                          className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal: Lembar Ceklis Fisik Digital */}
      {selectedDetail && (
        <ChecklistDocumentModal item={selectedDetail} onClose={() => setSelectedDetail(null)} />
      )}

      {/* Modal: Konfirmasi Hapus Data */}
      {deleteItem && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in"
          onClick={() => !isDeleting && setDeleteItem(null)}
        >
          <div 
            className="glass-card max-w-md w-full p-6 rounded-2xl border border-red-500/30 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Data Ceklis Kendaraan?</h3>
                <p className="text-xs text-surface-400 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-surface-300 leading-relaxed bg-surface-900/60 p-3 rounded-xl border border-surface-800">
              Apakah Anda yakin ingin menghapus data ceklis kendaraan nomor <strong className="text-white">{deleteItem.checklist_no}</strong> ({deleteItem.nopol}) oleh teknisi <strong className="text-white">{deleteItem.technician_name}</strong>?
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
