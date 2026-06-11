"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  CreditCard,
  Search,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  User,
  Calendar,
  Hash,
  RotateCcw,
  ScanBarcode,
  Keyboard,
  Camera,
  Focus,
  Edit,
  Trash2,
  Download,
  Upload,
  Nfc,
  ListFilter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// E-Toll card status types
type EtollStatus = "in_use" | "returned" | "lost";

interface EtollCard {
  id: string;
  card_number: string;
  card_name?: string;
  name?: string;
  nfc_uid?: string;
  balance: number;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_date?: string;
  returned_date?: string;
  status: EtollStatus;
  notes?: string;
  history?: EtollHistory[];
  histories?: any[];
}

interface EtollHistory {
  id: string;
  action: "assigned" | "returned" | "topup" | "reported_lost";
  user_name: string;
  date: string;
  amount?: number;
  notes?: string;
}

// Mock E-Toll data
const mockEtollCards: EtollCard[] = [
  {
    id: "etoll-001",
    card_number: "6281 5000 0001 2345",
    card_name: "Mandiri E-Toll #1",
    balance: 250000,
    assigned_to: "user-001",
    assigned_to_name: "Ahmad Rizki Pratama",
    assigned_date: "2024-05-28T08:00:00Z",
    status: "in_use",
    notes: "Rute Surabaya - Jakarta",
    history: [
      { id: "h1", action: "assigned", user_name: "Ahmad Rizki Pratama", date: "2024-05-28T08:00:00Z", notes: "Perjalanan Surabaya - Jakarta" },
      { id: "h2", action: "topup", user_name: "Admin", date: "2024-05-27T10:00:00Z", amount: 200000 },
      { id: "h3", action: "returned", user_name: "Budi Santoso", date: "2024-05-26T16:00:00Z" },
      { id: "h4", action: "assigned", user_name: "Budi Santoso", date: "2024-05-20T07:00:00Z" },
    ],
  },
  {
    id: "etoll-002",
    card_number: "6281 5000 0002 6789",
    card_name: "Mandiri E-Toll #2",
    balance: 175000,
    assigned_to: "user-003",
    assigned_to_name: "Budi Santoso",
    assigned_date: "2024-05-30T07:30:00Z",
    status: "in_use",
    notes: "Rute Surabaya - Semarang",
    history: [
      { id: "h5", action: "assigned", user_name: "Budi Santoso", date: "2024-05-30T07:30:00Z", notes: "Rute Surabaya - Semarang" },
      { id: "h6", action: "topup", user_name: "Admin", date: "2024-05-29T09:00:00Z", amount: 150000 },
    ],
  },
  {
    id: "etoll-003",
    card_number: "6281 5000 0003 1122",
    card_name: "BRI Brizzi #1",
    balance: 50000,
    returned_date: "2024-05-31T15:30:00Z",
    status: "returned",
    history: [
      { id: "h7", action: "returned", user_name: "Dewi Kartika", date: "2024-05-31T15:30:00Z" },
      { id: "h8", action: "assigned", user_name: "Dewi Kartika", date: "2024-05-25T08:00:00Z" },
      { id: "h9", action: "topup", user_name: "Admin", date: "2024-05-24T14:00:00Z", amount: 100000 },
    ],
  },
  {
    id: "etoll-004",
    card_number: "6281 5000 0004 3344",
    card_name: "Mandiri E-Toll #3",
    balance: 320000,
    assigned_to: "user-007",
    assigned_to_name: "Gunawan Wibowo",
    assigned_date: "2024-05-29T06:45:00Z",
    status: "in_use",
    notes: "Rute Semarang - Jakarta PP",
    history: [
      { id: "h10", action: "assigned", user_name: "Gunawan Wibowo", date: "2024-05-29T06:45:00Z", notes: "Rute Semarang - Jakarta PP" },
      { id: "h11", action: "topup", user_name: "Admin", date: "2024-05-28T11:00:00Z", amount: 300000 },
    ],
  },
  {
    id: "etoll-005",
    card_number: "6281 5000 0005 5566",
    card_name: "BCA Flazz #1",
    balance: 0,
    status: "lost",
    notes: "Dilaporkan hilang oleh Eko Prasetyo pada 25 Mei 2024",
    history: [
      { id: "h12", action: "reported_lost", user_name: "Eko Prasetyo", date: "2024-05-25T12:00:00Z", notes: "Hilang saat perjalanan" },
      { id: "h13", action: "assigned", user_name: "Eko Prasetyo", date: "2024-05-22T07:00:00Z" },
    ],
  },
  {
    id: "etoll-006",
    card_number: "6281 5000 0006 7788",
    card_name: "Mandiri E-Toll #4",
    balance: 425000,
    returned_date: "2024-06-01T09:00:00Z",
    status: "returned",
    history: [
      { id: "h14", action: "returned", user_name: "Ahmad Rizki Pratama", date: "2024-06-01T09:00:00Z" },
      { id: "h15", action: "topup", user_name: "Admin", date: "2024-05-31T10:00:00Z", amount: 400000 },
      { id: "h16", action: "assigned", user_name: "Ahmad Rizki Pratama", date: "2024-05-28T08:00:00Z" },
    ],
  },
];

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function EtollPage() {
  const { data: mockEtollCards = [], error, mutate } = useSWR("/api/etoll", fetcher);
  const { data: usersData = [] } = useSWR("/api/users", fetcher);
  const realUsers = Array.isArray(usersData) ? usersData : [];
  
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | EtollStatus>("all");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<EtollCard | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningCard, setAssigningCard] = useState<EtollCard | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<EtollCard | null>(null);

  // Assign state
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignDriverSearch, setAssignDriverSearch] = useState("");
  const [isAssignDriverDropdownOpen, setIsAssignDriverDropdownOpen] = useState(false);
  const [assignNotes, setAssignNotes] = useState("");
  const [assignBalance, setAssignBalance] = useState("");

  // Return state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningCard, setReturningCard] = useState<EtollCard | null>(null);
  const [returnBalance, setReturnBalance] = useState("");

  // Top Up state
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupCard, setTopupCard] = useState<EtollCard | null>(null);
  const [topupAmount, setTopupAmount] = useState("");

  const etollFileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingEtoll, setIsUploadingEtoll] = useState(false);
  
  const [isScanningNFC, setIsScanningNFC] = useState(false);
  const [nfcMode, setNfcMode] = useState<"search" | "register">("search");
  const [nfcRegisterCardId, setNfcRegisterCardId] = useState<string | null>(null);
  const nfcReaderRef = useRef<any>(null);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);
  const nfcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup NFC scan resources
  const stopNFCScan = useCallback(() => {
    if (nfcTimeoutRef.current) {
      clearTimeout(nfcTimeoutRef.current);
      nfcTimeoutRef.current = null;
    }
    if (nfcAbortControllerRef.current) {
      nfcAbortControllerRef.current.abort();
      nfcAbortControllerRef.current = null;
    }
    nfcReaderRef.current = null;
    setIsScanningNFC(false);
    setNfcMode("search");
    setNfcRegisterCardId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopNFCScan();
    };
  }, [stopNFCScan]);

  // Core NFC scan function that handles both "search" and "register" modes
  const startNFCScan = async (mode: "search" | "register", cardIdForRegister?: string) => {
    if (!('NDEFReader' in window)) {
      toast.error("NFC tidak didukung", {
        description: "Gunakan Chrome di Android untuk fitur NFC."
      });
      return;
    }

    if (isScanningNFC) {
      stopNFCScan();
      toast.info("Scan NFC dihentikan");
      return;
    }

    try {
      stopNFCScan();

      setIsScanningNFC(true);
      setNfcMode(mode);
      if (cardIdForRegister) setNfcRegisterCardId(cardIdForRegister);

      const abortController = new AbortController();
      nfcAbortControllerRef.current = abortController;

      // @ts-ignore
      const ndef = new window.NDEFReader();
      nfcReaderRef.current = ndef;

      await ndef.scan({ signal: abortController.signal });

      toast.info("NFC Aktif", { 
        description: mode === "register" 
          ? "Tempelkan kartu E-Toll untuk mendaftarkan NFC-nya." 
          : "Tempelkan kartu E-Toll untuk mencari datanya." 
      });

      ndef.addEventListener("reading", async ({ serialNumber }: any) => {
        const sn = serialNumber || "";
        if (!sn) {
          toast.error("Tidak dapat membaca Serial Number kartu.");
          stopNFCScan();
          return;
        }

        if (mode === "register" && cardIdForRegister) {
          // REGISTER MODE: Save NFC UID to the card
          try {
            const res = await fetch(`/api/etoll/${cardIdForRegister}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "register_nfc", nfc_uid: sn })
            });
            if (res.ok) {
              toast.success("NFC berhasil didaftarkan!", { description: `UID: ${sn}` });
              mutate();
            } else {
              const data = await res.json();
              toast.error(data.message || "Gagal mendaftarkan NFC");
            }
          } catch (e) {
            toast.error("Terjadi kesalahan jaringan");
          }
          stopNFCScan();
        } else {
          // SEARCH MODE: Look up card by NFC UID
          try {
            const res = await fetch(`/api/etoll/nfc/${encodeURIComponent(sn)}`);
            const data = await res.json();
            if (data.found && data.card) {
              toast.success("Kartu ditemukan!", { description: `${data.card.name} — ${data.card.card_number}` });
              setSelectedCard(data.card);
            } else {
              // Card not registered with this NFC UID
              toast.info("NFC belum terdaftar", { 
                description: `UID: ${sn} — Daftarkan NFC di detail kartu terlebih dahulu.`
              });
              setSearch(sn);
            }
          } catch (e) {
            toast.error("Gagal mencari kartu");
            setSearch(sn);
          }
          stopNFCScan();
        }
      }, { signal: abortController.signal });

      ndef.addEventListener("readingerror", () => {
        toast.success("Kartu terdeteksi!", { 
          description: "Silakan ketik nomor kartu di kolom pencarian." 
        });
        setTimeout(() => searchInputRef.current?.focus(), 100);
        stopNFCScan();
      }, { signal: abortController.signal });

      // Auto-stop after 30 seconds
      nfcTimeoutRef.current = setTimeout(() => {
        stopNFCScan();
        toast.info("Scan NFC timeout", { description: "Silakan coba lagi." });
      }, 30000);

    } catch (error: any) {
      console.error("NFC Scan Error:", error);
      if (error?.name === 'AbortError') return;
      toast.error("NFC gagal diaktifkan", { 
        description: error?.message || "Pastikan NFC aktif di pengaturan HP." 
      });
      stopNFCScan();
    }
  };

  // Search mode NFC scan (used by the NFC button in search bar)
  const handleNFCScan = () => startNFCScan("search");

  // Register mode NFC scan (used in card detail modal)
  const handleNFCRegister = (cardId: string) => startNFCScan("register", cardId);

  const handleReturnSubmit = async () => {
    if (!returningCard) return;
    try {
      const payload: any = { action: "return" };
      if (returnBalance !== "") payload.new_balance = parseInt(returnBalance);

      const res = await fetch(`/api/etoll/${returningCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        setIsReturnModalOpen(false);
        setReturningCard(null);
        setReturnBalance("");
        mutate();
        toast.success("Kartu berhasil dikembalikan");
      } else {
        toast.error((await res.json()).message);
      }
    } catch(e) { toast.error("Terjadi kesalahan"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kartu E-Toll ini? Data yang terhapus tidak dapat dikembalikan.")) return;
    try {
      const res = await fetch(`/api/etoll/${id}`, {
        method: "DELETE"
      });
      if(res.ok) {
        setSelectedCard(null);
        mutate();
        toast.success("Kartu berhasil dihapus");
      } else {
        toast.error((await res.json()).message);
      }
    } catch(e) { toast.error("Terjadi kesalahan"); }
  };

  const handleTopupSubmit = async () => {
    if (!topupCard || !topupAmount) return;
    const amount = parseInt(topupAmount);
    if (isNaN(amount) || amount <= 0) return toast.error("Nominal tidak valid");
    
    try {
      const res = await fetch(`/api/etoll/${topupCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topup", amount })
      });
      if(res.ok) {
        setIsTopupModalOpen(false);
        setTopupCard(null);
        setTopupAmount("");
        mutate();
        toast.success("Top Up berhasil");
      } else {
        toast.error((await res.json()).message);
      }
    } catch(e) { toast.error("Terjadi kesalahan"); }
  };

  const handleAssignSubmit = async () => {
    if (!assigningCard || !assignDriverId) return toast.error("Pilih pengemudi terlebih dahulu");
    try {
      const payload: any = { action: "assign", user_id: assignDriverId, notes: assignNotes };
      if (assignBalance !== "") payload.new_balance = parseInt(assignBalance);

      const res = await fetch(`/api/etoll/${assigningCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        setIsAssignModalOpen(false);
        setAssigningCard(null);
        setAssignDriverId("");
        setAssignDriverSearch("");
        setAssignNotes("");
        setAssignBalance("");
        setIsAssignDriverDropdownOpen(false);
        mutate();
        toast.success("Kartu berhasil dipinjamkan");
      } else {
        toast.error((await res.json()).message);
      }
    } catch(e) { toast.error("Terjadi kesalahan"); }
  };

  const etollData = Array.isArray(mockEtollCards) ? mockEtollCards : [];

  const filteredCards = etollData.filter((card: any) => {
    const cardName = card.name || card.card_name || "";
    const activeUser = card.status === "in_use" && card.histories?.[0]?.user?.full_name ? card.histories[0].user.full_name : "";
    
    const matchSearch =
      card.card_number.toLowerCase().includes(search.toLowerCase()) ||
      cardName.toLowerCase().includes(search.toLowerCase()) ||
      activeUser.toLowerCase().includes(search.toLowerCase()) ||
      (card.nfc_uid && card.nfc_uid.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || card.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCards = etollData.length;
  const inUseCount = etollData.filter((c: any) => c.status === "in_use").length;
  const returnedCount = etollData.filter((c: any) => c.status === "returned" || c.status === "available").length;
  const lostCount = etollData.filter((c: any) => c.status === "lost").length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: EtollStatus) => {
    switch (status) {
      case "in_use":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Sedang Dipakai
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sudah Kembali
          </span>
        );
      case "lost":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Hilang
          </span>
        );
    }
  };

  const getHistoryIcon = (action: string) => {
    switch (action) {
      case "assigned":
        return <User className="w-3.5 h-3.5 text-brand-400" />;
      case "returned":
        return <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />;
      case "topup":
        return <CreditCard className="w-3.5 h-3.5 text-purple-400" />;
      case "reported_lost":
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-surface-400" />;
    }
  };

  const getHistoryLabel = (action: string) => {
    switch (action) {
      case "assigned": return "Dipinjamkan ke";
      case "returned": return "Dikembalikan oleh";
      case "topup": return "Top Up oleh";
      case "reported_lost": return "Dilaporkan hilang oleh";
      default: return action;
    }
  };

  const downloadEtollTemplate = () => {
    const templateData = [
      { "Nomor Kartu": "6281 5000 0000 1234", "Nama Kartu": "Mandiri E-Toll #1", "Saldo Awal": 100000 }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template EToll");
    XLSX.writeFile(wb, "Template_Import_EToll.xlsx");
    toast.success("Template E-Toll berhasil diunduh!");
  };

  const handleEtollFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEtoll(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/etoll/import", {
        method: "POST",
        body: formData
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Berhasil import ${result.imported} kartu E-Toll`, {
          description: result.skipped > 0 ? `${result.skipped} kartu dilewati (nomor sudah ada)` : undefined
        });
        mutate();
      } else {
        toast.error(result.message || "Gagal mengimport data E-Toll");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsUploadingEtoll(false);
      if (etollFileInputRef.current) etollFileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="space-y-6 slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen E-Toll</h1>
          <p className="text-sm text-surface-400 mt-1">Pantau penggunaan dan pengembalian kartu E-Toll pengemudi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadEtollTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-700 font-medium text-surface-300 hover:bg-surface-800 hover:text-white transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm cursor-pointer ${isUploadingEtoll ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-4 h-4" />
            {isUploadingEtoll ? "Mengupload..." : "Import Excel"}
            <input ref={etollFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleEtollFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all text-sm"
          >
            <Plus className="w-5 h-5" />
            Tambah Kartu
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setFilterStatus("all")} className={cn("glass-card p-4 text-left transition-all", filterStatus === "all" && "ring-1 ring-brand-500/50")}>
          <p className="text-xs text-surface-400 uppercase font-semibold">Total Kartu</p>
          <p className="text-2xl font-bold text-white mt-1">{totalCards}</p>
        </button>
        <button onClick={() => setFilterStatus("in_use")} className={cn("glass-card p-4 border-l-2 border-l-amber-500 text-left transition-all", filterStatus === "in_use" && "ring-1 ring-amber-500/50")}>
          <p className="text-xs text-surface-400 uppercase font-semibold">Sedang Dipakai</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{inUseCount}</p>
        </button>
        <button onClick={() => setFilterStatus("returned")} className={cn("glass-card p-4 border-l-2 border-l-emerald-500 text-left transition-all", filterStatus === "returned" && "ring-1 ring-emerald-500/50")}>
          <p className="text-xs text-surface-400 uppercase font-semibold">Sudah Kembali</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{returnedCount}</p>
        </button>
        <button onClick={() => setFilterStatus("lost")} className={cn("glass-card p-4 border-l-2 border-l-red-500 text-left transition-all", filterStatus === "lost" && "ring-1 ring-red-500/50")}>
          <p className="text-xs text-surface-400 uppercase font-semibold">Hilang</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{lostCount}</p>
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari no. kartu, nama kartu, atau nama pengemudi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-[180px]">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="w-full flex items-center justify-between pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                  <span className="text-sm font-medium">
                    {filterStatus === "all" ? "Semua Status" : filterStatus === "in_use" ? "Di Pinjam" : filterStatus === "returned" ? "Di Kembalikan" : filterStatus === "lost" ? "Hilang" : "Semua Status"}
                  </span>
                </div>
                <svg className={cn("w-4 h-4 fill-current text-surface-500 transition-transform duration-300", isFilterDropdownOpen && "rotate-180 text-brand-400")} viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </button>
              
              <AnimatePresence>
              {isFilterDropdownOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsFilterDropdownOpen(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute z-50 w-full bottom-full mb-2 py-1.5 bg-surface-800 border border-surface-700 rounded-xl shadow-lg overflow-hidden"
                  >
                    {[
                      { value: "all", label: "Semua Status" },
                      { value: "in_use", label: "Di Pinjam" },
                      { value: "returned", label: "Di Kembalikan" },
                      { value: "lost", label: "Hilang" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setFilterStatus(option.value as any); setIsFilterDropdownOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 relative",
                          filterStatus === option.value ? "text-brand-400 font-medium bg-brand-500/10" : "text-surface-300 hover:text-white hover:bg-surface-700/50"
                        )}
                      >
                        {filterStatus === option.value && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-500" />
                        )}
                        <div className={cn("w-1.5 h-1.5 rounded-full", filterStatus === option.value ? "bg-brand-500" : "bg-transparent")} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
              </AnimatePresence>
            </div>
          <button
            onClick={handleNFCScan}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-4 py-1 rounded-xl border transition-all min-w-[70px]",
              isScanningNFC 
                ? "bg-brand-500/20 border-brand-500/50 text-brand-400 animate-pulse" 
                : "bg-surface-800 border-surface-700 text-surface-400 hover:text-white hover:bg-surface-700 hover:border-surface-600"
            )}
            title={isScanningNFC ? "Tap untuk berhenti scan" : "Scan kartu E-Toll via NFC"}
          >
            <Nfc className={cn("w-5 h-5", isScanningNFC && "animate-bounce")} />
            <span className="text-[10px] font-bold tracking-wider">NFC</span>
          </button>
        </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCards.map((card: any) => (
          <div
            key={card.id}
            onClick={() => setSelectedCard(card)}
            className="glass-card overflow-hidden cursor-pointer hover:border-brand-500/30 transition-all group"
          >
            {/* Card Header - Simulated E-Toll Card */}
            <div className={cn(
              "p-5 relative overflow-hidden",
              card.status === "in_use" && "bg-gradient-to-br from-amber-900/30 to-surface-900",
              card.status === "returned" && "bg-gradient-to-br from-emerald-900/30 to-surface-900",
              card.status === "lost" && "bg-gradient-to-br from-red-900/30 to-surface-900",
            )}>
              <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="w-16 h-16" />
              </div>
              <div className="relative z-10">
                <p className="text-surface-400 text-xs font-medium mb-1">{card.name || card.card_name}</p>
                <p className="text-white text-lg font-mono font-bold tracking-wider">{card.card_number}</p>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-[10px] text-surface-500 uppercase font-semibold">Saldo</p>
                    <p className={cn(
                      "font-bold text-lg",
                      card.balance > 100000 ? "text-emerald-400" : card.balance > 0 ? "text-amber-400" : "text-red-400"
                    )}>
                      {formatCurrency(card.balance)}
                    </p>
                  </div>
                  {getStatusBadge(card.status)}
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3 border-t border-surface-800">
              {card.status === "in_use" && card.histories?.[0] && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-white">
                    {card.histories[0].user?.full_name?.substring(0, 2).toUpperCase() || "??"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{card.histories[0].user?.full_name}</p>
                    <p className="text-[10px] text-surface-400">
                      Sejak {card.histories[0].timestamp && format(new Date(card.histories[0].timestamp), "dd MMM yyyy", { locale: id })}
                    </p>
                  </div>
                </div>
              )}
              {(card.status === "returned" || card.status === "available") && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Dikembalikan {card.histories?.[0]?.timestamp && format(new Date(card.histories[0].timestamp), "dd MMM yyyy", { locale: id })}
                  </span>
                </div>
              )}
              {card.status === "lost" && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Kartu dilaporkan hilang</span>
                </div>
              )}
              {card.notes && (
                <p className="text-xs text-surface-500 italic truncate">&quot;{card.notes}&quot;</p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-surface-800">
                {(card.status === "returned" || card.status === "available") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAssigningCard(card); setAssignBalance(card.balance.toString()); setAssignDriverSearch(""); setIsAssignDriverDropdownOpen(false); setIsAssignModalOpen(true); }}
                    className="flex-1 py-2 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20 transition-colors border border-brand-500/20"
                  >
                    Pinjamkan
                  </button>
                )}
                {card.status === "in_use" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setReturningCard(card); setReturnBalance(card.balance.toString()); setIsReturnModalOpen(true); }}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                  >
                    Kembalikan
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setTopupCard(card); setIsTopupModalOpen(true); }}
                  className="flex-1 py-2 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                >
                  Top Up
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCards.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center">
            <CreditCard className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-400">Tidak ada kartu E-Toll yang ditemukan.</p>
          </div>
        )}
      </div>

      </div>

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={() => setSelectedCard(null)}>
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-700 flex justify-between items-start bg-surface-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedCard.name || selectedCard.card_name}</h2>
                <p className="text-brand-400 font-mono text-sm mt-1">{selectedCard.card_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setEditingCard(selectedCard); setIsEditModalOpen(true); }}
                  className="text-surface-400 hover:text-brand-400 bg-surface-800 p-2 rounded-lg transition-colors"
                  title="Edit Kartu"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(selectedCard.id)}
                  className="text-surface-400 hover:text-red-400 bg-surface-800 p-2 rounded-lg transition-colors"
                  title="Hapus Kartu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-surface-700 mx-1"></div>
                <button onClick={() => setSelectedCard(null)} className="text-surface-400 hover:text-white bg-surface-800 p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Card Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                  <p className="text-xs text-surface-500 uppercase font-semibold mb-1">Status</p>
                  {getStatusBadge(selectedCard.status)}
                </div>
                <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                  <p className="text-xs text-surface-500 uppercase font-semibold mb-1">Saldo</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(selectedCard.balance)}</p>
                </div>
              </div>

              {/* NFC UID Section */}
              <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-surface-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                      <Nfc className="w-3.5 h-3.5" /> NFC UID
                    </p>
                    {selectedCard.nfc_uid ? (
                      <p className="text-sm font-mono text-emerald-400">{selectedCard.nfc_uid}</p>
                    ) : (
                      <p className="text-sm text-surface-500 italic">Belum didaftarkan</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleNFCRegister(selectedCard.id)}
                    disabled={isScanningNFC}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      isScanningNFC && nfcMode === "register"
                        ? "bg-brand-500/20 text-brand-400 animate-pulse border border-brand-500/30"
                        : selectedCard.nfc_uid
                          ? "bg-surface-800 text-surface-400 hover:text-white border border-surface-700"
                          : "bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20"
                    )}
                  >
                    <Nfc className="w-3.5 h-3.5" />
                    {isScanningNFC && nfcMode === "register" 
                      ? "Tempelkan kartu..." 
                      : selectedCard.nfc_uid ? "Ganti NFC" : "Daftarkan NFC"}
                  </button>
                </div>
              </div>

              {selectedCard.status === "in_use" && selectedCard.histories?.[0] && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs text-amber-400 uppercase font-semibold mb-2">Sedang Digunakan Oleh</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-400">
                      {selectedCard.histories[0].user?.full_name?.substring(0, 2).toUpperCase() || "??"}
                    </div>
                    <div>
                      <p className="font-medium text-white">{selectedCard.histories[0].user?.full_name}</p>
                      <p className="text-xs text-surface-400">
                        Sejak {selectedCard.histories[0].timestamp && format(new Date(selectedCard.histories[0].timestamp), "dd MMMM yyyy, HH:mm", { locale: id })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div>
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-400" /> Riwayat Kartu
                </h3>
                <div className="space-y-0">
                  {(selectedCard.histories || []).map((item: any, idx: number) => (
                    <div key={item.id} className="flex gap-3 relative">
                      {/* Timeline line */}
                      {idx < (selectedCard.histories || []).length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-surface-700" />
                      )}
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center shrink-0 z-10">
                        {getHistoryIcon(item.action)}
                      </div>
                      {/* Content */}
                      <div className="pb-5 min-w-0">
                        <p className="text-sm text-white">
                          <span className="text-surface-400">{getHistoryLabel(item.action)}</span>{" "}
                          <span className="font-medium">{item.user?.full_name || item.user_name || "Admin"}</span>
                        </p>
                        {item.amount && (
                          <p className="text-sm font-bold text-purple-400 mt-0.5">+{formatCurrency(item.amount)}</p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-surface-500 italic mt-0.5">{item.notes}</p>
                        )}
                        <p className="text-[10px] text-surface-500 mt-1 font-mono">
                          {format(new Date(item.timestamp || item.date), "dd MMM yyyy, HH:mm", { locale: id })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {isAddModalOpen && (
        <AddEtollModal onClose={() => { setIsAddModalOpen(false); mutate(); }} />
      )}

      {/* Assign Card Modal */}
      {isAssignModalOpen && assigningCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col transform transition-all scale-100 opacity-100 shadow-2xl">
            <div className="p-6 border-b border-surface-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-brand-400" /> Pinjamkan Kartu E-Toll
              </h2>
              <p className="text-sm text-surface-400 mt-1">
                {assigningCard.name || assigningCard.card_name} — <span className="font-mono text-brand-400">{assigningCard.card_number}</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-surface-300">Pinjamkan Ke</label>
                <div className="relative">
                  <div className="flex items-center w-full bg-surface-900 border border-surface-700 rounded-xl overflow-hidden focus-within:border-brand-500 transition-colors">
                     <Search className="w-4 h-4 text-surface-500 ml-3 shrink-0" />
                     <input
                       type="text"
                       placeholder="Cari pengemudi..."
                       value={assignDriverSearch}
                       onChange={(e) => {
                         setAssignDriverSearch(e.target.value);
                         setIsAssignDriverDropdownOpen(true);
                         setAssignDriverId(""); 
                       }}
                       onFocus={() => setIsAssignDriverDropdownOpen(true)}
                       className="w-full bg-transparent text-white px-3 py-2.5 text-sm focus:outline-none"
                     />
                     {assignDriverSearch && (
                       <button 
                         onClick={() => {
                           setAssignDriverId("");
                           setAssignDriverSearch("");
                           setIsAssignDriverDropdownOpen(true);
                         }}
                         className="p-2 text-surface-500 hover:text-white"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                  
                  {isAssignDriverDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-surface-800 border border-surface-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {realUsers
                        .filter((u: any) => u.is_active !== false && u.role !== 'super_admin')
                        .filter((u: any) => u.full_name.toLowerCase().includes(assignDriverSearch.toLowerCase()) || (u.nik && u.nik.toLowerCase().includes(assignDriverSearch.toLowerCase())))
                        .map((u: any) => (
                          <div 
                            key={u.id} 
                            onClick={() => {
                              setAssignDriverId(u.id);
                              setAssignDriverSearch(`${u.full_name} (${u.nik || '-'})`);
                              setIsAssignDriverDropdownOpen(false);
                            }}
                            className={cn(
                              "px-3 py-2 text-sm cursor-pointer hover:bg-surface-700 transition-colors text-white",
                              assignDriverId === u.id && "bg-brand-500/20 text-brand-400"
                            )}
                          >
                            {u.full_name} <span className="text-surface-400 text-xs">({u.nik || '-'})</span>
                          </div>
                      ))}
                      {realUsers.filter((u: any) => u.is_active !== false && u.role !== 'super_admin').filter((u: any) => u.full_name.toLowerCase().includes(assignDriverSearch.toLowerCase()) || (u.nik && u.nik.toLowerCase().includes(assignDriverSearch.toLowerCase()))).length === 0 && (
                        <div className="px-3 py-3 text-sm text-surface-400 text-center">
                          Pengemudi tidak ditemukan
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Saldo Saat Dipinjamkan (Rp)</label>
                <input 
                  type="number" 
                  value={assignBalance}
                  onChange={(e) => setAssignBalance(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors" 
                  placeholder="Contoh: 100000" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Catatan / Rute</label>
                <input 
                  type="text" 
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors" 
                  placeholder="Rute Surabaya - Jakarta" 
                />
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
              <button onClick={() => { setIsAssignModalOpen(false); setAssigningCard(null); setAssignDriverId(""); setAssignDriverSearch(""); setIsAssignDriverDropdownOpen(false); setAssignNotes(""); setAssignBalance(""); }} className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
                Batal
              </button>
              <button onClick={handleAssignSubmit} className="px-5 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all disabled:opacity-50" disabled={!assignDriverId}>
                Pinjamkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Card Modal */}
      {isReturnModalOpen && returningCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col transform transition-all scale-100 opacity-100 shadow-2xl">
            <div className="p-6 border-b border-surface-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Kembalikan Kartu E-Toll
              </h2>
              <p className="text-sm text-surface-400 mt-1">
                Konfirmasi pengembalian kartu {returningCard.name || returningCard.card_name}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mb-4">
                <p className="text-sm text-emerald-400 mb-1">Kartu saat ini digunakan oleh:</p>
                <p className="font-bold text-white">{returningCard.histories?.[0]?.user?.full_name || "Pengemudi"}</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Sisa Saldo Saat Dikembalikan (Rp)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-surface-500 text-sm font-medium">Rp</span>
                  </div>
                  <input 
                    type="number" 
                    value={returnBalance}
                    onChange={(e) => setReturnBalance(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" 
                    placeholder="Sisa saldo..." 
                  />
                </div>
                <p className="text-[10px] text-surface-500">Saldo sebelumnya: {formatCurrency(returningCard.balance)}</p>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
              <button onClick={() => { setIsReturnModalOpen(false); setReturningCard(null); setReturnBalance(""); }} className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
                Batal
              </button>
              <button onClick={handleReturnSubmit} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-medium text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
                Konfirmasi Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {isTopupModalOpen && topupCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-100 opacity-100 shadow-2xl">
            <div className="p-6 border-b border-surface-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" /> Top Up Saldo
              </h2>
              <p className="text-sm text-surface-400 mt-1">
                {topupCard.name || topupCard.card_name}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Nominal Top Up (Rp)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-surface-500 text-sm font-medium">Rp</span>
                  </div>
                  <input 
                    type="number" 
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors" 
                    placeholder="Contoh: 50000" 
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-surface-500">Saldo saat ini: {formatCurrency(topupCard.balance)}</p>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
              <button onClick={() => { setIsTopupModalOpen(false); setTopupCard(null); setTopupAmount(""); }} className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
                Batal
              </button>
              <button onClick={handleTopupSubmit} className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 font-medium text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50" disabled={!topupAmount}>
                Top Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {isEditModalOpen && editingCard && (
        <EditEtollModal 
          card={editingCard}
          onClose={() => { setIsEditModalOpen(false); setEditingCard(null); mutate(); }} 
        />
      )}
    </>
  );
}

// ---- Add E-Toll Modal Component ----
function AddEtollModal({ onClose }: { onClose: () => void }) {
  const [inputMode, setInputMode] = useState<"barcode" | "manual">("barcode");
  const [formData, setFormData] = useState({ cardNumber: "", cardName: "", initialBalance: "" });
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const simulateScan = () => {
    setIsScanning(true);
    setScanSuccess(false);
    setTimeout(() => {
      setFormData(prev => ({ ...prev, cardNumber: "6281 5000 0099 8877" }));
      setIsScanning(false);
      setScanSuccess(true);
    }, 2500);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/etoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_number: formData.cardNumber,
          name: formData.cardName,
        })
      });
      if(res.ok) {
        onClose();
        setFormData({ cardNumber: "", cardName: "", initialBalance: "" });
      } else {
        const d = await res.json();
        alert(d.message);
      }
    } catch(e) {
      alert("Gagal menyimpan data");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
      <div className="glass-card w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-surface-700 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">Tambah Kartu E-Toll</h2>
            <p className="text-sm text-surface-400 mt-1">Scan barcode atau ketik nomor manual.</p>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-white bg-surface-800 p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-900 rounded-xl border border-surface-800">
            <button
              onClick={() => { setInputMode("barcode"); setFormData(prev => ({...prev, cardNumber: ""})); setScanSuccess(false); }}
              className={cn(
                "py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                inputMode === "barcode"
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                  : "text-surface-400 hover:text-white"
              )}
            >
              <ScanBarcode className="w-4 h-4" />
              Scan Barcode
            </button>
            <button
              onClick={() => { setInputMode("manual"); setFormData(prev => ({...prev, cardNumber: ""})); setScanSuccess(false); setIsScanning(false); }}
              className={cn(
                "py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                inputMode === "manual"
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                  : "text-surface-400 hover:text-white"
              )}
            >
              <Keyboard className="w-4 h-4" />
              Ketik Manual
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {inputMode === "barcode" ? (
            <div className="space-y-4">
              {/* Simulated Camera Viewfinder */}
              <div className="relative aspect-[4/3] bg-[#0a0a0a] rounded-2xl overflow-hidden border-2 border-surface-700">
                {/* Camera viewfinder overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {!isScanning && !scanSuccess && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-surface-800/80 flex items-center justify-center border border-surface-600">
                        <Camera className="w-10 h-10 text-surface-400" />
                      </div>
                      <p className="text-surface-400 text-sm">Tekan tombol untuk mulai scan</p>
                    </div>
                  )}

                  {isScanning && (
                    <div className="flex flex-col items-center gap-4">
                      {/* Scanning animation */}
                      <div className="relative w-48 h-32">
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-brand-500 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-brand-500 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-brand-500 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-brand-500 rounded-br-lg" />
                        {/* Scanning line */}
                        <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-[scan_2s_ease-in-out_infinite]"
                          style={{ animation: "scan 2s ease-in-out infinite" }}
                        />
                        <style jsx>{`
                          @keyframes scan {
                            0%, 100% { top: 10%; }
                            50% { top: 85%; }
                          }
                        `}</style>
                      </div>
                      <p className="text-brand-400 text-sm animate-pulse">Memindai barcode...</p>
                    </div>
                  )}

                  {scanSuccess && (
                    <div className="flex flex-col items-center gap-3 fade-in">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="text-emerald-400 text-sm font-medium">Barcode terdeteksi!</p>
                    </div>
                  )}
                </div>

                {/* Grid pattern background */}
                {isScanning && (
                  <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, #3b82f6 20px, #3b82f6 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, #3b82f6 20px, #3b82f6 21px)',
                  }} />
                )}
              </div>

              {!isScanning && !scanSuccess && (
                <button
                  onClick={simulateScan}
                  className="w-full py-3 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-500/25 transition-all"
                >
                  <ScanBarcode className="w-5 h-5" />
                  Mulai Scan
                </button>
              )}

              {/* Show detected number */}
              {scanSuccess && formData.cardNumber && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 uppercase font-semibold mb-1">Nomor E-Toll Terdeteksi</p>
                  <p className="text-xl font-mono font-bold text-white tracking-wider">{formData.cardNumber}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-300">Nomor Kartu E-Toll</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-surface-500" />
                </div>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData(prev => ({...prev, cardNumber: e.target.value}))}
                  className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-surface-600 font-mono text-lg tracking-wider"
                  placeholder="6281 5000 0000 0000"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-surface-500 mt-1">Masukkan 16 digit nomor yang tertera di kartu E-Toll</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.cardNumber.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Edit E-Toll Modal Component ----
function EditEtollModal({ card, onClose }: { card: any, onClose: () => void }) {
  const [formData, setFormData] = useState({
    cardNumber: card.card_number || "",
    cardName: card.name || card.card_name || "",
    notes: card.notes || ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!formData.cardNumber.trim()) return alert("Nomor kartu wajib diisi");
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/etoll/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          card_number: formData.cardNumber,
          card_name: formData.cardName,
          notes: formData.notes
        })
      });
      
      if (res.ok) {
        onClose();
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Gagal menyimpan perubahan");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
      <div className="glass-card w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6 border-b border-surface-700 flex justify-between items-center bg-surface-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit className="w-5 h-5 text-brand-500" /> Edit Kartu E-Toll
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white bg-surface-800 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-300">Nomor Kartu E-Toll</label>
            <input
              type="text"
              value={formData.cardNumber}
              onChange={(e) => setFormData(prev => ({...prev, cardNumber: e.target.value}))}
              className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 transition-all font-mono tracking-wider"
              placeholder="6281 5000 0000 0000"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-300">Nama Kartu (Opsional)</label>
            <input
              type="text"
              value={formData.cardName}
              onChange={(e) => setFormData(prev => ({...prev, cardName: e.target.value}))}
              className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 transition-all"
              placeholder="Mandiri E-Toll #1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-300">Catatan (Opsional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
              className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 transition-all min-h-[100px] resize-none"
              placeholder="Kondisi kartu, dll."
            />
          </div>
        </div>

        <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.cardNumber.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
