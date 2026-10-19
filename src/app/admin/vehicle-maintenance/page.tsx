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
  MapPin,
  Share2,
  FolderDown,
  ExternalLink
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

  // Export Modal & Android Download States
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"penumpang" | "lengkap">("penumpang");
  const [exportScope, setExportScope] = useState<"filtered" | "all">("filtered");
  const [downloadSuccessModal, setDownloadSuccessModal] = useState<{
    open: boolean;
    fileName: string;
    blob: Blob | null;
    url: string;
    totalRows: number;
  }>({
    open: false,
    fileName: "",
    blob: null,
    url: "",
    totalRows: 0,
  });

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

  // Target data untuk ekspor berdasarkan scope pilihan user
  const targetExportList = useMemo(() => {
    return exportScope === "all" ? checklists : filteredChecklists;
  }, [exportScope, checklists, filteredChecklists]);

  // Export ke Excel Menggunakan Endpoint Resmi Server (Trigger Android Download Manager & Native Share)
  const executeExport = async (formatType: "penumpang" | "lengkap") => {
    if (targetExportList.length === 0) {
      toast.error("Tidak ada data ceklis untuk diekspor.");
      return;
    }

    const fileName = formatType === "penumpang"
      ? `Laporan_Chek_List_Kendaraan_Penumpang_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
      : `Rekap_Lengkap_Ceklis_Kendaraan_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;

    const exportUrl = `/api/vehicle-checklists/export?format=${formatType}&scope=${exportScope}&startDate=${dateRange.start}&endDate=${dateRange.end}&status=${statusFilter}&search=${encodeURIComponent(search)}`;

    // 1. Trigger langsung ke sistem Android Download Manager via HTTP download
    const a = document.createElement("a");
    a.href = exportUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 2000);

    setExportModalOpen(false);

    // 2. Fetch blob untuk mendukung tombol "Buka / Bagikan Langsung" di HP (Web Share API)
    try {
      const res = await fetch(exportUrl);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], fileName, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // Jika HP mendukung Web Share API file, buka menu pilihan aplikasi Android (Excel, WPS, Sheets)
        if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: fileName,
              text: `Buka laporan hasil ekspor ${fileName}`,
            });
          } catch (err: any) {
            // User dismiss share sheet
          }
        }

        setDownloadSuccessModal({
          open: true,
          fileName,
          blob,
          url: exportUrl,
          totalRows: targetExportList.length,
        });
      } else {
        setDownloadSuccessModal({
          open: true,
          fileName,
          blob: null,
          url: exportUrl,
          totalRows: targetExportList.length,
        });
      }
    } catch (e) {
      setDownloadSuccessModal({
        open: true,
        fileName,
        blob: null,
        url: exportUrl,
        totalRows: targetExportList.length,
      });
    }

    toast.success(`Berhasil mengekspor ${targetExportList.length} data riil!`);
  };

  const handleShareFileAgain = async () => {
    if (downloadSuccessModal.blob && downloadSuccessModal.fileName) {
      const file = new File([downloadSuccessModal.blob], downloadSuccessModal.fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: downloadSuccessModal.fileName,
            text: `Buka hasil ekspor ${downloadSuccessModal.fileName}`,
          });
          return;
        } catch (e) {
          // ignore
        }
      }
    }

    // Fallback: Trigger direct download again
    if (downloadSuccessModal.url) {
      const a = document.createElement("a");
      a.href = downloadSuccessModal.url;
      a.download = downloadSuccessModal.fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 2000);
      toast.info("Mengunduh ulang file ke folder Download HP...");
    }
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
            onClick={() => setExportModalOpen(true)}
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

      {/* Modal: Pilihan Format Ekspor Excel */}
      {exportModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setExportModalOpen(false)}
        >
          <div 
            className="glass-card max-w-lg w-full p-6 rounded-2xl border border-emerald-500/30 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ekspor Laporan ke Excel</h3>
                  <p className="text-xs text-surface-400">Pilih format ekspor sesuai kebutuhan</p>
                </div>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-surface-300">Pilih Format Laporan:</p>

              {/* Format 1: Laporan Kendaraan Penumpang */}
              <div
                onClick={() => setExportFormat("penumpang")}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer",
                  exportFormat === "penumpang"
                    ? "bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/40"
                    : "bg-surface-900/60 border-surface-800 hover:border-surface-700"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Laporan Kendaraan Penumpang
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Format Resmi Sesuai Contoh
                      </span>
                    </h4>
                    <p className="text-xs text-surface-400 mt-1">
                      Format rekapitulasi harian dengan judul "LAPORAN CHEK LIST KENDARAAN PENUMPANG", tanggal otomatis, dan multi-sheet tab per tanggal.
                    </p>
                    <div className="mt-2 text-[11px] text-surface-500 font-mono">
                      Kolom: No Urut, No Pol, Jenis Kend., KM, Jam, Pengemudi, Tujuan, Keterangan
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                    exportFormat === "penumpang"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-surface-600 bg-surface-800"
                  )}>
                    {exportFormat === "penumpang" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* Format 2: Rekap Lengkap Seluruh Data */}
              <div
                onClick={() => setExportFormat("lengkap")}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer",
                  exportFormat === "lengkap"
                    ? "bg-brand-500/10 border-brand-500/60 ring-1 ring-brand-500/40"
                    : "bg-surface-900/60 border-surface-800 hover:border-surface-700"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Rekap Lengkap Seluruh Data Ceklis
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Semua Poin Pemeriksaan
                      </span>
                    </h4>
                    <p className="text-xs text-surface-400 mt-1">
                      Mengekspor seluruh kolom form teknisi secara komprehensif (kondisi mesin, air radiator, aki, rem, ban, AC, perlengkapan, catatan).
                    </p>
                    <div className="mt-2 text-[11px] text-surface-500 font-mono">
                      Kolom: No Ceklis, Tanggal, Jam, Nopol, KM, BBM, Teknisi, Driver, 20+ Poin Teknis
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                    exportFormat === "lengkap"
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-surface-600 bg-surface-800"
                  )}>
                    {exportFormat === "lengkap" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Pilihan Cakupan Data */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-300">Cakupan Data yang Diekspor:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    exportScope === "filtered"
                      ? "bg-brand-500/15 border-brand-500 text-white font-bold"
                      : "bg-surface-900/60 border-surface-800 text-surface-400 hover:text-white"
                  )}
                >
                  <p className="text-xs">Sesuai Filter ({filteredChecklists.length} Ceklis)</p>
                  <p className="text-[10px] text-surface-500 font-normal">Sesuai pencarian & tanggal</p>
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    exportScope === "all"
                      ? "bg-brand-500/15 border-brand-500 text-white font-bold"
                      : "bg-surface-900/60 border-surface-800 text-surface-400 hover:text-white"
                  )}
                >
                  <p className="text-xs">Semua Riwayat ({checklists.length} Ceklis)</p>
                  <p className="text-[10px] text-surface-500 font-normal">Seluruh data tanpa filter</p>
                </button>
              </div>
            </div>

            {/* Preview Ringkasan Data yang Akan Diekspor */}
            <div className="p-3 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-400">Total data yang akan diekspor:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {targetExportList.length} Ceklis Riil
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto divide-y divide-surface-800/40 p-1 scrollbar-thin">
                {targetExportList.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-[11px] text-surface-300 py-1">
                    <span className="font-mono font-bold text-white">{item.nopol}</span>
                    <span className="text-surface-400">{item.date ? format(new Date(item.date), "dd MMM yyyy") : "-"}</span>
                    <span className="text-surface-400 truncate max-w-[130px]">{item.driver_name || item.technician_name || "-"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeExport(exportFormat)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Ekspor Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Panduan Lokasi File Hasil Ekspor di Android */}
      {downloadSuccessModal.open && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDownloadSuccessModal({ ...downloadSuccessModal, open: false })}
        >
          <div 
            className="glass-card max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Laporan Berhasil Diekspor!</h3>
                <p className="text-xs text-surface-400 mt-0.5">{downloadSuccessModal.totalRows} data riil telah dibuat ke file Excel</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-surface-800 space-y-1.5">
              <p className="text-[11px] font-bold uppercase text-surface-400 tracking-wider">Nama File:</p>
              <p className="text-xs font-mono font-semibold text-emerald-400 break-all">
                {downloadSuccessModal.fileName}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-900/90 border border-surface-800 space-y-2 text-xs text-surface-300">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <FolderDown className="w-4 h-4" />
                <span>Dimana Membuka File di HP Android?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-surface-300 text-[11px] leading-relaxed">
                <li>
                  Klik tombol <strong>"Buka / Bagikan File"</strong> di bawah untuk langsung membuka file dengan <strong>Excel</strong>, <strong>WPS Office</strong>, atau <strong>Google Sheets</strong> di HP Anda.
                </li>
                <li>
                  Atau buka aplikasi <strong>Pengelola File / File Saya / Files</strong> di HP Anda, lalu masuk ke folder <strong>Download (Unduhan)</strong>. File otomatis tersimpan di sana.
                </li>
              </ol>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleShareFileAgain}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Buka / Bagikan File Langsung di HP
              </button>

              <button
                type="button"
                onClick={() => setDownloadSuccessModal({ ...downloadSuccessModal, open: false })}
                className="w-full py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition-colors"
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
