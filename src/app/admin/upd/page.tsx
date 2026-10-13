"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Calculator,
  Calendar,
  Clock,
  User,
  Car,
  MapPin,
  FileText,
  Cigarette,
  Moon,
  Utensils,
  Plus,
  Search,
  Download,
  Printer,
  Trash2,
  Receipt,
  Sparkles,
  Info,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  RotateCcw,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn, formatRupiah } from "@/lib/utils";
import {
  calculateUpd,
  DayCalculation,
  UpdCalculationResult,
  DEFAULT_CIGARETTE_RATE,
  MEAL_SLOT_DEFS,
  OVERNIGHT_RATES
} from "@/lib/upd-calculator";
import { INDONESIA_CITIES } from "@/lib/indonesia-cities";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UpdCalculatorPage() {
  const router = useRouter();

  // Data fetching
  const { data: usersData } = useSWR("/api/users", fetcher);
  const { data: vehiclesData } = useSWR("/api/vehicles", fetcher);
  const { data: destinationsData } = useSWR("/api/destinations", fetcher);
  const { data: savedUpdData, mutate: mutateSavedUpd, isLoading: isHistoryLoading } = useSWR("/api/upd", fetcher);

  const users = Array.isArray(usersData) ? usersData : [];
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData.filter((v: any) => v.is_active) : [];
  const savedUpdList = Array.isArray(savedUpdData) ? savedUpdData : [];

  const masterCities: string[] = useMemo(() => {
    const list = Array.isArray(destinationsData)
      ? destinationsData.filter((d: any) => d.is_active).map((d: any) => d.city as string)
      : [];
    return list.length > 0 ? list : INDONESIA_CITIES;
  }, [destinationsData]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"calculator" | "history">("calculator");

  // Reference Table Modal
  const [showTariffReference, setShowTariffReference] = useState(false);

  // Form Inputs
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverNik, setDriverNik] = useState("");
  const [nopol, setNopol] = useState("");
  const [destination, setDestination] = useState("");
  const [noSpd, setNoSpd] = useState("");
  const [notes, setNotes] = useState("");

  // Default datetime: Berangkat hari ini jam 06:00, Pulang hari ini jam 20:00
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [departureDateTime, setDepartureDateTime] = useState(`${todayStr}T06:00`);
  const [returnDateTime, setReturnDateTime] = useState(`${todayStr}T20:00`);
  const [cigaretteRate, setCigaretteRate] = useState<number>(DEFAULT_CIGARETTE_RATE);

  // Search helpers for dropdowns
  const [driverSearch, setDriverSearch] = useState("");
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  const [citySearch, setCitySearch] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // Custom/Modified Days Configuration State for the active calculation
  const [customDaysConfig, setCustomDaysConfig] = useState<DayCalculation[]>([]);

  // Riwayat Filters
  const [historySearch, setHistorySearch] = useState("");

  // Print Slip Modal State
  const [printData, setPrintData] = useState<{
    calc: UpdCalculationResult;
    driverName: string;
    driverNik?: string;
    nopol?: string;
    destination?: string;
    noSpd?: string;
    notes?: string;
    dateRecorded?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Recalculate whenever departure or return changes
  useEffect(() => {
    if (!departureDateTime || !returnDateTime) return;
    const res = calculateUpd(departureDateTime, returnDateTime, cigaretteRate);
    setCustomDaysConfig(res.days);
  }, [departureDateTime, returnDateTime, cigaretteRate]);

  // Derived calculation based on current customized days state
  const calculationResult: UpdCalculationResult = useMemo(() => {
    return calculateUpd(departureDateTime, returnDateTime, cigaretteRate, customDaysConfig);
  }, [departureDateTime, returnDateTime, cigaretteRate, customDaysConfig]);

  // Handler toggle holiday on a specific day
  const handleToggleHoliday = (dateStr: string) => {
    setCustomDaysConfig((prev) =>
      prev.map((day) => {
        if (day.dateStr === dateStr) {
          const nextHoliday = !day.isHoliday;
          return {
            ...day,
            isHoliday: nextHoliday,
            // Recalculate rate for meals and overnight
            meals: day.meals.map((m) => {
              const def = MEAL_SLOT_DEFS.find((d) => d.key === m.key);
              return {
                ...m,
                rate: nextHoliday ? (def?.holidayRate || m.rate) : (def?.workdayRate || m.rate),
              };
            }),
            overnight: {
              ...day.overnight,
              rate: nextHoliday ? OVERNIGHT_RATES.holiday : OVERNIGHT_RATES.workday,
            },
          };
        }
        return day;
      })
    );
  };

  // Handler toggle meal slot on a specific day
  const handleToggleMeal = (dateStr: string, mealKey: string) => {
    setCustomDaysConfig((prev) =>
      prev.map((day) => {
        if (day.dateStr === dateStr) {
          return {
            ...day,
            meals: day.meals.map((m) =>
              m.key === mealKey ? { ...m, active: !m.active } : m
            ),
          };
        }
        return day;
      })
    );
  };

  // Handler toggle overnight (bermalam)
  const handleToggleOvernight = (dateStr: string) => {
    setCustomDaysConfig((prev) =>
      prev.map((day) => {
        if (day.dateStr === dateStr) {
          return {
            ...day,
            overnight: {
              ...day.overnight,
              active: !day.overnight.active,
            },
          };
        }
        return day;
      })
    );
  };

  // Handler toggle cigarette (uang rokok)
  const handleToggleCigarette = (dateStr: string) => {
    setCustomDaysConfig((prev) =>
      prev.map((day) => {
        if (day.dateStr === dateStr) {
          return {
            ...day,
            cigarette: {
              ...day.cigarette,
              active: !day.cigarette.active,
            },
          };
        }
        return day;
      })
    );
  };

  // Quick Presets
  const setPreset = (type: "today_half" | "today_full" | "twodays" | "threedays") => {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const tomorrow = format(new Date(now.getTime() + 24 * 60 * 60 * 1000), "yyyy-MM-dd");
    const dayAfter = format(new Date(now.getTime() + 48 * 60 * 60 * 1000), "yyyy-MM-dd");

    if (type === "today_half") {
      setDepartureDateTime(`${today}T07:00`);
      setReturnDateTime(`${today}T15:00`);
    } else if (type === "today_full") {
      setDepartureDateTime(`${today}T06:00`);
      setReturnDateTime(`${today}T21:30`);
    } else if (type === "twodays") {
      setDepartureDateTime(`${today}T07:00`);
      setReturnDateTime(`${tomorrow}T17:00`);
    } else if (type === "threedays") {
      setDepartureDateTime(`${today}T06:00`);
      setReturnDateTime(`${dayAfter}T20:00`);
    }
  };

  // Handle Save to Database
  const handleSaveCalculation = async () => {
    if (!driverName) {
      toast.error("Pilih atau isi nama pengemudi terlebih dahulu");
      return;
    }
    if (calculationResult.totalDays === 0) {
      toast.error("Waktu kepulangan harus setelah waktu keberangkatan");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        driver_id: selectedDriverId || null,
        driver_name: driverName,
        driver_nik: driverNik,
        nopol: nopol || null,
        destination: destination || null,
        no_spd: noSpd || null,
        departure_time: calculationResult.departureTime,
        return_time: calculationResult.returnTime,
        total_days: calculationResult.totalDays,
        meal_allowance: calculationResult.totalMealAllowance,
        overnight_allowance: calculationResult.totalOvernightAllowance,
        cigarette_allowance: calculationResult.totalCigaretteAllowance,
        total_amount: calculationResult.grandTotal,
        daily_breakdown: calculationResult.days,
        notes: notes || null,
      };

      const res = await fetch("/api/upd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan data UPD");
      }

      toast.success("Perhitungan UPD berhasil disimpan ke riwayat!");
      mutateSavedUpd();
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete saved UPD
  const handleDeleteSaved = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data perhitungan UPD ini?")) return;
    try {
      const res = await fetch(`/api/upd/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Data UPD berhasil dihapus");
      mutateSavedUpd();
    } catch (e: any) {
      toast.error("Gagal menghapus data");
    }
  };

  // Convert to Driver Bon
  const handleConvertToBon = () => {
    if (!driverName) {
      toast.error("Pilih pengemudi terlebih dahulu");
      return;
    }
    const params = new URLSearchParams({
      driver_name: driverName,
      driver_nik: driverNik || "",
      driver_id: selectedDriverId || "",
      nopol: nopol || "",
      destination: destination || "",
      no_spd: noSpd || "",
      departure_date: departureDateTime.split("T")[0] || "",
      amount: calculationResult.grandTotal.toString(),
      keterangan: calculationResult.totalDays > 1 ? "Inap" : "Pergi Pulang",
    });
    router.push(`/admin/bon-pengemudi?${params.toString()}`);
  };

  // Export current calculation to Excel
  const handleExportExcel = () => {
    try {
      const sheetData: any[] = [];

      sheetData.push(["RINCIAN PERHITUNGAN UANG PERJALANAN DINAS (UPD)"]);
      sheetData.push(["PT TRANS KP"]);
      sheetData.push([]);
      sheetData.push(["Pengemudi", driverName || "-"]);
      sheetData.push(["NIK", driverNik || "-"]);
      sheetData.push(["No. Polisi", nopol || "-"]);
      sheetData.push(["Tujuan", destination || "-"]);
      sheetData.push(["No. SPD", noSpd || "-"]);
      sheetData.push([
        "Waktu Berangkat",
        departureDateTime ? format(new Date(departureDateTime), "dd/MM/yyyy HH:mm") : "-",
      ]);
      sheetData.push([
        "Waktu Pulang",
        returnDateTime ? format(new Date(returnDateTime), "dd/MM/yyyy HH:mm") : "-",
      ]);
      sheetData.push(["Total Hari", `${calculationResult.totalDays} Hari`]);
      sheetData.push([]);

      // Headers table
      sheetData.push([
        "Tanggal",
        "Hari",
        "Status Hari",
        "Ekstra (03:00)",
        "Pagi (08:00)",
        "Siang (12:00)",
        "Malam (19:00)",
        "Ekstra (21:00)",
        "Bermalam",
        "Uang Rokok",
        "Subtotal Harian",
      ]);

      calculationResult.days.forEach((day) => {
        const getMealVal = (key: string) => {
          const m = day.meals.find((x) => x.key === key);
          return m && m.active ? m.rate : 0;
        };

        sheetData.push([
          day.dateStr,
          day.dayName,
          day.isHoliday ? "Hari Libur" : "Hari Kerja",
          getMealVal("ekstra_03"),
          getMealVal("pagi_08"),
          getMealVal("siang_12"),
          getMealVal("malam_19"),
          getMealVal("ekstra_21"),
          day.overnight.active ? day.overnight.rate : 0,
          day.cigarette.active ? day.cigarette.rate : 0,
          day.subtotal,
        ]);
      });

      sheetData.push([]);
      sheetData.push(["", "", "", "", "", "", "", "", "Total Uang Makan", calculationResult.totalMealAllowance]);
      sheetData.push(["", "", "", "", "", "", "", "", "Total Bermalam", calculationResult.totalOvernightAllowance]);
      sheetData.push(["", "", "", "", "", "", "", "", "Total Uang Rokok", calculationResult.totalCigaretteAllowance]);
      sheetData.push(["", "", "", "", "", "", "", "", "GRAND TOTAL UPD", calculationResult.grandTotal]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Perhitungan UPD");

      const fileName = `UPD_${driverName.replace(/\s+/g, "_") || "Driver"}_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Excel perhitungan UPD berhasil diunduh!");
    } catch (e) {
      toast.error("Gagal mengekspor file Excel");
    }
  };

  // Filtered drivers for search
  const filteredDrivers = useMemo(() => {
    if (!driverSearch) return users;
    return users.filter(
      (u: any) =>
        u.full_name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        u.nik.toLowerCase().includes(driverSearch.toLowerCase())
    );
  }, [users, driverSearch]);

  // Filtered cities for search
  const filteredCities = useMemo(() => {
    if (!citySearch) return masterCities;
    return masterCities.filter((c) =>
      c.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [masterCities, citySearch]);

  // Filtered saved UPD history
  const filteredSavedUpd = useMemo(() => {
    if (!historySearch) return savedUpdList;
    return savedUpdList.filter(
      (item: any) =>
        item.driver_name?.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.driver_nik?.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.nopol?.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.destination?.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.no_spd?.toLowerCase().includes(historySearch.toLowerCase())
    );
  }, [savedUpdList, historySearch]);

  return (
    <div className="space-y-6 slide-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 inline-flex">
                <Calculator className="w-6 h-6" />
              </span>
              Hitung UPD Pengemudi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Uang Perjalanan Dinas
            </span>
          </div>
          <p className="text-sm text-surface-400 mt-1">
            Hitung otomatis uang makan, uang bermalam, dan jatah rokok (Rp 4.050/hari) berdasarkan jam dinas & hari kerja/libur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTariffReference(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-surface-700 font-medium text-surface-300 hover:bg-surface-800 hover:text-white transition-all text-xs sm:text-sm"
          >
            <Info className="w-4 h-4 text-brand-400" />
            Tabel Aturan Tarif
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "calculator" ? "history" : "calculator")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700 font-medium text-surface-200 hover:bg-surface-750 transition-all text-xs sm:text-sm shadow-sm"
          >
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            {activeTab === "calculator" ? `Riwayat Simpan (${savedUpdList.length})` : "Kembali ke Kalkulator"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-800 gap-2">
        <button
          onClick={() => setActiveTab("calculator")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer",
            activeTab === "calculator"
              ? "border-brand-500 text-brand-400 bg-brand-500/5"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          <Calculator className="w-4 h-4" />
          Kalkulator & Rincian Dinas
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer",
            activeTab === "history"
              ? "border-brand-500 text-brand-400 bg-brand-500/5"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          <FileText className="w-4 h-4" />
          Riwayat Perhitungan Tersimpan
          {savedUpdList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-500/20 text-brand-300">
              {savedUpdList.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "calculator" ? (
        <div className="space-y-6">
          {/* Main Input Form Glass-card */}
          <div className="glass-card p-5 sm:p-6 border border-surface-800 space-y-6">
            <div className="flex items-center justify-between border-b border-surface-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <h2 className="text-base font-semibold text-white">Parameter Perjalanan Dinas</h2>
              </div>

              {/* Quick Presets */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs">
                <span className="text-surface-400 mr-1">Preset Cepat:</span>
                <button
                  type="button"
                  onClick={() => setPreset("today_half")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors"
                >
                  1 Hari (Pagi-Sore)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset("today_full")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors"
                >
                  1 Hari Penuh (PP)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset("twodays")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors"
                >
                  2 Hari (Menginap)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset("threedays")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors"
                >
                  3 Hari
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Pengemudi Dropdown */}
              <div className="relative">
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                  Pengemudi <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Pilih atau cari pengemudi..."
                    value={driverName}
                    onChange={(e) => {
                      setDriverName(e.target.value);
                      setDriverSearch(e.target.value);
                      setIsDriverDropdownOpen(true);
                    }}
                    onFocus={() => setIsDriverDropdownOpen(true)}
                    className="w-full pl-9 pr-8 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm transition-colors"
                  />
                  {driverName && (
                    <button
                      type="button"
                      onClick={() => {
                        setDriverName("");
                        setDriverNik("");
                        setSelectedDriverId("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isDriverDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsDriverDropdownOpen(false)}
                    />
                    <div className="absolute z-40 w-full mt-1.5 bg-surface-850 border border-surface-700 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
                      {filteredDrivers.length > 0 ? (
                        filteredDrivers.map((d: any) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setSelectedDriverId(d.id);
                              setDriverName(d.full_name);
                              setDriverNik(d.nik);
                              setIsDriverDropdownOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-sm text-surface-200 hover:bg-surface-750 hover:text-white flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="font-medium">{d.full_name}</p>
                              <p className="text-[11px] text-surface-400">NIK: {d.nik}</p>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-brand-400 px-2 py-0.5 rounded bg-brand-500/10">
                              {d.jabatan || d.role}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-surface-400 text-center">
                          Pengemudi tidak ditemukan. Ketik nama manual.
                        </div>
                      )}
                    </div>
                  </>
                )}
                {driverNik && (
                  <p className="text-[11px] text-surface-400 mt-1">NIK: {driverNik}</p>
                )}
              </div>

              {/* Nopol Kendaraan */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                  Nomor Polisi (Kendaraan)
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Contoh: B 1234 ABC"
                    value={nopol}
                    onChange={(e) => setNopol(e.target.value.toUpperCase())}
                    list="vehicle-list"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm font-mono uppercase transition-colors"
                  />
                  <datalist id="vehicle-list">
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.nopol}>
                        {v.nopol} - {v.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Destinasi / Kota */}
              <div className="relative">
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                  Kota Tujuan / Destinasi
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Pilih atau ketik kota..."
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setCitySearch(e.target.value);
                      setIsCityDropdownOpen(true);
                    }}
                    onFocus={() => setIsCityDropdownOpen(true)}
                    className="w-full pl-9 pr-8 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm transition-colors"
                  />
                  {destination && (
                    <button
                      type="button"
                      onClick={() => setDestination("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isCityDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsCityDropdownOpen(false)}
                    />
                    <div className="absolute z-40 w-full mt-1.5 bg-surface-850 border border-surface-700 rounded-xl shadow-xl max-h-52 overflow-y-auto py-1">
                      {filteredCities.slice(0, 30).map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setDestination(city);
                            setIsCityDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-sm text-surface-200 hover:bg-surface-750 hover:text-white flex items-center justify-between"
                        >
                          <span>{city}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Tanggal & Jam Berangkat */}
              <div>
                <label className="block text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Waktu Berangkat <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-surface-400 font-normal">Tgl & Jam</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                  <input
                    type="datetime-local"
                    value={departureDateTime}
                    onChange={(e) => setDepartureDateTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-brand-500/40 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Tanggal & Jam Pulang */}
              <div>
                <label className="block text-xs font-semibold text-brand-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Waktu Kepulangan <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-surface-400 font-normal">Tgl & Jam</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="datetime-local"
                    value={returnDateTime}
                    onChange={(e) => setReturnDateTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-emerald-500/40 text-white rounded-xl focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Jatah Uang Rokok */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Jatah Uang Rokok / Hari</span>
                  <span className="text-[10px] text-amber-400 font-medium">Sesuai Ketentuan</span>
                </label>
                <div className="relative">
                  <Cigarette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                  <input
                    type="number"
                    value={cigaretteRate}
                    onChange={(e) => setCigaretteRate(Number(e.target.value) || 0)}
                    placeholder="4050"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm font-semibold transition-colors"
                  />
                </div>
                <p className="text-[11px] text-surface-400 mt-1">
                  Default: {formatRupiah(DEFAULT_CIGARETTE_RATE)} per hari aktif dinas.
                </p>
              </div>

              {/* No SPD & Notes */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                  Nomor SPD / Surat Tugas
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Contoh: SPD/2024/X/001"
                    value={noSpd}
                    onChange={(e) => setNoSpd(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                  Catatan / Keterangan Dinas
                </label>
                <input
                  type="text"
                  placeholder="Misal: Perjalanan dinas luar kota antar pimpinan / standby hotel"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Breakdown Cards & Live Calculation */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-400" />
                  Rincian Jam Makan & Uang Saku Harian
                </h2>
                <p className="text-xs text-surface-400">
                  Total {calculationResult.totalDays} hari perjalanan. Anda dapat mengubah status Hari Kerja/Libur atau mencentang manual slot makan di bawah.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-surface-400">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500/50" /> Hari Kerja
                </span>
                <span className="flex items-center gap-1.5 text-surface-400">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500/20 border border-purple-500/50" /> Hari Libur
                </span>
              </div>
            </div>

            {calculationResult.days.length === 0 ? (
              <div className="glass-card p-10 text-center border border-dashed border-surface-800">
                <AlertCircle className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-surface-300 font-medium">Rentang waktu belum valid</p>
                <p className="text-xs text-surface-500 mt-1">
                  Pastikan waktu kepulangan berada setelah waktu keberangkatan.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {calculationResult.days.map((day, idx) => (
                  <div
                    key={day.dateStr}
                    className={cn(
                      "glass-card overflow-hidden border transition-all",
                      day.isHoliday ? "border-purple-500/30" : "border-surface-800"
                    )}
                  >
                    {/* Day Card Header */}
                    <div className={cn(
                      "p-4 flex flex-wrap items-center justify-between gap-3 border-b",
                      day.isHoliday
                        ? "bg-purple-950/20 border-purple-900/30"
                        : "bg-surface-900/40 border-surface-800"
                    )}>
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-surface-800 text-brand-400 font-bold text-xs flex items-center justify-center border border-surface-700">
                          H{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-white text-sm sm:text-base">
                            {day.formattedDate}
                          </p>
                          <p className="text-[11px] text-surface-400">
                            {idx === 0 && idx === calculationResult.days.length - 1
                              ? `Dinas: ${format(new Date(departureDateTime), "HH:mm")} s/d ${format(new Date(returnDateTime), "HH:mm")}`
                              : idx === 0
                              ? `Mulai berangkat: ${format(new Date(departureDateTime), "HH:mm")} WIB`
                              : idx === calculationResult.days.length - 1
                              ? `Pulang tiba: ${format(new Date(returnDateTime), "HH:mm")} WIB`
                              : "Dinas penuh 24 jam"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Toggle Hari Kerja vs Libur */}
                        <button
                          type="button"
                          onClick={() => handleToggleHoliday(day.dateStr)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                            day.isHoliday
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30"
                              : "bg-surface-800 text-surface-300 border border-surface-700 hover:bg-surface-750 hover:text-white"
                          )}
                          title="Klik untuk mengubah tarif Hari Kerja / Hari Libur"
                        >
                          {day.isHoliday ? "🏖️ Hari Libur" : "🏢 Hari Kerja"}
                          <span className="text-[10px] text-surface-400 underline">(ganti)</span>
                        </button>

                        {/* Subtotal Hari */}
                        <div className="text-right pl-3 border-l border-surface-800">
                          <p className="text-[10px] text-surface-400 uppercase font-semibold">Subtotal Hari</p>
                          <p className="text-base font-bold text-emerald-400">
                            {formatRupiah(day.subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Day Slots Grid */}
                    <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                      {/* 5 Slot Jam Makan */}
                      {day.meals.map((meal) => (
                        <div
                          key={meal.key}
                          onClick={() => handleToggleMeal(day.dateStr, meal.key)}
                          className={cn(
                            "p-3 rounded-xl border text-center transition-all cursor-pointer select-none",
                            meal.active
                              ? "bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-sm"
                              : "bg-surface-900/30 border-surface-800/80 text-surface-500 opacity-60 hover:opacity-90"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-300">
                              {meal.timeStr}
                            </span>
                            <input
                              type="checkbox"
                              checked={meal.active}
                              onChange={() => {}}
                              className="rounded border-surface-700 text-brand-500 focus:ring-0 cursor-pointer"
                            />
                          </div>
                          <p className="font-semibold text-xs text-white truncate">{meal.label}</p>
                          <p className={cn("text-xs font-bold mt-1", meal.active ? "text-brand-400" : "text-surface-500 line-through")}>
                            {formatRupiah(meal.rate)}
                          </p>
                        </div>
                      ))}

                      {/* Bermalam (B) */}
                      <div
                        onClick={() => handleToggleOvernight(day.dateStr)}
                        className={cn(
                          "p-3 rounded-xl border text-center transition-all cursor-pointer select-none",
                          day.overnight.active
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm"
                            : "bg-surface-900/30 border-surface-800/80 text-surface-500 opacity-60 hover:opacity-90"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 flex items-center gap-1">
                            <Moon className="w-2.5 h-2.5" /> Inap
                          </span>
                          <input
                            type="checkbox"
                            checked={day.overnight.active}
                            onChange={() => {}}
                            className="rounded border-surface-700 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                        </div>
                        <p className="font-semibold text-xs text-white">Bermalam (B)</p>
                        <p className={cn("text-xs font-bold mt-1", day.overnight.active ? "text-amber-400" : "text-surface-500 line-through")}>
                          {formatRupiah(day.overnight.rate)}
                        </p>
                      </div>

                      {/* Uang Rokok */}
                      <div
                        onClick={() => handleToggleCigarette(day.dateStr)}
                        className={cn(
                          "p-3 rounded-xl border text-center transition-all cursor-pointer select-none",
                          day.cigarette.active
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm"
                            : "bg-surface-900/30 border-surface-800/80 text-surface-500 opacity-60 hover:opacity-90"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                            <Cigarette className="w-2.5 h-2.5" /> Rokok
                          </span>
                          <input
                            type="checkbox"
                            checked={day.cigarette.active}
                            onChange={() => {}}
                            className="rounded border-surface-700 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                        </div>
                        <p className="font-semibold text-xs text-white">Uang Rokok</p>
                        <p className={cn("text-xs font-bold mt-1", day.cigarette.active ? "text-emerald-400" : "text-surface-500 line-through")}>
                          {formatRupiah(day.cigarette.rate)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky / Grand Total Summary Card */}
          <div className="glass-card p-6 border border-brand-500/30 bg-gradient-to-r from-surface-900 via-surface-900 to-brand-950/20 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-surface-400 uppercase font-semibold">Total Hari</p>
                  <p className="text-xl font-bold text-white mt-0.5">{calculationResult.totalDays} Hari</p>
                </div>
                <div>
                  <p className="text-xs text-surface-400 uppercase font-semibold">Total Uang Makan</p>
                  <p className="text-xl font-bold text-brand-400 mt-0.5">
                    {formatRupiah(calculationResult.totalMealAllowance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-400 uppercase font-semibold">Total Bermalam</p>
                  <p className="text-xl font-bold text-amber-400 mt-0.5">
                    {formatRupiah(calculationResult.totalOvernightAllowance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-400 uppercase font-semibold">Total Uang Rokok</p>
                  <p className="text-xl font-bold text-emerald-400 mt-0.5">
                    {formatRupiah(calculationResult.totalCigaretteAllowance)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:pl-6 lg:border-l border-surface-800">
                <div>
                  <p className="text-xs text-surface-400 uppercase font-semibold">TOTAL UPD DITERIMA</p>
                  <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-brand-400">
                    {formatRupiah(calculationResult.grandTotal)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCalculation}
                    disabled={isSaving || calculationResult.totalDays === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all text-sm disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {isSaving ? "Menyimpan..." : "Simpan UPD"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPrintData({
                        calc: calculationResult,
                        driverName: driverName || "Driver",
                        driverNik,
                        nopol,
                        destination,
                        noSpd,
                        notes,
                        dateRecorded: new Date().toISOString(),
                      })
                    }
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 hover:text-white hover:bg-surface-700 transition-all text-sm"
                    title="Cetak Slip Kwitansi UPD"
                  >
                    <Printer className="w-4 h-4 text-brand-400" />
                    Cetak Slip
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm"
                    title="Download Excel"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>

                  <button
                    type="button"
                    onClick={handleConvertToBon}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all text-sm font-medium"
                    title="Buat Bon Pengemudi dengan nominal UPD ini"
                  >
                    <Receipt className="w-4 h-4 text-amber-400" />
                    Buat Bon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab: Riwayat Perhitungan UPD */
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="text"
                  placeholder="Cari nama supir, NIK, nopol, tujuan, no SPD..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>
              <p className="text-xs text-surface-400 whitespace-nowrap">
                Total Tersimpan: <span className="font-bold text-white">{filteredSavedUpd.length}</span> data
              </p>
            </div>
          </div>

          {filteredSavedUpd.length === 0 ? (
            <div className="glass-card p-12 text-center border border-dashed border-surface-800">
              <CalendarDays className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-300 font-medium text-base">Belum ada riwayat hitung UPD tersimpan</p>
              <p className="text-xs text-surface-500 mt-1">
                Gunakan tab Kalkulator untuk menghitung dan menyimpan data perjalanan dinas pengemudi.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("calculator")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-xs font-semibold text-white"
              >
                <Calculator className="w-4 h-4" /> Buka Kalkulator
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSavedUpd.map((item: any) => {
                let parsedDays: DayCalculation[] = [];
                try {
                  parsedDays = typeof item.daily_breakdown === "string" ? JSON.parse(item.daily_breakdown) : item.daily_breakdown;
                } catch (e) {}

                return (
                  <div
                    key={item.id}
                    className="glass-card p-5 border border-surface-800 hover:border-brand-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-white text-base">{item.driver_name}</p>
                          <p className="text-xs text-surface-400">NIK: {item.driver_nik || "-"}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs">
                          {formatRupiah(item.total_amount)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-surface-900/60 p-3 rounded-xl border border-surface-800">
                        <div>
                          <span className="text-[10px] text-surface-500 uppercase font-semibold block">Kendaraan</span>
                          <span className="text-surface-200 font-mono font-medium">{item.nopol || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-surface-500 uppercase font-semibold block">Tujuan</span>
                          <span className="text-surface-200 font-medium truncate block">{item.destination || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-surface-500 uppercase font-semibold block">Berangkat</span>
                          <span className="text-surface-300">
                            {format(new Date(item.departure_time), "dd/MM/yy HH:mm")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-surface-500 uppercase font-semibold block">Pulang</span>
                          <span className="text-surface-300">
                            {format(new Date(item.return_time), "dd/MM/yy HH:mm")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-surface-400 pt-1">
                        <span>Durasi: <strong className="text-white">{item.total_days} Hari</strong></span>
                        {item.no_spd && <span className="truncate">SPD: {item.no_spd}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-surface-800">
                      <span className="text-[10px] text-surface-500">
                        {format(new Date(item.created_at), "dd MMM yyyy", { locale: localeId })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPrintData({
                              calc: {
                                departureTime: item.departure_time,
                                returnTime: item.return_time,
                                totalDays: item.total_days,
                                totalMealAllowance: item.meal_allowance,
                                totalOvernightAllowance: item.overnight_allowance,
                                totalCigaretteAllowance: item.cigarette_allowance,
                                grandTotal: item.total_amount,
                                days: parsedDays || [],
                              },
                              driverName: item.driver_name,
                              driverNik: item.driver_nik,
                              nopol: item.nopol,
                              destination: item.destination,
                              noSpd: item.no_spd,
                              notes: item.notes,
                              dateRecorded: item.created_at,
                            });
                          }}
                          className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-brand-400 transition-colors"
                          title="Cetak Slip Kwitansi"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({
                              driver_name: item.driver_name,
                              driver_nik: item.driver_nik || "",
                              driver_id: item.driver_id || "",
                              nopol: item.nopol || "",
                              destination: item.destination || "",
                              no_spd: item.no_spd || "",
                              departure_date: item.departure_time.split("T")[0] || "",
                              amount: item.total_amount.toString(),
                              keterangan: item.total_days > 1 ? "Inap" : "Pergi Pulang",
                            });
                            router.push(`/admin/bon-pengemudi?${params.toString()}`);
                          }}
                          className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors"
                          title="Buat Bon Pengemudi"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSaved(item.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Tabel Aturan Tarif (Sesuai Foto Referensi Asli) */}
      {showTariffReference && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full border border-surface-700 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-brand-400" />
                  Tabel Ketentuan UPD & Uang Makan
                </h3>
                <p className="text-xs text-surface-400">
                  Standar ketentuan resmi uang saku / makan pengemudi PT Trans KP
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTariffReference(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabel 1: Hari Kerja */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-400" />
                  1. Hari Kerja
                </h4>
                <span className="text-[11px] text-surface-400">Senin - Jumat</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-surface-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-850 text-surface-300 font-semibold uppercase border-b border-surface-800">
                    <tr>
                      <th className="px-4 py-2.5">Waktu Makan</th>
                      <th className="px-4 py-2.5">Jam Makan</th>
                      <th className="px-4 py-2.5 text-right">Uang Saku / Makan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60 text-surface-200">
                    <tr>
                      <td className="px-4 py-2 font-medium">Ekstra (E)</td>
                      <td className="px-4 py-2 font-mono">03.00</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">Rp 20.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Pagi (P)</td>
                      <td className="px-4 py-2 font-mono">08.00</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">Rp 25.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Siang (S)</td>
                      <td className="px-4 py-2 font-mono">12.00</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">Rp 25.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Malam (M)</td>
                      <td className="px-4 py-2 font-mono">19.00</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">Rp 25.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Ekstra (E)</td>
                      <td className="px-4 py-2 font-mono">21.00</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">Rp 20.000</td>
                    </tr>
                    <tr className="bg-surface-900/40">
                      <td className="px-4 py-2 font-semibold text-amber-300">Bermalam (B)</td>
                      <td className="px-4 py-2 text-surface-400">Menginap</td>
                      <td className="px-4 py-2 text-right font-bold text-amber-400">Rp 25.000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabel 2: Hari Libur */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  2. Hari Libur
                </h4>
                <span className="text-[11px] text-surface-400">Sabtu, Minggu & Tanggal Merah</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-surface-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-850 text-surface-300 font-semibold uppercase border-b border-surface-800">
                    <tr>
                      <th className="px-4 py-2.5">Waktu Makan</th>
                      <th className="px-4 py-2.5">Jam Makan</th>
                      <th className="px-4 py-2.5 text-right">Uang Saku / Makan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60 text-surface-200">
                    <tr>
                      <td className="px-4 py-2 font-medium">Ekstra (E)</td>
                      <td className="px-4 py-2 font-mono">03.00</td>
                      <td className="px-4 py-2 text-right font-bold text-purple-300">Rp 40.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Pagi (P)</td>
                      <td className="px-4 py-2 font-mono">08.00</td>
                      <td className="px-4 py-2 text-right font-bold text-purple-300">Rp 50.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Siang (S)</td>
                      <td className="px-4 py-2 font-mono">12.00</td>
                      <td className="px-4 py-2 text-right font-bold text-purple-300">Rp 50.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Malam (M)</td>
                      <td className="px-4 py-2 font-mono">19.00</td>
                      <td className="px-4 py-2 text-right font-bold text-purple-300">Rp 50.000</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Ekstra (E)</td>
                      <td className="px-4 py-2 font-mono">21.00</td>
                      <td className="px-4 py-2 text-right font-bold text-purple-300">Rp 40.000</td>
                    </tr>
                    <tr className="bg-surface-900/40">
                      <td className="px-4 py-2 font-semibold text-amber-300">Bermalam (B)</td>
                      <td className="px-4 py-2 text-surface-400">Menginap</td>
                      <td className="px-4 py-2 text-right font-bold text-amber-400">Rp 50.000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Jatah Uang Rokok */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Cigarette className="w-4 h-4" />
                <span className="font-semibold">Jatah Uang Rokok:</span>
              </div>
              <span className="font-bold text-amber-400 text-sm">Rp 4.050 / hari</span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowTariffReference(false)}
                className="px-4 py-2 rounded-xl gradient-brand text-xs font-semibold text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Printable Slip Kwitansi UPD */}
      {printData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-auto print:shadow-none print:w-full print:max-w-none print:p-6 print:rounded-none">
            {/* Print Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-wider text-blue-900">PT TRANS KP</h2>
                <p className="text-xs text-slate-600 font-medium">
                  Sistem Operasional & Manajemen Armada Pengemudi
                </p>
                <p className="text-[11px] text-slate-500">
                  SLIP RINCIAN UANG PERJALANAN DINAS (UPD)
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500">Tanggal Cetak:</p>
                <p className="text-sm font-bold text-slate-900">
                  {format(new Date(), "dd MMMM yyyy", { locale: localeId })}
                </p>
                {printData.noSpd && (
                  <p className="text-xs font-mono font-bold text-blue-800 mt-1">
                    No. SPD: {printData.noSpd}
                  </p>
                )}
              </div>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-500 uppercase font-bold text-[10px]">Nama Pengemudi</p>
                <p className="text-sm font-bold text-slate-900">{printData.driverName}</p>
                {printData.driverNik && (
                  <p className="text-slate-600">NIK: {printData.driverNik}</p>
                )}
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold text-[10px]">Kendaraan / Nopol</p>
                <p className="text-sm font-bold font-mono text-slate-900">{printData.nopol || "-"}</p>
                <p className="text-slate-600">Tujuan: {printData.destination || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold text-[10px]">Jadwal Berangkat</p>
                <p className="font-semibold text-slate-800">
                  {printData.calc.departureTime ? format(new Date(printData.calc.departureTime), "EEEE, dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold text-[10px]">Jadwal Kepulangan</p>
                <p className="font-semibold text-slate-800">
                  {printData.calc.returnTime ? format(new Date(printData.calc.returnTime), "EEEE, dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                </p>
              </div>
            </div>

            {/* Detail Tabel Hari & Slot Makan */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-200 text-slate-800 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Slot Jam Makan</th>
                    <th className="p-2.5 text-right">Bermalam</th>
                    <th className="p-2.5 text-right">Uang Rokok</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {printData.calc.days.map((day) => (
                    <tr key={day.dateStr} className="align-top">
                      <td className="p-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {day.formattedDate}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          day.isHoliday ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        )}>
                          {day.isHoliday ? "Libur" : "Kerja"}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="space-y-1">
                          {day.meals.filter((m) => m.active).map((m) => (
                            <div key={m.key} className="flex justify-between gap-3 text-[11px]">
                              <span>{m.label} ({m.timeStr})</span>
                              <span className="font-medium text-slate-900">{formatRupiah(m.rate)}</span>
                            </div>
                          ))}
                          {day.meals.filter((m) => m.active).length === 0 && (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {day.overnight.active ? formatRupiah(day.overnight.rate) : "-"}
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {day.cigarette.active ? formatRupiah(day.cigarette.rate) : "-"}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(day.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="p-2.5">Total {printData.calc.totalDays} Hari</td>
                    <td className="p-2.5 text-xs text-slate-600">
                      Makan: {formatRupiah(printData.calc.totalMealAllowance)}
                    </td>
                    <td className="p-2.5 text-right text-xs text-slate-600">
                      {formatRupiah(printData.calc.totalOvernightAllowance)}
                    </td>
                    <td className="p-2.5 text-right text-xs text-slate-600">
                      {formatRupiah(printData.calc.totalCigaretteAllowance)}
                    </td>
                    <td className="p-2.5 text-right text-sm text-blue-900">
                      {formatRupiah(printData.calc.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total Highlight */}
            <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div>
                <p className="text-xs font-bold uppercase text-blue-900">Total Uang Perjalanan Dinas (UPD)</p>
                <p className="text-[11px] text-blue-700">Sudah termasuk uang saku makan, bermalam, dan uang rokok.</p>
              </div>
              <p className="text-2xl font-black text-blue-900">
                {formatRupiah(printData.calc.grandTotal)}
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs text-center">
              <div className="space-y-12">
                <p className="font-semibold text-slate-700">Diserahkan Oleh (Kasir / Admin),</p>
                <div>
                  <p className="font-bold underline text-slate-900">( ........................................ )</p>
                  <p className="text-[10px] text-slate-500">Staff Operasional</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-semibold text-slate-700">Diterima Oleh (Pengemudi),</p>
                <div>
                  <p className="font-bold underline text-slate-900">
                    ( {printData.driverName || "........................................"} )
                  </p>
                  <p className="text-[10px] text-slate-500">Driver</p>
                </div>
              </div>
            </div>

            {/* Action buttons (hidden on print) */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => setPrintData(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
