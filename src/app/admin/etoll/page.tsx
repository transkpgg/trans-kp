"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";

// E-Toll card status types
type EtollStatus = "in_use" | "returned" | "lost";

interface EtollCard {
  id: string;
  card_number: string;
  card_name: string;
  balance: number;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_date?: string;
  returned_date?: string;
  status: EtollStatus;
  notes?: string;
  history: EtollHistory[];
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

export default function EtollPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | EtollStatus>("all");
  const [selectedCard, setSelectedCard] = useState<EtollCard | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningCard, setAssigningCard] = useState<EtollCard | null>(null);

  const filteredCards = mockEtollCards.filter((card) => {
    const matchSearch =
      card.card_number.toLowerCase().includes(search.toLowerCase()) ||
      card.card_name.toLowerCase().includes(search.toLowerCase()) ||
      card.assigned_to_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || card.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCards = mockEtollCards.length;
  const inUseCount = mockEtollCards.filter((c) => c.status === "in_use").length;
  const returnedCount = mockEtollCards.filter((c) => c.status === "returned").length;
  const lostCount = mockEtollCards.filter((c) => c.status === "lost").length;

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

  return (
    <div className="space-y-6 slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen E-Toll</h1>
          <p className="text-sm text-surface-400 mt-1">Pantau penggunaan dan pengembalian kartu E-Toll pengemudi.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Tambah Kartu
        </button>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            placeholder="Cari no. kartu, nama kartu, atau nama pengemudi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCards.map((card) => (
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
                <p className="text-surface-400 text-xs font-medium mb-1">{card.card_name}</p>
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
              {card.status === "in_use" && card.assigned_to_name && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-white">
                    {card.assigned_to_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{card.assigned_to_name}</p>
                    <p className="text-[10px] text-surface-400">
                      Sejak {card.assigned_date && format(new Date(card.assigned_date), "dd MMM yyyy", { locale: id })}
                    </p>
                  </div>
                </div>
              )}
              {card.status === "returned" && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Dikembalikan {card.returned_date && format(new Date(card.returned_date), "dd MMM yyyy", { locale: id })}
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
                {card.status === "returned" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAssigningCard(card); setIsAssignModalOpen(true); }}
                    className="flex-1 py-2 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20 transition-colors border border-brand-500/20"
                  >
                    Pinjamkan
                  </button>
                )}
                {card.status === "in_use" && (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                  >
                    Tandai Kembali
                  </button>
                )}
                <button
                  onClick={(e) => e.stopPropagation()}
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

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={() => setSelectedCard(null)}>
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-700 flex justify-between items-start bg-surface-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedCard.card_name}</h2>
                <p className="text-brand-400 font-mono text-sm mt-1">{selectedCard.card_number}</p>
              </div>
              <button onClick={() => setSelectedCard(null)} className="text-surface-400 hover:text-white bg-surface-800 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
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

              {selectedCard.assigned_to_name && selectedCard.status === "in_use" && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs text-amber-400 uppercase font-semibold mb-2">Sedang Digunakan Oleh</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-400">
                      {selectedCard.assigned_to_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{selectedCard.assigned_to_name}</p>
                      <p className="text-xs text-surface-400">
                        Sejak {selectedCard.assigned_date && format(new Date(selectedCard.assigned_date), "dd MMMM yyyy, HH:mm", { locale: id })}
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
                  {selectedCard.history.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 relative">
                      {/* Timeline line */}
                      {idx < selectedCard.history.length - 1 && (
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
                          <span className="font-medium">{item.user_name}</span>
                        </p>
                        {item.amount && (
                          <p className="text-sm font-bold text-purple-400 mt-0.5">+{formatCurrency(item.amount)}</p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-surface-500 italic mt-0.5">{item.notes}</p>
                        )}
                        <p className="text-[10px] text-surface-500 mt-1 font-mono">
                          {format(new Date(item.date), "dd MMM yyyy, HH:mm", { locale: id })}
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
        <AddEtollModal onClose={() => setIsAddModalOpen(false)} />
      )}

      {/* Assign Card Modal */}
      {isAssignModalOpen && assigningCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-700">
              <h2 className="text-xl font-bold text-white">Pinjamkan Kartu E-Toll</h2>
              <p className="text-sm text-surface-400 mt-1">
                {assigningCard.card_name} — <span className="font-mono text-brand-400">{assigningCard.card_number}</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Pinjamkan Ke</label>
                <select className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500">
                  <option value="">-- Pilih Pengemudi --</option>
                  {mockUsers.filter(u => u.role === "karyawan" && u.is_active).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.nik})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Catatan / Rute</label>
                <input type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" placeholder="Rute Surabaya - Jakarta" />
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
              <button onClick={() => { setIsAssignModalOpen(false); setAssigningCard(null); }} className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
                Batal
              </button>
              <button onClick={() => { setIsAssignModalOpen(false); setAssigningCard(null); }} className="px-5 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all">
                Pinjamkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Add E-Toll Modal Component ----
function AddEtollModal({ onClose }: { onClose: () => void }) {
  const [inputMode, setInputMode] = useState<"barcode" | "manual">("barcode");
  const [cardNumber, setCardNumber] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const simulateScan = () => {
    setIsScanning(true);
    setScanSuccess(false);
    // Simulate barcode scanning delay
    setTimeout(() => {
      setCardNumber("6281 5000 0099 8877");
      setIsScanning(false);
      setScanSuccess(true);
    }, 2500);
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
              onClick={() => { setInputMode("barcode"); setCardNumber(""); setScanSuccess(false); }}
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
              onClick={() => { setInputMode("manual"); setCardNumber(""); setScanSuccess(false); setIsScanning(false); }}
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
              {scanSuccess && cardNumber && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 uppercase font-semibold mb-1">Nomor E-Toll Terdeteksi</p>
                  <p className="text-xl font-mono font-bold text-white tracking-wider">{cardNumber}</p>
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
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
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
            onClick={onClose}
            disabled={!cardNumber.trim()}
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
