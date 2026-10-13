"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  Info,
  Calculator,
  Printer,
  Receipt,
  Sparkles,
  RotateCcw,
  CalendarDays,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRp } from "@/lib/fuel-monitoring";
import { INDONESIA_CITIES } from "@/lib/indonesia-cities";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Daftar Standar Bahan Bakar & Harga Resmi
const FUEL_TYPES = [
  { name: "Pertalite (RON 90)", price: 10000, color: "text-emerald-400" },
  { name: "Pertamax (RON 92)", price: 12950, color: "text-blue-400" },
  { name: "Pertamax Turbo (RON 98)", price: 14400, color: "text-red-400" },
  { name: "Bio Solar Subsidi", price: 6800, color: "text-amber-400" },
  { name: "Dexlite (CN 51)", price: 13900, color: "text-teal-400" },
  { name: "Pertamina Dex (CN 53)", price: 14650, color: "text-purple-400" },
];

// Helper parse manual time input (06.00 / 08:00 / 1430 / 14)
const parseTimeInput = (val: string): { hour: string; minute: string; formatted: string } => {
  if (!val) return { hour: "00", minute: "00", formatted: "00.00" };
  const cleaned = val.trim().replace(":", ".");

  if (/^\d{3,4}$/.test(cleaned)) {
    const padded = cleaned.padStart(4, "0");
    const h = Math.min(23, Math.max(0, parseInt(padded.slice(0, 2), 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(padded.slice(2, 4), 10) || 0));
    const hourStr = String(h).padStart(2, "0");
    const minStr = String(m).padStart(2, "0");
    return { hour: hourStr, minute: minStr, formatted: `${hourStr}.${minStr}` };
  }

  const parts = cleaned.split(".");
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) h = 0;
  h = Math.min(23, Math.max(0, h));

  let m = 0;
  if (parts.length > 1 && parts[1] !== "") {
    m = parseInt(parts[1], 10);
    if (isNaN(m)) m = 0;
    m = Math.min(59, Math.max(0, m));
  }
  const hourStr = String(h).padStart(2, "0");
  const minStr = String(m).padStart(2, "0");
  return { hour: hourStr, minute: minStr, formatted: `${hourStr}.${minStr}` };
};

