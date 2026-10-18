"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  ClipboardCheck, 
  Wrench, 
  Car, 
  Clock, 
  Gauge, 
  Fuel, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  Calendar, 
  FileText, 
  PenTool, 
  X, 
  Printer, 
  ArrowLeft,
  ShieldCheck,
  Eye,
  Check,
  ChevronDown
} from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { SignaturePad } from "@/components/ui/signature-pad";
import { ChecklistDocumentModal } from "@/components/vehicle-checklist/checklist-document-modal";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Pilihan Opsi Pemeriksaan Sesuai Form Fisik PT Gudang Garam Tbk. Kediri
const FLUID_OPTIONS = ["Cukup", "Kurang", "Kosong"];
const CONDITION_OPTIONS = ["Baik", "Kurang Baik", "Rusak"];
const AVAILABILITY_OPTIONS = ["Ada", "Tidak Ada", "Rusak"];
const AC_OPTIONS = ["Dingin", "Kurang dingin", "Tidak dingin"];
const BRAKE_FLUID_OPTIONS = ["Baik", "Kurang", "Kosong"];
const FUEL_OPTIONS = ["E", "1/4", "1/2", "3/4", "F"];

function TechnicianVehicleChecklistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const { data: meData, isLoading: isMeLoading } = useSWR("/api/auth/me", fetcher);
  const currentUser = meData?.user;

  const isTeknisi = currentUser?.jabatan === "Teknisi";
  const isMaintenanceAdmin = currentUser?.jabatan === "Admin Perawatan Kendaraan";
  const isSuperAdmin = currentUser?.role === "super_admin";
  const hasAccess = isTeknisi || isMaintenanceAdmin || isSuperAdmin;

  const { data: checklistsData, mutate: mutateChecklists, isLoading: isChecklistsLoading } = useSWR(
    hasAccess ? "/api/vehicle-checklists" : null,
    fetcher
  );
  const { data: vehiclesData } = useSWR(hasAccess ? "/api/vehicles" : null, fetcher);
  const { data: usersData } = useSWR(hasAccess ? "/api/users" : null, fetcher);

  const checklists = Array.isArray(checklistsData) ? checklistsData : [];
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : [];
  const drivers = Array.isArray(usersData) ? usersData.filter((u: any) => u.jabatan === "Driver" || u.role === "karyawan") : [];

  const [activeTab, setActiveTab] = useState<"form" | "history">(
    tabParam === "history" || tabParam === "dashboard" ? "history" : "form"
  );
  const [searchHistory, setSearchHistory] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  useEffect(() => {
    if (tabParam === "history" || tabParam === "dashboard") {
      setActiveTab("history");
    } else if (tabParam === "form") {
      setActiveTab("form");
    }
  }, [tabParam]);

  const handleTabChange = (t: "form" | "history") => {
    setActiveTab(t);
    router.replace(`/vehicle-checklist?tab=${t}`, { scroll: false });
  };

  const stats = useMemo(() => {
    const total = checklists.length;
    const laik = checklists.filter((c: any) => c.status === "Baik / Laik Jalan").length;
    const perbaikan = total - laik;
    const uniqueVehicles = new Set(checklists.map((c: any) => c.nopol)).size;
    return { total, laik, perbaikan, uniqueVehicles };
  }, [checklists]);

  // Form State
  const [nopol, setNopol] = useState("");
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setIsVehicleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVehicles = useMemo(() => {
    if (!nopol) return vehicles;
    const q = nopol.toLowerCase();
    return vehicles.filter(
      (v: any) =>
        v.nopol?.toLowerCase().includes(q) ||
        (v.name || "").toLowerCase().includes(q) ||
        (v.type || "").toLowerCase().includes(q)
    );
  }, [vehicles, nopol]);
  const [inspectionTime, setInspectionTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [kilometer, setKilometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("F");
  const [destination, setDestination] = useState("");

  // 1. Kondisi Mesin & Cairan
  const [engineOil, setEngineOil] = useState("Cukup");
  const [radiatorWater, setRadiatorWater] = useState("Cukup");
  const [batteryWater, setBatteryWater] = useState("Cukup");
  const [powerSteeringOil, setPowerSteeringOil] = useState("Cukup");
  const [vBelt, setVBelt] = useState("Baik");
  const [understell, setUnderstell] = useState("Baik");
  const [dashboardIndicator, setDashboardIndicator] = useState("Baik");
  const [engineCondition, setEngineCondition] = useState("Baik");

  // 2. Kelengkapan
  const [wheelWrench, setWheelWrench] = useState("Ada");
  const [jack, setJack] = useState("Ada");
  const [safetyTriangle, setSafetyTriangle] = useState("Ada");
  const [firstAidBox, setFirstAidBox] = useState("Ada");
  const [stnkPkb, setStnkPkb] = useState("Ada");

  // 3. Ban Utama
  const [mainTireCondition, setMainTireCondition] = useState("Baik");

  // 4. Ban Serep
  const [spareTireCondition, setSpareTireCondition] = useState("Baik");

  // 5. Accesories
  const [acCondition, setAcCondition] = useState("Dingin");
  const [radioTape, setRadioTape] = useState("Baik");
  const [cigaretteLighter, setCigaretteLighter] = useState("Baik");

  // 6. Lampu-Lampu
  const [lightsCondition, setLightsCondition] = useState("Baik");
  const [lightsNotes, setLightsNotes] = useState("");

  // 7. Rem
  const [brakeOperation, setBrakeOperation] = useState("Baik");
  const [brakeFluid, setBrakeFluid] = useState("Baik");
  const [handBrake, setHandBrake] = useState("Baik");

  // Catatan & Status
  const [generalNotes, setGeneralNotes] = useState("");
  const [status, setStatus] = useState("Baik / Laik Jalan");

  // Personil & Tanda Tangan
  const [driverName, setDriverName] = useState("");
  const [driverSignature, setDriverSignature] = useState("");
  const [technicianSignature, setTechnicianSignature] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorSignature, setSupervisorSignature] = useState("");

  const [showDriverPad, setShowDriverPad] = useState(false);
  const [showTechPad, setShowTechPad] = useState(false);
  const [showSupervisorPad, setShowSupervisorPad] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form
  const resetForm = () => {
    setNopol("");
    setKilometer("");
    setDestination("");
    setGeneralNotes("");
    setLightsNotes("");
    setDriverName("");
    setDriverSignature("");
    setTechnicianSignature("");
    setSupervisorName("");
    setSupervisorSignature("");
    setStatus("Baik / Laik Jalan");
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nopol) {
      toast.error("Nomor Polisi kendaraan wajib dipilih/diisi.");
      return;
    }
    if (!kilometer) {
      toast.error("Posisi Kilometer wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nopol,
        inspection_time: inspectionTime,
        kilometer: parseInt(kilometer),
        fuel_level: fuelLevel,
        destination,

        engine_oil: engineOil,
        radiator_water: radiatorWater,
        battery_water: batteryWater,
        power_steering_oil: powerSteeringOil,
        v_belt: vBelt,
        understell: understell,
        dashboard_indicator: dashboardIndicator,
        engine_condition: engineCondition,

        wheel_wrench: wheelWrench,
        jack,
        safety_triangle: safetyTriangle,
        first_aid_box: firstAidBox,
        stnk_pkb: stnkPkb,

        main_tire_condition: mainTireCondition,
        spare_tire_condition: spareTireCondition,

        ac_condition: acCondition,
        radio_tape: radioTape,
        cigarette_lighter: cigaretteLighter,

        lights_condition: lightsCondition,
        lights_notes: lightsNotes,

        brake_operation: brakeOperation,
        brake_fluid: brakeFluid,
        hand_brake: handBrake,

        general_notes: generalNotes,
        status,

        driver_name: driverName,
        driver_signature: driverSignature,
        technician_name: currentUser?.full_name || "Teknisi",
        technician_signature: technicianSignature,
        supervisor_name: supervisorName,
        supervisor_signature: supervisorSignature,
      };

      const res = await fetch("/api/vehicle-checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan ceklis kendaraan");
      }

      toast.success("Ceklis kondisi kendaraan berhasil disimpan!");
      resetForm();
      mutateChecklists();
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter History
  const filteredHistory = useMemo(() => {
    if (!searchHistory) return checklists;
    const q = searchHistory.toLowerCase();
    return checklists.filter((c: any) => 
      c.nopol?.toLowerCase().includes(q) ||
      c.checklist_no?.toLowerCase().includes(q) ||
      c.destination?.toLowerCase().includes(q) ||
      c.driver_name?.toLowerCase().includes(q)
    );
  }, [checklists, searchHistory]);

  // Handle Unauthorized View
  if (!isMeLoading && !hasAccess) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-red-500/30 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Akses Terbatas: Khusus Karyawan Teknisi</h2>
        <p className="text-sm text-surface-400 leading-relaxed">
          Menu <strong>Ceklis Kondisi Kendaraan Sebelum Keberangkatan</strong> ini hanya dapat diakses oleh karyawan dengan jabatan <strong>Teknisi</strong> untuk melakukan inspeksi kelayakan fisik armada.
        </p>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold shadow-lg shadow-brand-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 slide-up pb-16">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              PT. GUDANG GARAM Tbk. Kediri
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1 flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-brand-400" />
            Cek List Kondisi Kendaraan
          </h1>
          <p className="text-xs sm:text-sm text-surface-400 mt-0.5">
            Pemeriksaan fisik armada sebelum keberangkatan dinas (Khusus Teknisi).
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-surface-900/80 p-1.5 rounded-2xl border border-surface-800 w-fit">
          <button
            onClick={() => handleTabChange("form")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === "form"
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                : "text-surface-400 hover:text-white"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Formulir Ceklis
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === "history"
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                : "text-surface-400 hover:text-white"
            )}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Dashboard & Riwayat ({checklists.length})
          </button>
        </div>
      </div>

      {activeTab === "form" ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Identitas Kendaraan & Perjalanan */}
          <div className="glass-card p-5 rounded-2xl border border-surface-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-surface-800/80 pb-2">
              <Car className="w-4 h-4 text-brand-400" />
              1. Identitas Kendaraan & Pemeriksaan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Nomor Polisi */}
              <div className="space-y-1.5" ref={vehicleDropdownRef}>
                <label className="text-xs font-semibold text-surface-300">
                  Nomor Polisi <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pilih / ketik nopol..."
                    value={nopol}
                    onFocus={() => setIsVehicleDropdownOpen(true)}
                    onChange={(e) => {
                      setNopol(e.target.value.toUpperCase());
                      setIsVehicleDropdownOpen(true);
                    }}
                    required
                    className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-3 pr-16 py-2 text-sm font-bold font-mono tracking-wider uppercase focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {nopol && (
                      <button
                        type="button"
                        onClick={() => {
                          setNopol("");
                          setIsVehicleDropdownOpen(true);
                        }}
                        className="p-1 rounded-md text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                      className="p-1 rounded-md text-surface-400 hover:text-white transition-colors"
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isVehicleDropdownOpen && "rotate-180")} />
                    </button>
                  </div>

                  {/* Dropdown List Kendaraan Kebawah */}
                  {isVehicleDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0F172A]/95 backdrop-blur-xl border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-2 border-b border-surface-800 text-[10px] font-bold text-surface-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Daftar Armada ({filteredVehicles.length})</span>
                        {nopol && (
                          <button
                            type="button"
                            onClick={() => setNopol("")}
                            className="text-surface-400 hover:text-white"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-surface-800/50 p-1 scrollbar-thin">
                        {filteredVehicles.length === 0 ? (
                          <div className="p-3 text-center text-xs text-surface-400">
                            <p>Tidak ada armada dengan nopol tersebut.</p>
                            <button
                              type="button"
                              onClick={() => setIsVehicleDropdownOpen(false)}
                              className="mt-1.5 text-xs text-brand-400 font-semibold hover:underline"
                            >
                              Gunakan "{nopol}"
                            </button>
                          </div>
                        ) : (
                          filteredVehicles.map((v: any) => {
                            const isSelected = nopol.toUpperCase() === v.nopol.toUpperCase();
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  setNopol(v.nopol.toUpperCase());
                                  setIsVehicleDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-all group",
                                  isSelected
                                    ? "bg-brand-500/15 border border-brand-500/30 text-white"
                                    : "hover:bg-surface-800/80 text-surface-300 hover:text-white"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={cn(
                                    "p-1.5 rounded-lg shrink-0 transition-colors",
                                    isSelected ? "bg-brand-500 text-white" : "bg-surface-800 group-hover:bg-surface-700 text-surface-400"
                                  )}>
                                    <Car className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-mono font-bold text-xs sm:text-sm text-white tracking-wider">
                                      {v.nopol}
                                    </p>
                                    <p className="text-[10px] text-surface-400 truncate">
                                      {v.name || v.type || "Mobil"}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-brand-400 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Jam Pemeriksaan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Jam Pemeriksaan</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    type="text"
                    value={inspectionTime}
                    onChange={(e) => setInspectionTime(e.target.value)}
                    placeholder="Contoh: 11.00"
                    className="w-full pl-9 pr-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-sm font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Posisi Kilometer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">
                  Posisi Kilometer <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Gauge className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    type="number"
                    value={kilometer}
                    onChange={(e) => setKilometer(e.target.value)}
                    placeholder="Contoh: 267071"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Tujuan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Kota Tujuan / Keperluan</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Contoh: Pamekasan"
                    className="w-full pl-9 pr-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Posisi Indikator BBM */}
            <div className="space-y-2 pt-2 border-t border-surface-800/60">
              <label className="text-xs font-semibold text-surface-300 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                Posisi Indikator BBM: <span className="text-amber-400 font-bold ml-1">{fuelLevel}</span>
              </label>
              <div className="flex items-center gap-2">
                {FUEL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFuelLevel(opt)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all border",
                      fuelLevel === opt
                        ? "bg-amber-500 text-amber-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-surface-900 text-surface-400 border-surface-800 hover:bg-surface-800 hover:text-white"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Pemeriksaan Komponen Fisik */}
          <div className="glass-card p-5 rounded-2xl border border-surface-800 space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-surface-800/80 pb-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-400" />
              2. Checklist Komponen & Kelayakan Armada
            </h2>

            {/* Group 1: Kondisi Mesin & Cairan */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                A. Kondisi Mesin & Cairan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckItemRow label="Oli Mesin" options={FLUID_OPTIONS} value={engineOil} onChange={setEngineOil} />
                <CheckItemRow label="Air Radiator" options={FLUID_OPTIONS} value={radiatorWater} onChange={setRadiatorWater} />
                <CheckItemRow label="Accu / Air Accu" options={FLUID_OPTIONS} value={batteryWater} onChange={setBatteryWater} />
                <CheckItemRow label="Oli Powersteer" options={FLUID_OPTIONS} value={powerSteeringOil} onChange={setPowerSteeringOil} />
                <CheckItemRow label="V. Belt / Multibelt" options={CONDITION_OPTIONS} value={vBelt} onChange={setVBelt} />
                <CheckItemRow label="Understell" options={CONDITION_OPTIONS} value={understell} onChange={setUnderstell} />
                <CheckItemRow label="Indikator Dash Board" options={CONDITION_OPTIONS} value={dashboardIndicator} onChange={setDashboardIndicator} />
                <CheckItemRow label="Kondisi Mesin" options={CONDITION_OPTIONS} value={engineCondition} onChange={setEngineCondition} />
              </div>
            </div>

            {/* Group 2: Kelengkapan */}
            <div className="space-y-3 pt-4 border-t border-surface-800/60">
              <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                B. Kelengkapan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckItemRow label="Kunci Roda" options={AVAILABILITY_OPTIONS} value={wheelWrench} onChange={setWheelWrench} />
                <CheckItemRow label="Dongkrak" options={AVAILABILITY_OPTIONS} value={jack} onChange={setJack} />
                <CheckItemRow label="Segitiga Pengaman" options={AVAILABILITY_OPTIONS} value={safetyTriangle} onChange={setSafetyTriangle} />
                <CheckItemRow label="Kotak P3K" options={AVAILABILITY_OPTIONS} value={firstAidBox} onChange={setFirstAidBox} />
                <CheckItemRow label="STNK + Pajak (PKB)" options={AVAILABILITY_OPTIONS} value={stnkPkb} onChange={setStnkPkb} />
              </div>
            </div>

            {/* Group 3: Ban */}
            <div className="space-y-3 pt-4 border-t border-surface-800/60">
              <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                C. Kondisi Ban
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckItemRow label="Ban Utama (4 Roda)" options={CONDITION_OPTIONS} value={mainTireCondition} onChange={setMainTireCondition} />
                <CheckItemRow label="Ban Serep" options={CONDITION_OPTIONS} value={spareTireCondition} onChange={setSpareTireCondition} />
              </div>
            </div>

            {/* Group 4: Accesories & Lampu */}
            <div className="space-y-3 pt-4 border-t border-surface-800/60">
              <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                D. Accesories & Lampu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckItemRow label="Kondisi AC" options={AC_OPTIONS} value={acCondition} onChange={setAcCondition} />
                <CheckItemRow label="Radio / Tape" options={CONDITION_OPTIONS} value={radioTape} onChange={setRadioTape} />
                <CheckItemRow label="Pemantik Rokok" options={CONDITION_OPTIONS} value={cigaretteLighter} onChange={setCigaretteLighter} />
                <CheckItemRow label="Lampu-Lampu" options={CONDITION_OPTIONS} value={lightsCondition} onChange={setLightsCondition} />
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Keterangan lampu (misal: lampu depan, sein, rem normal / ada catatan)..."
                  value={lightsNotes}
                  onChange={(e) => setLightsNotes(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Group 5: Rem */}
            <div className="space-y-3 pt-4 border-t border-surface-800/60">
              <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                E. Sistem Pengereman
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckItemRow label="Kerja Rem" options={CONDITION_OPTIONS} value={brakeOperation} onChange={setBrakeOperation} />
                <CheckItemRow label="Minyak Rem / Kopling" options={BRAKE_FLUID_OPTIONS} value={brakeFluid} onChange={setBrakeFluid} />
                <CheckItemRow label="Rem Tangan" options={CONDITION_OPTIONS} value={handBrake} onChange={setHandBrake} />
              </div>
            </div>

            {/* Kesimpulan & Catatan Umum */}
            <div className="space-y-3 pt-4 border-t border-surface-800/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Status Kelayakan Armada</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-brand-500"
                  >
                    <option value="Baik / Laik Jalan">Baik / Laik Jalan</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Catatan Teknisi / Keterangan</label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan untuk pengemudi atau pengawas..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Personil & Tanda Tangan */}
          <div className="glass-card p-5 rounded-2xl border border-surface-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-surface-800/80 pb-2">
              <PenTool className="w-4 h-4 text-purple-400" />
              3. Pengesahan & Tanda Tangan Digital
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Yang membuat: Pengemudi */}
              <div className="p-4 rounded-xl bg-surface-900/60 border border-surface-800 space-y-3">
                <p className="text-xs font-bold text-surface-400 uppercase">Yang Membuat (Pengemudi)</p>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    list="driver-list"
                    placeholder="Nama Pengemudi..."
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                  <datalist id="driver-list">
                    {drivers.map((d: any) => (
                      <option key={d.id} value={d.full_name}>{d.nik} - {d.full_name}</option>
                    ))}
                  </datalist>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDriverPad(!showDriverPad)}
                  className="w-full py-1.5 px-3 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-surface-300 flex items-center justify-center gap-1.5 border border-surface-700"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  {driverSignature ? "Ubah Tanda Tangan" : "Tanda Tangan Pengemudi"}
                </button>
                {showDriverPad && (
                  <div className="p-2 rounded-xl bg-surface-950 border border-surface-700">
                    <SignaturePad
                      value={driverSignature}
                      onChange={(sig) => setDriverSignature(sig)}
                      height={120}
                    />
                  </div>
                )}
                {driverSignature && !showDriverPad && (
                  <div className="p-2 rounded-lg bg-white/5 border border-surface-800 flex justify-center">
                    <img src={driverSignature} alt="Tanda Tangan Pengemudi" className="h-14 object-contain" />
                  </div>
                )}
              </div>

              {/* Menyetujui: Perawatan (Teknisi) */}
              <div className="p-4 rounded-xl bg-surface-900/60 border border-brand-500/30 space-y-3">
                <p className="text-xs font-bold text-brand-400 uppercase">Menyetujui (Teknisi Perawatan)</p>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    disabled
                    value={currentUser?.full_name || "Teknisi"}
                    className="w-full bg-surface-950 border border-surface-700 text-white rounded-xl px-3 py-2 text-xs opacity-80"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowTechPad(!showTechPad)}
                  className="w-full py-1.5 px-3 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-xs text-brand-300 flex items-center justify-center gap-1.5 border border-brand-500/40"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  {technicianSignature ? "Ubah Tanda Tangan" : "Tanda Tangan Teknisi"}
                </button>
                {showTechPad && (
                  <div className="p-2 rounded-xl bg-surface-950 border border-surface-700">
                    <SignaturePad
                      value={technicianSignature}
                      onChange={(sig) => setTechnicianSignature(sig)}
                      height={120}
                    />
                  </div>
                )}
                {technicianSignature && !showTechPad && (
                  <div className="p-2 rounded-lg bg-white/5 border border-surface-800 flex justify-center">
                    <img src={technicianSignature} alt="Tanda Tangan Teknisi" className="h-14 object-contain" />
                  </div>
                )}
              </div>

              {/* Mengetahui: Pengawas */}
              <div className="p-4 rounded-xl bg-surface-900/60 border border-surface-800 space-y-3">
                <p className="text-xs font-bold text-surface-400 uppercase">Mengetahui (Pengawas)</p>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Nama Pengawas..."
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowSupervisorPad(!showSupervisorPad)}
                  className="w-full py-1.5 px-3 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-surface-300 flex items-center justify-center gap-1.5 border border-surface-700"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  {supervisorSignature ? "Ubah Tanda Tangan" : "Tanda Tangan Pengawas"}
                </button>
                {showSupervisorPad && (
                  <div className="p-2 rounded-xl bg-surface-950 border border-surface-700">
                    <SignaturePad
                      value={supervisorSignature}
                      onChange={(sig) => setSupervisorSignature(sig)}
                      height={120}
                    />
                  </div>
                )}
                {supervisorSignature && !showSupervisorPad && (
                  <div className="p-2 rounded-lg bg-white/5 border border-surface-800 flex justify-center">
                    <img src={supervisorSignature} alt="Tanda Tangan Pengawas" className="h-14 object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl border border-surface-700 text-surface-300 font-semibold text-sm hover:bg-surface-800 transition-colors"
            >
              Reset Formulir
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl gradient-brand text-white font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "Menyimpan Ceklis..." : "Simpan Ceklis Kendaraan"}
            </button>
          </div>
        </form>
      ) : (
        /* History / Dashboard Tab */
        <div className="space-y-4">
          {/* KPI Summary Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-3.5 rounded-2xl border border-surface-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-surface-400">Total Ceklis</span>
                <ClipboardCheck className="w-4 h-4 text-brand-400" />
              </div>
              <p className="text-xl font-bold text-white mt-1">{stats.total}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Formulir tersimpan</p>
            </div>
            <div className="glass-card p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400">Laik Jalan</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white mt-1">{stats.laik}</p>
              <p className="text-[10px] text-emerald-400/80 mt-0.5">Kondisi siap dinas</p>
            </div>
            <div className="glass-card p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400">Perlu Perbaikan</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-white mt-1">{stats.perbaikan}</p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">Perlu perhatian mekanik</p>
            </div>
            <div className="glass-card p-3.5 rounded-2xl border border-surface-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-surface-400">Armada Unik</span>
                <Car className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-xl font-bold text-white mt-1">{stats.uniqueVehicles}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Kendaraan diperiksa</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-surface-800 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                placeholder="Cari nopol, tujuan, pengemudi, atau nomor ceklis..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-surface-800">
              <Wrench className="w-10 h-10 text-surface-500 mx-auto mb-2 opacity-50" />
              <p className="text-white font-semibold text-sm">Belum ada riwayat ceklis kendaraan</p>
              <p className="text-xs text-surface-400 mt-1">Silakan isi formulir pemeriksaan baru di atas.</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {filteredHistory.map((item: any) => {
                const isBaik = item.status === "Baik / Laik Jalan";
                return (
                  <div
                    key={item.id}
                    className="glass-card p-4 sm:p-5 rounded-2xl border border-surface-800 hover:border-surface-700 bg-surface-900/60 hover:bg-surface-900/90 transition-all duration-200 hover:shadow-xl hover:shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Sisi Kiri: Info Utama Kendaraan */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105",
                        isBaik
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      )}>
                        <Car className="w-6 h-6" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-base sm:text-lg text-white tracking-wider">
                            {item.nopol}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">
                            {item.checklist_no || "CHK"}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5",
                            isBaik
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", isBaik ? "bg-emerald-400" : "bg-amber-400")} />
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-x-4 gap-y-1 text-xs text-surface-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                            <span className="text-surface-300 font-medium">{item.destination || "Dalam Kota"}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                            <span>{format(new Date(item.date), "dd MMM yyyy", { locale: id })} {item.inspection_time ? `• ${item.inspection_time}` : ""}</span>
                          </span>
                          {item.driver_name && (
                            <span className="flex items-center gap-1">
                              <span className="text-surface-500">Driver:</span>
                              <span className="text-surface-300 font-medium">{item.driver_name}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-surface-500">
                            <span>Teknisi:</span>
                            <span className="text-surface-400">{item.technician_name}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sisi Kanan: Odometer & Tombol Detail */}
                    <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-surface-800/80 shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                          {Number(item.kilometer).toLocaleString("id-ID")} KM
                        </p>
                        <p className="text-[11px] text-surface-400 font-mono flex items-center md:justify-end gap-1">
                          <Fuel className="w-3 h-3 text-amber-400" />
                          BBM: <span className="text-white font-semibold">{item.fuel_level}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedDetail(item)}
                        className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-brand-500/10 hover:border-brand-500/30 hover:text-brand-300 text-surface-200 text-xs font-semibold flex items-center gap-2 border border-surface-700 transition-all shadow-sm group-hover:border-surface-600"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-400" />
                        <span>Lembar Fisik</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Pratinjau Lembar Ceklis Fisik Digital (Identik Kertas Gudang Garam) */}
      {selectedDetail && (
        <ChecklistDocumentModal item={selectedDetail} onClose={() => setSelectedDetail(null)} />
      )}
    </div>
  );
}

// Sub-component: Baris Item Pemeriksaan dengan tombol opsi
function CheckItemRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="p-2.5 rounded-xl bg-surface-900/50 border border-surface-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <span className="text-xs font-medium text-white truncate">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {options.map((opt) => {
          const isSelected = value === opt;
          const isGood = opt === "Cukup" || opt === "Baik" || opt === "Ada" || opt === "Dingin";
          const isBad = opt === "Kosong" || opt === "Rusak" || opt === "Tidak Ada" || opt === "Tidak dingin";

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all border",
                isSelected
                  ? isGood
                    ? "bg-emerald-500 text-emerald-950 border-emerald-400 shadow-sm"
                    : isBad
                    ? "bg-red-500 text-white border-red-400 shadow-sm"
                    : "bg-amber-500 text-amber-950 border-amber-400 shadow-sm"
                  : "bg-surface-850 text-surface-400 border-surface-800 hover:bg-surface-800 hover:text-white"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TechnicianVehicleChecklistPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-surface-400">Memuat Ceklis Kendaraan...</div>}>
      <TechnicianVehicleChecklistContent />
    </Suspense>
  );
}

