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
  ExternalLink,
  MessageCircle,
  FileText,
  Copy
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

  // Export Modal, View Report & Android Download States
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"penumpang" | "lengkap">("penumpang");
  const [exportScope, setExportScope] = useState<"filtered" | "all">("filtered");
  const [isExporting, setIsExporting] = useState(false);
  const [viewReportModalOpen, setViewReportModalOpen] = useState(false);
  const [downloadSuccessModal, setDownloadSuccessModal] = useState<{
    open: boolean;
    fileName: string;
    blob: Blob | null;
    url: string;
    totalRows: number;
    records: any[];
  }>({
    open: false,
    fileName: "",
    blob: null,
    url: "",
    totalRows: 0,
    records: [],
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

  // Status Aktif Filter Tanggal Presisi
  const isTodaySelected = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return dateRange.start === today && dateRange.end === today;
  }, [dateRange]);

  const isLast7DaysSelected = useMemo(() => {
    const end = format(new Date(), "yyyy-MM-dd");
    const startObj = new Date();
    startObj.setDate(startObj.getDate() - 6);
    const start = format(startObj, "yyyy-MM-dd");
    return dateRange.start === start && dateRange.end === end;
  }, [dateRange]);

  const isMonthSelected = useMemo(() => {
    const today = new Date();
    const startMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
    const endMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
    return dateRange.start === startMonth && dateRange.end === endMonth;
  }, [dateRange]);

  const isAllDatesSelected = !dateRange.start && !dateRange.end;

  // Bagikan Ringkasan Laporan ke WhatsApp (Berjalan mulus di Android APK)
  const handleShareWhatsApp = (customList?: any[]) => {
    const list = customList || targetExportList;
    if (!list || list.length === 0) {
      toast.error("Tidak ada data untuk dibagikan ke WhatsApp");
      return;
    }
    let text = `*LAPORAN CEKLIST FISIK KENDARAAN*\n`;
    text += `*PT. GUDANG GARAM TBK. KEDIRI*\n`;
    text += `Tanggal: ${format(new Date(), "dd MMMM yyyy", { locale: id })}\n`;
    text += `Jumlah Armada: ${list.length} Kendaraan\n`;
    text += `------------------------------------\n\n`;
    list.forEach((item, idx) => {
      text += `${idx + 1}. *${item.nopol}*\n`;
      text += `   • Status: ${item.status || "Baik / Laik Jalan"}\n`;
      text += `   • Pengemudi: ${item.driver_name || "-"}\n`;
      text += `   • Teknisi: ${item.technician_name || "-"}\n`;
      text += `   • KM: ${item.km_berangkat || "-"} | BBM: ${item.bbm_awal || "-"}\n`;
      if (item.notes) text += `   • Catatan: ${item.notes}\n`;
      text += `\n`;
    });
    if (downloadSuccessModal.url) {
      text += `------------------------------------\n`;
      text += `📥 *Link Unduh File Excel Langsung*:\n${downloadSuccessModal.url}\n`;
    }
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  // Unduh File Excel Langsung via SheetJS (Sisi Klien)
  const handleClientExcelDownload = () => {
    try {
      const rows = targetExportList.map((c, idx) => ({
        "No": idx + 1,
        "No Polisi": c.nopol,
        "Tanggal": c.date ? format(new Date(c.date), "dd/MM/yyyy") : "-",
        "Jam": c.time || "-",
        "Pengemudi": c.driver_name || "-",
        "Teknisi": c.technician_name || "-",
        "KM Berangkat": c.km_berangkat || "-",
        "BBM Awal": c.bbm_awal || "-",
        "Kondisi Mesin": c.items?.engine_oil ? "Baik" : "Perlu Cek",
        "Air Radiator": c.items?.radiator_water ? "Baik" : "Perlu Cek",
        "Aki": c.items?.battery ? "Baik" : "Perlu Cek",
        "Kondisi Rem": c.items?.brakes ? "Baik" : "Perlu Cek",
        "Kondisi Ban": c.items?.tires ? "Baik" : "Perlu Cek",
        "AC": c.items?.ac ? "Baik" : "Perlu Cek",
        "Status": c.status || "Baik / Laik Jalan",
        "Catatan": c.notes || "-",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Ceklis");
      const fileName = `Laporan_Ceklis_Kendaraan_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("File Excel berhasil diunduh!");
    } catch (err) {
      toast.error("Gagal mengunduh file Excel secara lokal.");
    }
  };

  // Export ke Excel Menggunakan Endpoint Resmi Server Tanpa Menavigasi WebView
  const executeExport = async (formatType: "penumpang" | "lengkap") => {
    if (targetExportList.length === 0) {
      toast.error("Tidak ada data ceklis untuk diekspor.");
      return;
    }

    const fileName = formatType === "penumpang"
      ? `Laporan_Chek_List_Kendaraan_Penumpang_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
      : `Rekap_Lengkap_Ceklis_Kendaraan_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;

    const exportUrl = `/api/vehicle-checklists/export?format=${formatType}&scope=${exportScope}&startDate=${dateRange.start}&endDate=${dateRange.end}&status=${statusFilter}&search=${encodeURIComponent(search)}`;

    setIsExporting(true);

    try {
      // 1. Dapatkan token otentikasi unduhan aman untuk browser / Download Manager HP Android
      let token = "";
      try {
        const tokenRes = await fetch("/api/vehicle-checklists/export", { method: "POST" });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          token = tokenData.token || "";
        }
      } catch (_) {}

      const exportUrlWithToken = token ? `${exportUrl}&token=${token}` : exportUrl;
      const fullPublicDownloadUrl = typeof window !== "undefined"
        ? `${window.location.origin}${exportUrlWithToken}`
        : exportUrlWithToken;

      // 2. Ambil data binary blob langsung dari server
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error("Gagal mengambil data dari server");
      }
      const blob = await res.blob();

      // 3. Pemicu Unduh Otomatis File Excel (Berjalan di Browser Web & Android Chrome)
      try {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        }, 2000);
      } catch (_) {}

      // 4. Tutup modal opsi dan BUKA modal hasil ekspor (Pop-up Hasil Ekspor)
      setExportModalOpen(false);
      setDownloadSuccessModal({
        open: true,
        fileName,
        blob,
        url: fullPublicDownloadUrl,
        totalRows: targetExportList.length,
        records: targetExportList,
      });

      toast.success(`Laporan siap! (${targetExportList.length} data riil)`);
    } catch (e: any) {
      console.error("Export error:", e);
      toast.error("Gagal menyiapkan laporan: " + (e?.message || "Terjadi kesalahan jaringan"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareFileAgain = async () => {
    if (!downloadSuccessModal.blob) {
      toast.error("Data file tidak ditemukan.");
      return;
    }

    const file = new File([downloadSuccessModal.blob], downloadSuccessModal.fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // 1. Coba Web Share API (didukung di HP Android / Chrome)
    if (typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: downloadSuccessModal.fileName,
            text: `Buka Laporan Ceklis Kendaraan (${downloadSuccessModal.totalRows} data)`,
          });
          return;
        }
      } catch (err) {
        console.log("Share cancelled or not allowed:", err);
      }
    }

    // 2. Fallback: Unduh via Blob URL langsung
    try {
      const blobUrl = window.URL.createObjectURL(downloadSuccessModal.blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = downloadSuccessModal.fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 1500);
      toast.success("File telah diunduh ke memori perangkat!");
    } catch (e) {
      toast.error("Gagal mengunduh file.");
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
            onClick={() => setViewReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
            title="Buka Dokumen Laporan di Layar HP"
          >
            <Eye className="w-3.5 h-3.5" />
            Buka Laporan
          </button>

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

            {/* Filter Tanggal Presisi: Desain Simetris & Responsif Mobile */}
            <div className="bg-surface-900/90 border border-surface-700/80 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-wide">
                    Filter Tanggal
                  </span>
                  {(dateRange.start || dateRange.end) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30 animate-pulse">
                      Tersaring
                    </span>
                  )}
                </div>

                {/* Tombol Preset Presisi (Grid 4 kolom di mobile, sejajar di desktop) */}
                <div className="grid grid-cols-4 sm:flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setDateRange({ start: "", end: "" })}
                    className={cn(
                      "h-8 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center",
                      isAllDatesSelected
                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-400"
                        : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-750"
                    )}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = format(new Date(), "yyyy-MM-dd");
                      setDateRange({ start: today, end: today });
                    }}
                    className={cn(
                      "h-8 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center",
                      isTodaySelected
                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-400"
                        : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-750"
                    )}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const end = format(new Date(), "yyyy-MM-dd");
                      const startObj = new Date();
                      startObj.setDate(startObj.getDate() - 6);
                      const start = format(startObj, "yyyy-MM-dd");
                      setDateRange({ start, end });
                    }}
                    className={cn(
                      "h-8 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center",
                      isLast7DaysSelected
                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-400"
                        : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-750"
                    )}
                  >
                    7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const startMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
                      const endMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
                      setDateRange({ start: startMonth, end: endMonth });
                    }}
                    className={cn(
                      "h-8 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center",
                      isMonthSelected
                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-400"
                        : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-750"
                    )}
                  >
                    Bulan Ini
                  </button>
                </div>
              </div>

              {/* Input Tanggal: Simetris, Rapi, & Presisi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-surface-800/80">
                <div className="flex items-center bg-surface-950 border border-surface-700/80 rounded-xl h-10 px-3 focus-within:border-brand-500 transition-colors">
                  <span className="text-[11px] font-bold text-surface-400 uppercase w-14 shrink-0">
                    Dari:
                  </span>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full bg-transparent text-white text-xs font-mono focus:outline-none [color-scheme:dark]"
                    title="Pilih tanggal mulai"
                  />
                </div>

                <div className="flex items-center bg-surface-950 border border-surface-700/80 rounded-xl h-10 px-3 focus-within:border-brand-500 transition-colors">
                  <span className="text-[11px] font-bold text-surface-400 uppercase w-14 shrink-0">
                    Sampai:
                  </span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full bg-transparent text-white text-xs font-mono focus:outline-none [color-scheme:dark]"
                    title="Pilih tanggal akhir"
                  />
                  {(dateRange.start || dateRange.end) && (
                    <button
                      type="button"
                      onClick={() => setDateRange({ start: "", end: "" })}
                      className="p-1 rounded-lg text-surface-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 ml-1.5"
                      title="Reset rentang tanggal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
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
            className="glass-card max-w-lg w-full p-6 rounded-2xl border border-emerald-500/30 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
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
                disabled={isExporting}
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => executeExport(exportFormat)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyiapkan Laporan...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Ekspor Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pop-Up Hasil Ekspor Laporan Kendaraan */}
      {downloadSuccessModal.open && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDownloadSuccessModal({ ...downloadSuccessModal, open: false })}
        >
          <div 
            className="glass-card max-w-lg w-full p-6 rounded-2xl border border-emerald-500/40 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">Laporan Berhasil Diekspor!</h3>
                <p className="text-xs text-surface-400 mt-0.5">{downloadSuccessModal.totalRows} data riil telah disatukan dalam lembar laporan</p>
              </div>
              <button 
                onClick={() => setDownloadSuccessModal({ ...downloadSuccessModal, open: false })}
                className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-surface-800 space-y-1">
              <p className="text-[11px] font-bold uppercase text-surface-400 tracking-wider">Nama File Excel:</p>
              <p className="text-xs font-mono font-semibold text-emerald-400 break-all">
                {downloadSuccessModal.fileName}
              </p>
            </div>

            {/* Pratinjau Rekap Ceklis yang Masuk ke File */}
            {downloadSuccessModal.records && downloadSuccessModal.records.length > 0 && (
              <div className="p-3 rounded-xl bg-surface-900/90 border border-surface-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-surface-300">Ringkasan Data dalam File:</span>
                  <span className="text-[11px] text-emerald-400 font-bold">{downloadSuccessModal.records.length} Kendaraan</span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-surface-800/60 rounded-lg bg-surface-950/50 p-2 scrollbar-thin">
                  {downloadSuccessModal.records.map((r: any, idx: number) => (
                    <div key={r.id || idx} className="py-1.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-white">{r.nopol}</div>
                        <div className="text-[10px] text-surface-400">{r.driver_name || r.technician_name || "Teknisi"}</div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          r.status === "Baik / Laik Jalan" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                        )}>
                          {r.status || "Baik"}
                        </span>
                        <div className="text-[10px] text-surface-400 mt-0.5">{r.date ? format(new Date(r.date), "dd MMM yyyy") : "-"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Panduan Lokasi File di HP Android */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-400">
                <FolderDown className="w-4 h-4 shrink-0" />
                Lokasi File di HP Android:
              </p>
              <p>
                File disimpan di: <strong>Penyimpanan Internal &gt; Download</strong>.
                Buka aplikasi <strong>Pengelola File / File Saya</strong> di HP Anda untuk menemukan file <strong>{downloadSuccessModal.fileName}</strong>.
              </p>
            </div>

            {/* Tombol Aksi di Android & Web */}
            <div className="space-y-2 pt-1">
              {/* Tombol Utama Android: Unduh ke Folder Download Resmi HP via Chrome */}
              <a
                href={downloadSuccessModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-center"
              >
                <Download className="w-4 h-4" />
                Unduh File ke Folder Download HP (Browser Luar / Chrome)
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDownloadSuccessModal({ ...downloadSuccessModal, open: false });
                    setViewReportModalOpen(true);
                  }}
                  className="py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  Buka di Layar
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(downloadSuccessModal.records)}
                  className="py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Kirim ke WA
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(downloadSuccessModal.url);
                    toast.success("Link unduhan file berhasil disalin ke clipboard!");
                  }
                }}
                className="w-full py-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-surface-300 border border-surface-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-brand-400" />
                Salin Link Download File Excel
              </button>

              <button
                type="button"
                onClick={() => setDownloadSuccessModal({ ...downloadSuccessModal, open: false })}
                className="w-full py-2 rounded-xl bg-surface-800 hover:bg-surface-750 text-surface-400 hover:text-white text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buka & Tampilkan Laporan Dokumen Lengkap di Layar HP */}
      {viewReportModalOpen && (
        <div 
          className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setViewReportModalOpen(false)}
        >
          <div 
            className="glass-card max-w-5xl w-full rounded-2xl border border-brand-500/30 bg-surface-950 flex flex-col max-h-[94vh] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Dokumen */}
            <div className="p-4 border-b border-surface-800 flex items-center justify-between bg-surface-900/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Lembar Laporan Ceklis Kendaraan
                  </h3>
                  <p className="text-[11px] text-surface-400">
                    PT. Gudang Garam Tbk. Kediri • {targetExportList.length} Kendaraan Tersaring
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-semibold border border-surface-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak
                </button>
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(targetExportList)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Bagikan WA
                </button>
                <button
                  type="button"
                  onClick={() => setViewReportModalOpen(false)}
                  className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Isi Tabel Dokumen Laporan */}
            <div className="flex-1 overflow-auto p-3 sm:p-5 space-y-4">
              {/* Header Dokumen Formal */}
              <div className="p-4 rounded-xl bg-surface-900/60 border border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-extrabold text-white uppercase text-sm sm:text-base tracking-wide">
                    LAPORAN CHEK LIST KONDISI KENDARAAN PENUMPANG
                  </h4>
                  <p className="text-surface-400 text-xs mt-0.5">
                    Periode: {dateRange.start ? format(new Date(dateRange.start), "dd MMM yyyy") : "Awal"} s/d {dateRange.end ? format(new Date(dateRange.end), "dd MMM yyyy") : "Hari Ini"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                    Laik: {targetExportList.filter(c => c.status === "Baik / Laik Jalan").length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
                    Perbaikan: {targetExportList.filter(c => c.status !== "Baik / Laik Jalan").length}
                  </span>
                </div>
              </div>

              {/* Tabel Data Ceklis Lengkap */}
              <div className="rounded-xl border border-surface-800 overflow-x-auto shadow-inner bg-surface-950/70">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-surface-800 bg-surface-900 text-surface-300 text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">No Polisi</th>
                      <th className="py-2.5 px-3">Tanggal & Jam</th>
                      <th className="py-2.5 px-3">Pengemudi</th>
                      <th className="py-2.5 px-3">Teknisi</th>
                      <th className="py-2.5 px-3">KM / BBM</th>
                      <th className="py-2.5 px-3 text-center">Oli</th>
                      <th className="py-2.5 px-3 text-center">Radiator</th>
                      <th className="py-2.5 px-3 text-center">Rem</th>
                      <th className="py-2.5 px-3 text-center">Ban</th>
                      <th className="py-2.5 px-3 text-center">AC</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60 font-sans">
                    {targetExportList.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-surface-500 text-xs">
                          Tidak ada data ceklis kendaraan untuk periode ini.
                        </td>
                      </tr>
                    ) : (
                      targetExportList.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-surface-900/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-surface-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">{item.nopol}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-surface-300">
                            <div>{item.date ? format(new Date(item.date), "dd/MM/yyyy") : "-"}</div>
                            <div className="text-[10px] text-surface-500">{item.time || "-"} WIB</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">{item.driver_name || "-"}</td>
                          <td className="py-2.5 px-3 text-surface-300 whitespace-nowrap">{item.technician_name || "-"}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-surface-300">
                            <div>KM: {item.km_berangkat || "-"}</div>
                            <div className="text-[10px] text-surface-500">BBM: {item.bbm_awal || "-"}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", item.items?.engine_oil ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10")}>
                              {item.items?.engine_oil ? "OK" : "NO"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", item.items?.radiator_water ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10")}>
                              {item.items?.radiator_water ? "OK" : "NO"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", item.items?.brakes ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10")}>
                              {item.items?.brakes ? "OK" : "NO"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", item.items?.tires ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10")}>
                              {item.items?.tires ? "OK" : "NO"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", item.items?.ac ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10")}>
                              {item.items?.ac ? "OK" : "NO"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              item.status === "Baik / Laik Jalan"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            )}>
                              {item.status || "Baik"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-surface-400 text-[11px] max-w-[180px] truncate" title={item.notes || "-"}>
                            {item.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal Dokumen */}
            <div className="p-3.5 border-t border-surface-800 bg-surface-900/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-surface-400">
                Menampilkan <strong className="text-white">{targetExportList.length}</strong> armada kendaraan
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClientExcelDownload}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ekspor Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setViewReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