export default function FuelMonitoringPage() {
  const router = useRouter();

  // Main Tabs: "calculator" by default (mirrored from UPD)
  const [activeTab, setActiveTab] = useState<"calculator" | "trips" | "fleet" | "anomalies" | "config">("calculator");

  // Filters for Trips Tab
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

  const [showTariffReference, setShowTariffReference] = useState(false);

  // Print Fuel Slip Modal State
  const [printFuelData, setPrintFuelData] = useState<{
    driverName: string;
    driverNik?: string;
    nopol: string;
    vehicleName?: string;
    destination?: string;
    noSpd?: string;
    departureTime?: string;
    returnTime?: string;
    startKm: number;
    endKm: number;
    distance: number;
    fuelType: string;
    fuelPrice: number;
    fuelUsed: number;
    fuelCost: number;
    actualKml: number;
    standardKml: number;
    costPerKm: number;
    anomalyStatus: string;
    notes?: string;
    dateRecorded?: string;
  } | null>(null);

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
  const { data: usersData } = useSWR("/api/users", fetcher);
  const { data: destinationsData } = useSWR("/api/destinations", fetcher);
  const { data: configData, mutate: mutateConfig } = useSWR("/api/fuel-monitoring/config", fetcher);

  const trips: any[] = Array.isArray(tripsData) ? tripsData : [];
  const anomalies: any[] = Array.isArray(anomaliesData) ? anomaliesData : [];
  const vehicles: any[] = Array.isArray(vehiclesData) ? vehiclesData : [];
  const users: any[] = Array.isArray(usersData) ? usersData : [];
  const destinations: any[] = Array.isArray(destinationsData) ? destinationsData : [];

  // ==========================================
  // KALKULATOR BBM STATE (Mirip dengan Hitung UPD)
  // ==========================================
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Pengemudi
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverNik, setDriverNik] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  // Kendaraan / Nopol
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [nopol, setNopol] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("Mobil");
  const [standardKml, setStandardKml] = useState<number>(10);
  const [tankCapacity, setTankCapacity] = useState<number>(60);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  // Kota Tujuan / Rute
  const [destination, setDestination] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Waktu Berangkat & Kembali (Format 24 Jam diketik manual)
  const [departureDate, setDepartureDate] = useState(todayStr);
  const [departureTimeText, setDepartureTimeText] = useState("06.00");
  const [departureHour, setDepartureHour] = useState("06");
  const [departureMinute, setDepartureMinute] = useState("00");

  const [returnDate, setReturnDate] = useState(todayStr);
  const [returnTimeText, setReturnTimeText] = useState("18.00");
  const [returnHour, setReturnHour] = useState("18");
  const [returnMinute, setReturnMinute] = useState("00");

  const departureDateTime = useMemo(
    () => `${departureDate}T${departureHour}:${departureMinute}:00`,
    [departureDate, departureHour, departureMinute]
  );
  const returnDateTime = useMemo(
    () => `${returnDate}T${returnHour}:${returnMinute}:00`,
    [returnDate, returnHour, returnMinute]
  );

  // Pilihan BBM & Harga
  const [fuelType, setFuelType] = useState("Pertalite (RON 90)");
  const [fuelPrice, setFuelPrice] = useState<number>(10000);

  // Odometer & Jarak
  const [distanceMode, setDistanceMode] = useState<"odometer" | "manual_km">("odometer");
  const [startKm, setStartKm] = useState<number | string>(12000);
  const [endKm, setEndKm] = useState<number | string>(12250);
  const [manualDistance, setManualDistance] = useState<number | string>(250);

  // Metode Konsumsi
  const [calculationMode, setCalculationMode] = useState<"estimate" | "actual_refill" | "tank_level">("estimate");
  const [fuelUsedInput, setFuelUsedInput] = useState<number | string>("");
  const [fuelCostInput, setFuelCostInput] = useState<number | string>("");
  const [fuelRefillInput, setFuelRefillInput] = useState<number | string>(0);
  const [calculationMethod, setCalculationMethod] = useState("full_to_full");

  // No SPD & Catatan
  const [noSpd, setNoSpd] = useState("");
  const [notes, setNotes] = useState("");
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(target)) {
        setIsDriverDropdownOpen(false);
      }
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(target)) {
        setIsVehicleDropdownOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered dropdown lists
  const filteredDrivers = useMemo(() => {
    if (!driverSearch) return users;
    return users.filter(
      (u: any) =>
        u.full_name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
        u.nik?.toLowerCase().includes(driverSearch.toLowerCase())
    );
  }, [users, driverSearch]);

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return vehicles;
    return vehicles.filter(
      (v: any) =>
        v.nopol?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.name?.toLowerCase().includes(vehicleSearch.toLowerCase())
    );
  }, [vehicles, vehicleSearch]);

  const masterCities = useMemo(() => {
    const set = new Set<string>();
    destinations.forEach((d: any) => d.city && set.add(d.city));
    INDONESIA_CITIES.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [destinations]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return masterCities;
    return masterCities.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()));
  }, [masterCities, citySearch]);

  // Hitung Jarak Tempuh Efektif
  const effectiveDistance = useMemo(() => {
    if (distanceMode === "odometer") {
      const s = Number(startKm) || 0;
      const e = Number(endKm) || 0;
      return Math.max(0, e - s);
    }
    return Math.max(0, Number(manualDistance) || 0);
  }, [distanceMode, startKm, endKm, manualDistance]);

  // Hitung Konsumsi BBM Efektif (Liter)
  const effectiveFuelUsed = useMemo(() => {
    if (calculationMode === "estimate") {
      if (effectiveDistance <= 0 || standardKml <= 0) return 0;
      return Number((effectiveDistance / standardKml).toFixed(2));
    }
    if (calculationMode === "actual_refill") {
      if (fuelUsedInput) return Number(fuelUsedInput);
      if (fuelCostInput && fuelPrice > 0) return Number((Number(fuelCostInput) / fuelPrice).toFixed(2));
      return 0;
    }
    // tank_level / full_to_full
    return Number(fuelUsedInput) || 0;
  }, [calculationMode, effectiveDistance, standardKml, fuelUsedInput, fuelCostInput, fuelPrice]);

  // Hitung Total Biaya BBM Efektif (Rupiah)
  const effectiveFuelCost = useMemo(() => {
    if (calculationMode === "actual_refill" && fuelCostInput) {
      return Number(fuelCostInput);
    }
    return Math.round(effectiveFuelUsed * fuelPrice);
  }, [calculationMode, fuelCostInput, effectiveFuelUsed, fuelPrice]);

  // Rasio Aktual (km/L) & Liter per 100km
  const actualKml = useMemo(() => {
    if (effectiveDistance > 0 && effectiveFuelUsed > 0) {
      return Number((effectiveDistance / effectiveFuelUsed).toFixed(2));
    }
    return standardKml || 10;
  }, [effectiveDistance, effectiveFuelUsed, standardKml]);

  const actualL100km = useMemo(() => {
    if (effectiveDistance > 0 && effectiveFuelUsed > 0) {
      return Number(((effectiveFuelUsed / effectiveDistance) * 100).toFixed(2));
    }
    return 0;
  }, [effectiveDistance, effectiveFuelUsed]);

  const costPerKm = useMemo(() => {
    if (effectiveDistance > 0 && effectiveFuelCost > 0) {
      return Math.round(effectiveFuelCost / effectiveDistance);
    }
    return 0;
  }, [effectiveDistance, effectiveFuelCost]);

  // Persentase Deviasi terhadap Standar
  const diffPercent = useMemo(() => {
    if (!standardKml || standardKml <= 0 || !actualKml) return 0;
    return Number((((standardKml - actualKml) / standardKml) * 100).toFixed(1));
  }, [standardKml, actualKml]);

  // Status Anomali Otomatis
  const anomalyStatus = useMemo(() => {
    const maxDiff = configData?.max_consumption_diff_percent ?? 20;
    if (diffPercent > maxDiff) return "indikasi_anomali";
    if (diffPercent > maxDiff * 0.5) return "perlu_diperiksa";
    return "normal";
  }, [diffPercent, configData]);

  // Quick Presets untuk Kalkulator BBM (Mirip UPD)
  const setPreset = (type: "inner_50" | "near_150" | "medium_350" | "long_700" | "full_tank") => {
    const s = Number(startKm) || 12000;
    if (type === "inner_50") {
      setDistanceMode("odometer");
      setEndKm(s + 50);
      setManualDistance(50);
      setCalculationMode("estimate");
    } else if (type === "near_150") {
      setDistanceMode("odometer");
      setEndKm(s + 150);
      setManualDistance(150);
      setCalculationMode("estimate");
    } else if (type === "medium_350") {
      setDistanceMode("odometer");
      setEndKm(s + 350);
      setManualDistance(350);
      setCalculationMode("estimate");
    } else if (type === "long_700") {
      setDistanceMode("odometer");
      setEndKm(s + 700);
      setManualDistance(700);
      setCalculationMode("estimate");
    } else if (type === "full_tank") {
      setCalculationMode("actual_refill");
      const estLit = tankCapacity || 60;
      setFuelUsedInput(estLit);
      setFuelRefillInput(estLit);
      setFuelCostInput(estLit * fuelPrice);
    }
  };

  // Handler Simpan Perjalanan & BBM ke Database
  const handleSaveTrip = async () => {
    if (!driverName) {
      toast.error("Pilih atau isi nama pengemudi terlebih dahulu");
      return;
    }
    if (!nopol) {
      toast.error("Pilih atau isi nomor polisi kendaraan terlebih dahulu");
      return;
    }
    if (effectiveDistance <= 0) {
      toast.error("Jarak tempuh perjalanan harus lebih dari 0 km");
      return;
    }

    setIsSavingTrip(true);
    try {
      const sKm = distanceMode === "odometer" ? Number(startKm) : 0;
      const eKm = distanceMode === "odometer" ? Number(endKm) : Number(manualDistance);

      const payload = {
        vehicle_id: selectedVehicleId || null,
        nopol: nopol.toUpperCase(),
        driver_id: selectedDriverId || null,
        driver_name: driverName,
        trip_date: departureDateTime,
        start_km: sKm,
        end_km: eKm,
        odo_distance: effectiveDistance,
        fuel_used: effectiveFuelUsed,
        fuel_refill: Number(fuelRefillInput) || effectiveFuelUsed,
        fuel_cost: effectiveFuelCost,
        standard_kml: standardKml,
        calculation_method: calculationMethod,
        anomaly_status: anomalyStatus,
        notes: `${destination ? `Tujuan: ${destination}. ` : ""}${noSpd ? `No SPD: ${noSpd}. ` : ""}${notes}`,
      };

      const res = await fetch("/api/fuel-monitoring/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Gagal menyimpan data perjalanan");
      }

      toast.success("Catatan perjalanan dan konsumsi BBM berhasil disimpan!");
      mutateTrips();
      mutateAnomalies();
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Konversi ke Bon Pengemudi
  const handleConvertToBon = () => {
    if (!driverName) {
      toast.error("Pilih nama pengemudi terlebih dahulu");
      return;
    }
    const params = new URLSearchParams({
      driver_name: driverName,
      driver_nik: driverNik || "",
      driver_id: selectedDriverId || "",
      nopol: nopol || "",
      destination: destination || "",
      no_spd: noSpd || "",
      amount: effectiveFuelCost.toString(),
      keterangan: `BBM ${nopol} - ${destination || "Perjalanan Dinas"} (${effectiveFuelUsed} L)`,
    });
    router.push(`/admin/bon-pengemudi?${params.toString()}`);
  };

  // Export Kalkulator ke Excel
  const exportCalculatorExcel = () => {
    try {
      const sheetData: any[] = [];
      sheetData.push(["RINCIAN ESTIMASI & MONITORING BBM PERJALANAN DINAS"]);
      sheetData.push(["PT TRANS KP"]);
      sheetData.push([]);
      sheetData.push(["Pengemudi", driverName || "-"]);
      sheetData.push(["NIK", driverNik || "-"]);
      sheetData.push(["Kendaraan", `${nopol || "-"} (${vehicleName || "-"})`]);
      sheetData.push(["Tujuan / Rute", destination || "-"]);
      sheetData.push(["No. SPD", noSpd || "-"]);
      sheetData.push(["Waktu Berangkat", departureDateTime ? format(new Date(departureDateTime), "dd/MM/yyyy HH.mm") : "-"]);
      sheetData.push(["Waktu Kembali", returnDateTime ? format(new Date(returnDateTime), "dd/MM/yyyy HH.mm") : "-"]);
      sheetData.push(["Jenis BBM", fuelType]);
      sheetData.push(["Harga per Liter", formatRp(fuelPrice)]);
      sheetData.push([]);
      sheetData.push(["PARAMETER", "NILAI"]);
      sheetData.push(["KM Awal Odometer", startKm]);
      sheetData.push(["KM Akhir Odometer", endKm]);
      sheetData.push(["Total Jarak Tempuh", `${effectiveDistance} KM`]);
      sheetData.push(["Konsumsi Standar Kendaraan", `${standardKml} km/L`]);
      sheetData.push(["BBM Terpakai", `${effectiveFuelUsed} Liter`]);
      sheetData.push(["Rasio Aktual", `${actualKml} km/L`]);
      sheetData.push(["Liter / 100km", `${actualL100km} L/100km`]);
      sheetData.push(["Biaya BBM per KM", `${formatRp(costPerKm)}/km`]);
      sheetData.push(["Deviasi Selisih (%)", `${diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`}`]);
      sheetData.push(["Status Evaluasi Efisiensi", anomalyStatus.toUpperCase()]);
      sheetData.push(["TOTAL ESTIMASI BIAYA BBM", formatRp(effectiveFuelCost)]);
      if (notes) sheetData.push(["Catatan", notes]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estimasi BBM");
      const fileName = `BBM_${(nopol || "Kendaraan").replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Excel rincian BBM berhasil diunduh!");
    } catch {
      toast.error("Gagal mengunduh file Excel");
    }
  };

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

  // Export Trips List to Excel
  const exportTripsToExcel = () => {
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
      {/* Top Header (Gaya Identik dengan Hitung UPD) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 inline-flex">
                <Fuel className="w-6 h-6" />
              </span>
              Hitung & Monitoring BBM Armada
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Bahan Bakar Minyak
            </span>
          </div>
          <p className="text-sm text-surface-400 mt-1">
            Hitung otomatis estimasi konsumsi BBM, biaya perjalanan dinas, audit km/liter, dan deteksi anomali armada operasional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTariffReference(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-surface-700 font-medium text-surface-300 hover:bg-surface-800 hover:text-white transition-all text-xs sm:text-sm cursor-pointer"
          >
            <Info className="w-4 h-4 text-amber-400" />
            Tabel Standar & Tarif BBM
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "calculator" ? "trips" : "calculator")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700 font-medium text-surface-200 hover:bg-surface-750 transition-all text-xs sm:text-sm shadow-sm cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            {activeTab === "calculator" ? `Riwayat Perjalanan (${trips.length})` : "Kembali ke Kalkulator BBM"}
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-surface-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("calculator")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === "calculator"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          <Calculator className="w-4 h-4" />
          Kalkulator & Estimasi BBM
        </button>
        <button
          onClick={() => setActiveTab("trips")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === "trips"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Riwayat Perjalanan & Audit
          {trips.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
              {trips.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("fleet")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === "fleet"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          <Car className="w-4 h-4" />
          Status Armada & Tangki
        </button>
        <button
          onClick={() => setActiveTab("anomalies")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === "anomalies"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          Deteksi Anomali
          {anomalies.filter((a) => a.status === "baru").length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300">
              {anomalies.filter((a) => a.status === "baru").length} Baru
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === "config"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          <Settings className="w-4 h-4" />
          Pengaturan Ambang Batas
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: KALKULATOR & ESTIMASI BBM (GAYA PERSIS HITUNG UPD) */}
      {/* ======================================================== */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          {/* Main Input Form Glass-card */}
          <div className="glass-card p-5 sm:p-6 border border-surface-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-800/80 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-base font-semibold text-white">Parameter Perjalanan & Konsumsi BBM</h2>
              </div>

              {/* Quick Presets Jarak Tempuh */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-surface-400 text-[11px] mr-1 hidden md:inline">Preset Jarak:</span>
                <button
                  type="button"
                  onClick={() => setPreset("inner_50")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors cursor-pointer"
                >
                  Dalam Kota (50 km)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset("near_150")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors cursor-pointer"
                >
                  Luar Kota Dekat (150 km)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset("medium_350")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors cursor-pointer"
                >
                  Sedang (350 km)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset("long_700")}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition-colors cursor-pointer"
                >
                  Jauh (700 km)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset("full_tank")}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  Full Tank ({tankCapacity} L)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Pengemudi Dropdown (Solid background + Click outside auto close) */}
              <div ref={driverDropdownRef} className="relative">
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
                    className="w-full pl-9 pr-8 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                  {driverName && (
                    <button
                      type="button"
                      onClick={() => {
                        setDriverName("");
                        setDriverNik("");
                        setSelectedDriverId("");
                        setDriverSearch("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isDriverDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl shadow-black max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/60">
                    {filteredDrivers.length > 0 ? (
                      filteredDrivers.map((d: any) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDriverId(d.id);
                            setDriverName(d.full_name);
                            setDriverNik(d.nik);
                            setDriverSearch(d.full_name);
                            setIsDriverDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-sm text-surface-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-medium text-white">{d.full_name}</p>
                            <p className="text-[11px] text-surface-400">NIK: {d.nik}</p>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {d.jabatan || d.role}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3.5 py-3 text-xs text-surface-400 text-center">
                        Pengemudi tidak ditemukan. Ketik nama manual.
                      </div>
                    )}
                  </div>
                )}
                {driverNik && <p className="text-[11px] text-surface-400 mt-1">NIK: {driverNik}</p>}
              </div>

              {/* 2. Nomor Polisi (Kendaraan) Dropdown */}
              <div ref={vehicleDropdownRef} className="relative">
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                  Nomor Polisi (Kendaraan) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Pilih atau ketik nopol..."
                    value={nopol}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNopol(val);
                      setVehicleSearch(val);
                      setIsVehicleDropdownOpen(true);
                    }}
                    onFocus={() => setIsVehicleDropdownOpen(true)}
                    className="w-full pl-9 pr-8 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-amber-500 text-sm font-mono uppercase transition-colors"
                  />
                  {nopol && (
                    <button
                      type="button"
                      onClick={() => {
                        setNopol("");
                        setVehicleSearch("");
                        setSelectedVehicleId("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isVehicleDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl shadow-black max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/60">
                    {filteredVehicles.length > 0 ? (
                      filteredVehicles.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setNopol(v.nopol);
                            setSelectedVehicleId(v.id);
                            setVehicleName(v.name || "");
                            setVehicleType(v.type || "Mobil");
                            if (v.fuel_consumption) setStandardKml(v.fuel_consumption);
                            if (v.tank_capacity) setTankCapacity(v.tank_capacity);
                            setVehicleSearch(v.nopol);
                            setIsVehicleDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-sm text-surface-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-mono font-bold text-white text-sm">{v.nopol}</p>
                            <p className="text-[11px] text-surface-400">{v.name || v.brand || "Kendaraan"}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 block">
                              Std: {v.fuel_consumption || 10} km/L
                            </span>
                            <span className="text-[10px] text-surface-400 mt-0.5 block">Tangki: {v.tank_capacity || 60}L</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3.5 py-3 text-xs text-surface-400 text-center">
                        Kendaraan tidak ada di daftar. Tetap gunakan nopol yang diketik.
                      </div>
                    )}
                  </div>
                )}
                {vehicleName && (
                  <p className="text-[11px] text-surface-400 mt-1">
                    {vehicleName} ({vehicleType}) • Standar: <strong className="text-emerald-400">{standardKml} km/L</strong> • Tangki: {tankCapacity}L
                  </p>
                )}
              </div>

              {/* 3. Kota Tujuan / Destinasi Dropdown */}
              <div ref={cityDropdownRef} className="relative">
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                  Kota Tujuan / Destinasi
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Pilih atau ketik kota tujuan..."
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setCitySearch(e.target.value);
                      setIsCityDropdownOpen(true);
                    }}
                    onFocus={() => setIsCityDropdownOpen(true)}
                    className="w-full pl-9 pr-8 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                  {destination && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestination("");
                        setCitySearch("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isCityDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl shadow-black max-h-52 overflow-y-auto py-1 divide-y divide-slate-800/60">
                    {filteredCities.length > 0 ? (
                      filteredCities.slice(0, 30).map((city) => {
                        const destObj = destinations.find((d: any) => d.city?.toLowerCase() === city.toLowerCase());
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setDestination(city);
                              setCitySearch(city);
                              if (destObj && destObj.distance_km) {
                                setManualDistance(destObj.distance_km);
                                const s = Number(startKm) || 12000;
                                setEndKm(s + destObj.distance_km);
                              }
                              setIsCityDropdownOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-sm text-surface-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                          >
                            <span className="font-medium text-white">{city}</span>
                            {destObj?.distance_km && (
                              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                                ± {destObj.distance_km} KM
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3.5 py-3 text-xs text-surface-400 text-center">
                        Kota tidak ada di master. Tetap gunakan tujuan yang diketik.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Waktu Keberangkatan (Format 24 Jam: 00.00 - 23.59 diketik manual) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-brand-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Keberangkatan <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-brand-400 font-mono font-bold">
                    Pukul {departureHour}.{departureMinute} WIB
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full pl-9 pr-2 py-2.5 bg-surface-900 border border-brand-500/40 text-white rounded-xl focus:outline-none focus:border-brand-500 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ketik jam: 06.00"
                      value={departureTimeText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDepartureTimeText(val);
                        const parsed = parseTimeInput(val);
                        setDepartureHour(parsed.hour);
                        setDepartureMinute(parsed.minute);
                      }}
                      onBlur={() => {
                        const parsed = parseTimeInput(departureTimeText);
                        setDepartureTimeText(parsed.formatted);
                        setDepartureHour(parsed.hour);
                        setDepartureMinute(parsed.minute);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-brand-500/40 text-white rounded-xl focus:outline-none focus:border-brand-500 font-mono font-bold text-sm tracking-wider"
                    />
                  </div>
                </div>
                {/* Shortcut Jam Berangkat */}
                <div className="flex items-center gap-1 text-[10px] text-surface-400 pt-0.5">
                  <span className="shrink-0 text-[10px]">Cepat:</span>
                  {["06.00", "07.00", "08.00", "13.00"].map((t) => {
                    const [h, m] = t.split(".");
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setDepartureTimeText(t);
                          setDepartureHour(h);
                          setDepartureMinute(m);
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors cursor-pointer",
                          departureHour === h && departureMinute === m
                            ? "bg-brand-500/30 text-brand-300 font-bold border border-brand-500/40"
                            : "bg-surface-800 hover:bg-surface-700 text-surface-300"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Waktu Kembali / Selesai (Format 24 Jam diketik manual) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Selesai / Kembali <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Pukul {returnHour}.{returnMinute} WIB
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full pl-9 pr-2 py-2.5 bg-surface-900 border border-emerald-500/40 text-white rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ketik jam: 18.00"
                      value={returnTimeText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReturnTimeText(val);
                        const parsed = parseTimeInput(val);
                        setReturnHour(parsed.hour);
                        setReturnMinute(parsed.minute);
                      }}
                      onBlur={() => {
                        const parsed = parseTimeInput(returnTimeText);
                        setReturnTimeText(parsed.formatted);
                        setReturnHour(parsed.hour);
                        setReturnMinute(parsed.minute);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-emerald-500/40 text-white rounded-xl focus:outline-none focus:border-emerald-500 font-mono font-bold text-sm tracking-wider"
                    />
                  </div>
                </div>
                {/* Shortcut Jam Kembali */}
                <div className="flex items-center gap-1 text-[10px] text-surface-400 pt-0.5">
                  <span className="shrink-0 text-[10px]">Cepat:</span>
                  {["15.00", "17.00", "18.00", "21.00"].map((t) => {
                    const [h, m] = t.split(".");
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setReturnTimeText(t);
                          setReturnHour(h);
                          setReturnMinute(m);
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors cursor-pointer",
                          returnHour === h && returnMinute === m
                            ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40"
                            : "bg-surface-800 hover:bg-surface-700 text-surface-300"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Pilihan Jenis BBM & Harga per Liter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Jenis BBM & Harga / Liter</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">{formatRp(fuelPrice)} / L</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FUEL_TYPES.slice(0, 3).map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => {
                        setFuelType(f.name);
                        setFuelPrice(f.price);
                      }}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all truncate cursor-pointer",
                        fuelType === f.name
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                          : "bg-surface-900 text-surface-400 border-surface-700 hover:text-white"
                      )}
                      title={`${f.name} - ${formatRp(f.price)}`}
                    >
                      {f.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  {FUEL_TYPES.slice(3, 6).map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => {
                        setFuelType(f.name);
                        setFuelPrice(f.price);
                      }}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all truncate cursor-pointer",
                        fuelType === f.name
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                          : "bg-surface-900 text-surface-400 border-surface-700 hover:text-white"
                      )}
                      title={`${f.name} - ${formatRp(f.price)}`}
                    >
                      {f.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                  <input
                    type="number"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(Number(e.target.value) || 0)}
                    placeholder="Harga per liter"
                    className="w-full pl-8 pr-3 py-1.5 bg-surface-900 border border-surface-700 text-white rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* 7. Input Jarak Tempuh / Odometer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">
                    Jarak Tempuh (KM) <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDistanceMode("odometer")}
                      className={cn(
                        "px-2 py-0.5 rounded cursor-pointer transition-colors",
                        distanceMode === "odometer" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-surface-400"
                      )}
                    >
                      Odometer
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setDistanceMode("manual_km")}
                      className={cn(
                        "px-2 py-0.5 rounded cursor-pointer transition-colors",
                        distanceMode === "manual_km" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-surface-400"
                      )}
                    >
                      KM Langsung
                    </button>
                  </div>
                </div>

                {distanceMode === "odometer" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-surface-400 block mb-0.5">KM Awal</span>
                      <input
                        type="number"
                        value={startKm}
                        onChange={(e) => setStartKm(e.target.value)}
                        placeholder="KM Awal"
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-surface-400 block mb-0.5">KM Akhir</span>
                      <input
                        type="number"
                        value={endKm}
                        onChange={(e) => setEndKm(e.target.value)}
                        placeholder="KM Akhir"
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      value={manualDistance}
                      onChange={(e) => setManualDistance(e.target.value)}
                      placeholder="Total Jarak dalam KM"
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}
                <p className="text-[11px] text-cyan-400 font-mono font-medium">
                  Total Jarak: <strong>{effectiveDistance} KM</strong>
                </p>
              </div>

              {/* 8. Metode Konsumsi BBM */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">
                    Metode Konsumsi BBM
                  </label>
                  <span className="text-[10px] text-amber-400 font-medium">
                    {calculationMode === "estimate" ? "Estimasi Standar" : "Riil Pengisian"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCalculationMode("estimate")}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer",
                      calculationMode === "estimate"
                        ? "bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm"
                        : "bg-surface-900 text-surface-400 border-surface-700 hover:text-white"
                    )}
                  >
                    Otomatis Standar km/L
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalculationMode("actual_refill")}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer",
                      calculationMode === "actual_refill"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm"
                        : "bg-surface-900 text-surface-400 border-surface-700 hover:text-white"
                    )}
                  >
                    Input Struk / Isi Riil
                  </button>
                </div>

                {calculationMode === "actual_refill" ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-surface-400 block mb-0.5">Liter Terpakai</span>
                      <input
                        type="number"
                        step="any"
                        value={fuelUsedInput}
                        onChange={(e) => setFuelUsedInput(e.target.value)}
                        placeholder="Contoh: 25"
                        className="w-full px-3 py-1.5 bg-surface-900 border border-surface-700 text-white rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-surface-400 block mb-0.5">Total Biaya (Rp)</span>
                      <input
                        type="number"
                        value={fuelCostInput}
                        onChange={(e) => setFuelCostInput(e.target.value)}
                        placeholder="Contoh: 250000"
                        className="w-full px-3 py-1.5 bg-surface-900 border border-surface-700 text-white rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-surface-900/60 border border-surface-800 text-[11px] text-surface-400">
                    Kebutuhan = Jarak ({effectiveDistance} km) / Standar ({standardKml} km/L) = <strong className="text-white">{effectiveFuelUsed} Liter</strong>
                  </div>
                )}
              </div>

              {/* 9. No SPD & Catatan Rute */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1">
                  Nomor SPD & Catatan Rute
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                    <input
                      type="text"
                      placeholder="Nomor SPD (cth: SPD/BBM/001)"
                      value={noSpd}
                      onChange={(e) => setNoSpd(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Catatan rute / kondisi perjalanan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grand Total Summary Card - Directly visible at top without scrolling (Gaya Identik UPD) */}
          <div className="glass-card p-4 sm:p-5 border border-amber-500/40 bg-gradient-to-r from-surface-900 via-surface-900 to-amber-950/30 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-5">
                <div>
                  <p className="text-[11px] text-surface-400 uppercase font-semibold">Total Jarak Tempuh</p>
                  <p className="text-lg font-bold text-cyan-400 mt-0.5">{effectiveDistance.toLocaleString("id-ID")} KM</p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-400 uppercase font-semibold">Konsumsi BBM</p>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">
                    {effectiveFuelUsed} <span className="text-xs font-normal text-surface-400">Liter</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-400 uppercase font-semibold">Rasio Konsumsi</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    {actualKml} <span className="text-xs font-normal text-surface-400">km/L</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-400 uppercase font-semibold">Status Efisiensi</p>
                  <div className="mt-1">
                    {anomalyStatus === "indikasi_anomali" ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Boros ({diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`})
                      </span>
                    ) : anomalyStatus === "perlu_diperiksa" ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Perlu Evaluasi (+{diffPercent}%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Efisien / Normal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3 lg:pl-6 lg:border-l border-surface-800">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-surface-400 uppercase font-bold tracking-wider">TOTAL BIAYA BBM</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-emerald-400">
                    {formatRp(effectiveFuelCost)}
                  </p>
                  <p className="text-[10px] text-surface-400 mt-0.5">
                    Biaya per km: <strong className="text-white">{formatRp(costPerKm)}/km</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTrip}
                    disabled={isSavingTrip || effectiveDistance === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gradient-brand font-semibold text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all text-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isSavingTrip ? "Menyimpan..." : "Simpan"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPrintFuelData({
                        driverName: driverName || "Driver",
                        driverNik,
                        nopol: nopol || "-",
                        vehicleName: vehicleName || "-",
                        destination: destination || "-",
                        noSpd: noSpd || "-",
                        departureTime: departureDateTime,
                        returnTime: returnDateTime,
                        startKm: Number(startKm) || 0,
                        endKm: Number(endKm) || 0,
                        distance: effectiveDistance,
                        fuelType,
                        fuelPrice,
                        fuelUsed: effectiveFuelUsed,
                        fuelCost: effectiveFuelCost,
                        actualKml,
                        standardKml: standardKml || 0,
                        costPerKm,
                        anomalyStatus,
                        notes,
                        dateRecorded: new Date().toISOString(),
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 hover:text-white hover:bg-surface-700 transition-all text-xs cursor-pointer"
                    title="Cetak Slip Kwitansi BBM"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    Cetak
                  </button>

                  <button
                    type="button"
                    onClick={exportCalculatorExcel}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs cursor-pointer"
                    title="Download Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Excel
                  </button>

                  <button
                    type="button"
                    onClick={handleConvertToBon}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-semibold cursor-pointer"
                    title="Buat Bon Pengemudi dengan nominal BBM ini"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    Bon
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Rincian Konsumsi & Evaluasi Anomali (Gaya Rincian Harian UPD) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                Audit Rincian Konsumsi & Evaluasi Deviasi
              </span>
              <span className="text-[11px] text-surface-400 hidden sm:inline">
                Perbandingan konsumsi aktual vs standar kendaraan ({standardKml} km/L)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Standar Kendaraan</span>
                  <span className="font-bold text-white">{standardKml} km/L</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Konsumsi Aktual</span>
                  <span className="font-bold text-emerald-400">{actualKml} km/L</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-800">
                  <span className="text-surface-400">Selisih Deviasi</span>
                  <span className={cn("font-bold font-mono", diffPercent > 15 ? "text-rose-400" : "text-emerald-400")}>
                    {diffPercent > 0 ? `+${diffPercent}% lebih boros` : `${Math.abs(diffPercent)}% lebih hemat`}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Kapasitas Tangki</span>
                  <span className="font-bold text-white">{tankCapacity} Liter</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">BBM Dibutuhkan</span>
                  <span className="font-bold text-amber-400">{effectiveFuelUsed} Liter</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-800">
                  <span className="text-surface-400">Persentase Isi Tangki</span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {tankCapacity > 0 ? `${Math.round((effectiveFuelUsed / tankCapacity) * 100)}% dari tangki` : "-"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Biaya per Kilometer</span>
                  <span className="font-bold text-amber-400">{formatRp(costPerKm)} / km</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Liter per 100 KM</span>
                  <span className="font-bold text-white">{actualL100km} L / 100km</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-800">
                  <span className="text-surface-400">Status Validasi</span>
                  <span className="font-bold text-emerald-400">
                    {anomalyStatus === "normal" ? "Memenuhi Standar" : "Perlu Verifikasi Admin"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RIWAYAT PERJALANAN & AUDIT BBM                    */}
      {/* ======================================================== */}
      {activeTab === "trips" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  placeholder="Cari nopol, pengemudi, catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                <select
                  value={nopolFilter}
                  onChange={(e) => setNopolFilter(e.target.value)}
                  className="bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-surface-200 focus:outline-none"
                >
                  <option value="all">Semua Kendaraan</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.nopol}>
                      {v.nopol}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-surface-200 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="normal">Normal</option>
                  <option value="perlu_diperiksa">Perlu Diperiksa</option>
                  <option value="indikasi_anomali">Indikasi Anomali</option>
                </select>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-surface-950 border border-surface-700 rounded-xl px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none"
                />
                <span className="text-surface-500 text-xs">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-surface-950 border border-surface-700 rounded-xl px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none"
                />

                <button
                  onClick={exportTripsToExcel}
                  className="px-3 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs text-surface-200 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> Export
                </button>
              </div>
            </div>
          </div>

          {/* Table Trips */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0f172a] text-surface-300 font-semibold uppercase border-b border-surface-800">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Kendaraan & Driver</th>
                    <th className="px-4 py-3">Odometer (KM)</th>
                    <th className="px-4 py-3">Jarak</th>
                    <th className="px-4 py-3">BBM Terpakai</th>
                    <th className="px-4 py-3">Konsumsi</th>
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
                        Belum ada catatan perjalanan dan BBM. Gunakan tab Kalkulator untuk menghitung dan menyimpan data.
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
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedTrip(t);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors cursor-pointer"
                              title="Lihat Detail Audit"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPrintFuelData({
                                  driverName: t.driver_name,
                                  nopol: t.nopol,
                                  destination: t.notes || "-",
                                  departureTime: t.trip_date,
                                  startKm: t.start_km,
                                  endKm: t.end_km,
                                  distance: t.odo_distance,
                                  fuelType: "BBM Operasional",
                                  fuelPrice: t.fuel_used > 0 ? Math.round(t.fuel_cost / t.fuel_used) : 10000,
                                  fuelUsed: t.fuel_used,
                                  fuelCost: t.fuel_cost,
                                  actualKml: t.actual_kml,
                                  standardKml: t.standard_kml || 10,
                                  costPerKm: t.cost_per_km,
                                  anomalyStatus: t.anomaly_status,
                                  notes: t.notes,
                                  dateRecorded: t.created_at,
                                });
                              }}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title="Cetak Slip BBM"
                            >
                              <Printer className="w-4 h-4" />
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: FLEET OVERVIEW & REAL-TIME ARMADA                 */}
      {/* ======================================================== */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-800 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-surface-300 leading-relaxed">
              <span className="font-semibold text-white">Status Sensor Telemetri & GPS: </span>
              Armada yang belum terpasang perangkat keras sensor tangki atau GPS tracker secara transparan bertanda{" "}
              <span className="text-surface-400 font-semibold px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700">
                Belum Terhubung
              </span>
              . Data konsumsi armada tersebut dihitung akurat melalui metode <span className="text-white font-medium">Full-to-Full</span> dan audit struk transaksi tanpa manipulasi data.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const latestTrip = trips.find((t) => t.nopol === v.nopol);
              const isSensorConnected = latestTrip?.sensor_status === "terhubung";
              const fuelPercent = latestTrip?.fuel_percent ?? null;
              const standardKmlVal = v.fuel_consumption || latestTrip?.standard_kml;
              const actualKmlVal = latestTrip?.actual_kml;

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

                  {/* Level Tangki */}
                  <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-surface-400">Level Tangki BBM</span>
                      <span className="font-mono font-bold text-white">
                        {fuelPercent !== null ? `${fuelPercent}%` : `${v.tank_capacity || 60} L (Kapasitas)`}
                      </span>
                    </div>
                    <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          (fuelPercent ?? 75) > 40
                            ? "bg-emerald-500"
                            : (fuelPercent ?? 75) > 20
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        )}
                        style={{ width: `${fuelPercent ?? 75}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-surface-900/60 border border-surface-800">
                      <span className="text-[10px] text-surface-400 block">Standar Konsumsi</span>
                      <span className="font-mono font-bold text-surface-200 mt-0.5 block">
                        {standardKmlVal ? `${standardKmlVal} km/L` : "-"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-900/60 border border-surface-800">
                      <span className="text-[10px] text-surface-400 block">Aktual Terakhir</span>
                      <span className={cn("font-mono font-bold mt-0.5 block", actualKmlVal ? "text-emerald-400" : "text-surface-500")}>
                        {actualKmlVal ? `${actualKmlVal} km/L` : "Belum Ada"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DETEKSI ANOMALI & INVESTIGASI                     */}
      {/* ======================================================== */}
      {activeTab === "anomalies" && (
        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0f172a] text-surface-300 font-semibold uppercase border-b border-surface-800">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Kendaraan</th>
                    <th className="px-4 py-3">Jenis Anomali</th>
                    <th className="px-4 py-3">Tingkat</th>
                    <th className="px-4 py-3">Nilai Selisih</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {anomalies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-surface-500">
                        Tidak ada indikasi anomali yang terdeteksi. Semua konsumsi BBM armada terpantau dalam batas toleransi wajar.
                      </td>
                    </tr>
                  ) : (
                    anomalies.map((a) => (
                      <tr key={a.id} className="hover:bg-surface-800/25 transition-colors">
                        <td className="px-4 py-3 font-mono text-surface-300">
                          {format(new Date(a.created_at), "dd/MM/yy HH:mm")}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{a.nopol}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{a.title}</p>
                          <p className="text-[11px] text-surface-400 truncate max-w-xs">{a.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              a.severity === "critical"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            )}
                          >
                            {a.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-300 font-bold">{a.diff_value || "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              a.status === "selesai"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : a.status === "tidak_terbukti"
                                ? "bg-surface-800 text-surface-400"
                                : "bg-rose-500/20 text-rose-300"
                            )}
                          >
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedAnomaly(a);
                              setVerifyStatus(a.status || "sedang_diperiksa");
                              setVerifyNotes(a.verification_notes || "");
                              setIsVerifyModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-surface-200 border border-surface-700 font-medium cursor-pointer"
                          >
                            Periksa
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

      {/* ======================================================== */}
      {/* TAB 5: PENGATURAN AMBANG BATAS                           */}
      {/* ======================================================== */}
      {activeTab === "config" && (
        <div className="glass-card max-w-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" /> Pengaturan Ambang Batas Deteksi Anomali BBM
            </h3>
            <p className="text-xs text-surface-400 mt-1">
              Konfigurasi ambang batas toleransi deviasi otomatis untuk mendeteksi pemborosan BBM atau manipulasi armada.
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
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[11px] text-surface-500">
                Penurunan level tangki melebihi batas ini saat mesin mati akan memicu peringatan kritis indikasi kebocoran/pencurian.
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
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:shadow-lg transition-all cursor-pointer"
              >
                Simpan Konfigurasi Ambang Batas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TABEL STANDAR KENDARAAN & TARIF BBM (MIRIP UPD)   */}
      {/* ======================================================== */}
      {showTariffReference && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-surface-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Fuel className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Tabel Standar Kendaraan & Tarif Resmi BBM</h3>
                  <p className="text-xs text-surface-400">Pedoman konsumsi bahan bakar armada dan standar efisiensi operasional.</p>
                </div>
              </div>
              <button
                onClick={() => setShowTariffReference(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabel 1: Harga BBM Pertamina */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                1. Daftar Harga Resmi Bahan Bakar Minyak
              </h4>
              <div className="overflow-x-auto rounded-xl border border-surface-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0f172a] text-surface-300 font-semibold uppercase border-b border-surface-800">
                    <tr>
                      <th className="px-4 py-2.5">Jenis Bahan Bakar</th>
                      <th className="px-4 py-2.5">Oktan / Cetane</th>
                      <th className="px-4 py-2.5 text-right">Harga Resmi / Liter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800 text-surface-200">
                    {FUEL_TYPES.map((f) => (
                      <tr key={f.name}>
                        <td className="px-4 py-2 font-medium">{f.name}</td>
                        <td className="px-4 py-2 text-surface-400">BBM Standar Nasional</td>
                        <td className="px-4 py-2 text-right font-bold font-mono text-amber-400">{formatRp(f.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabel 2: Standar Konsumsi Armada */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                2. Standar Konsumsi BBM Kendaraan (km/L)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-surface-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0f172a] text-surface-300 font-semibold uppercase border-b border-surface-800">
                    <tr>
                      <th className="px-4 py-2.5">Tipe Kendaraan</th>
                      <th className="px-4 py-2.5">Contoh Armada</th>
                      <th className="px-4 py-2.5 text-right">Standar Konsumsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800 text-surface-200">
                    <tr>
                      <td className="px-4 py-2 font-medium">MPV / Kendaraan Ringan</td>
                      <td className="px-4 py-2 text-surface-400">Toyota Avanza, Veloz, Xenia</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">12 - 14 km/L</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Medium MPV / Diesel</td>
                      <td className="px-4 py-2 text-surface-400">Toyota Innova Reborn Diesel</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">10 - 12 km/L</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Van / Commuter</td>
                      <td className="px-4 py-2 text-surface-400">Toyota Hiace Commuter / Premio</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">9 - 10 km/L</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Minibus / Isuzu Elf</td>
                      <td className="px-4 py-2 text-surface-400">Isuzu Elf Long / Microbus</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">7 - 9 km/L</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Truk / Kendaraan Berat</td>
                      <td className="px-4 py-2 text-surface-400">Colt Diesel / Truk Box</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">5 - 7 km/L</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowTariffReference(false)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CETAK SLIP / KWITANSI BBM (GAYA IDENTIK DENGAN UPD) */}
      {/* ======================================================== */}
      {printFuelData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-surface-900 border border-surface-700 w-full max-w-xl rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:w-full print:p-8">
            {/* Header Resmi PT TRANS KP */}
            <div className="flex items-center justify-between border-b-2 border-surface-700 print:border-black pb-4">
              <div>
                <h2 className="text-xl font-black text-white print:text-black tracking-tight">PT TRANS KP</h2>
                <p className="text-xs text-surface-400 print:text-gray-600">
                  SLIP BUKTI TRANSAKSI & AUDIT BAHAN BAKAR MINYAK (BBM)
                </p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 print:border-black print:text-black uppercase">
                  VOUCHER BBM
                </span>
                <p className="text-[10px] text-surface-500 print:text-gray-500 mt-1">
                  {format(new Date(), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>

            {/* Info Trip & Pengemudi */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-surface-400 print:text-gray-600 block">Nama Pengemudi</span>
                <p className="font-bold text-white print:text-black text-sm">{printFuelData.driverName}</p>
                {printFuelData.driverNik && (
                  <p className="text-[11px] text-surface-400 print:text-gray-500 font-mono">NIK: {printFuelData.driverNik}</p>
                )}
              </div>
              <div>
                <span className="text-surface-400 print:text-gray-600 block">Kendaraan & Nopol</span>
                <p className="font-bold text-white print:text-black text-sm font-mono">{printFuelData.nopol}</p>
                <p className="text-[11px] text-surface-400 print:text-gray-500">{printFuelData.vehicleName || "Armada Operasional"}</p>
              </div>
              <div>
                <span className="text-surface-400 print:text-gray-600 block">Rute / Tujuan</span>
                <p className="font-medium text-white print:text-black">{printFuelData.destination || "-"}</p>
                {printFuelData.noSpd && (
                  <p className="text-[11px] text-surface-400 print:text-gray-500">SPD: {printFuelData.noSpd}</p>
                )}
              </div>
              <div>
                <span className="text-surface-400 print:text-gray-600 block">Jenis Bahan Bakar</span>
                <p className="font-bold text-amber-400 print:text-black">{printFuelData.fuelType}</p>
                <p className="text-[11px] text-surface-400 print:text-gray-500 font-mono">{formatRp(printFuelData.fuelPrice)} / Liter</p>
              </div>
            </div>

            {/* Rincian Angka Odometer & BBM */}
            <div className="p-4 rounded-xl bg-surface-950/70 border border-surface-800 print:bg-gray-50 print:border-gray-300 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-400 print:text-gray-600">Odometer:</span>
                <span className="font-mono font-bold text-white print:text-black">
                  KM {printFuelData.startKm.toLocaleString()} s/d {printFuelData.endKm.toLocaleString()} ({printFuelData.distance} KM)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400 print:text-gray-600">Volume BBM Terpakai / Diisi:</span>
                <span className="font-mono font-bold text-white print:text-black">{printFuelData.fuelUsed} Liter</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400 print:text-gray-600">Rasio Konsumsi Aktual:</span>
                <span className="font-mono font-bold text-emerald-400 print:text-black">
                  {printFuelData.actualKml} km/L (Standar: {printFuelData.standardKml} km/L)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400 print:text-gray-600">Biaya per Kilometer:</span>
                <span className="font-mono text-white print:text-black">{formatRp(printFuelData.costPerKm)} / km</span>
              </div>
              <div className="border-t border-surface-700 print:border-gray-400 pt-2 flex justify-between items-center">
                <span className="text-xs uppercase font-bold text-surface-200 print:text-black">TOTAL BIAYA BBM:</span>
                <span className="text-xl font-extrabold text-amber-400 print:text-black">
                  {formatRp(printFuelData.fuelCost)}
                </span>
              </div>
            </div>

            {/* Tanda Tangan */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-surface-800 print:border-gray-300">
              <div className="space-y-12">
                <p className="text-surface-400 print:text-gray-600 font-medium">Pengemudi / Driver</p>
                <p className="font-bold text-white print:text-black border-t border-surface-700 print:border-gray-400 pt-1 mx-6">
                  {printFuelData.driverName}
                </p>
              </div>
              <div className="space-y-12">
                <p className="text-surface-400 print:text-gray-600 font-medium">Petugas Operasional</p>
                <p className="font-bold text-white print:text-black border-t border-surface-700 print:border-gray-400 pt-1 mx-6">
                  ( .................................... )
                </p>
              </div>
            </div>

            {/* Print Action Buttons (Hidden saat cetak) */}
            <div className="flex items-center justify-end gap-2 pt-2 print:hidden border-t border-surface-800">
              <button
                type="button"
                onClick={() => setPrintFuelData(null)}
                className="px-4 py-2 rounded-xl bg-surface-800 text-surface-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl gradient-brand text-white text-xs font-semibold hover:shadow-lg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Audit Perjalanan (Existing) */}
      {isDetailModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" /> Detail Audit Konsumsi BBM
                </h2>
                <p className="text-xs text-surface-400 font-mono mt-0.5">
                  {selectedTrip.nopol} — {selectedTrip.driver_name}
                </p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-surface-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-950/80 border border-surface-800">
                <div>
                  <span className="text-surface-400">Tanggal Perjalanan</span>
                  <p className="font-semibold text-white mt-0.5">
                    {format(new Date(selectedTrip.trip_date), "dd MMMM yyyy HH:mm", { locale: localeId })}
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
                  <span className="text-surface-400">Biaya Total</span>
                  <p className="font-mono font-bold text-amber-400 mt-0.5">{formatRp(selectedTrip.fuel_cost)}</p>
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
                className="w-full px-4 py-2 rounded-xl bg-surface-800 text-surface-200 hover:bg-surface-700 text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Verifikasi Anomali (Existing) */}
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
              <button type="button" onClick={() => setIsVerifyModalOpen(false)} className="text-surface-400 hover:text-white cursor-pointer">
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
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="sedang_diperiksa">Sedang Diperiksa</option>
                <option value="selesai">Selesai (Terverifikasi & Ditindaklanjuti)</option>
                <option value="tidak_terbukti">Tidak Terbukti (Wajar karena rute macet/tanjakan)</option>
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
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-surface-700 text-surface-300 hover:bg-surface-800 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-1 px-4 py-2 rounded-xl gradient-brand text-white text-xs font-semibold hover:shadow-lg disabled:opacity-50 cursor-pointer"
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
