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
  FileText,
  Pencil,
  Trash2,
  Save,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRp } from "@/lib/fuel-monitoring";
import { INDONESIA_CITIES } from "@/lib/indonesia-cities";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Tipe Data untuk Referensi BBM & Standar Armada
interface FuelTariffItem {
  id: string;
  name: string;
  category: string;
  price: number;
  color?: string;
}

interface VehicleStandardItem {
  id: string;
  vehicleType: string;
  examples: string;
  standardKml: string;
}

// Daftar Default Standar Bahan Bakar & Harga Resmi Pertamina
const DEFAULT_FUEL_TARIFFS: FuelTariffItem[] = [
  { id: "pertalite", name: "Pertalite (RON 90)", category: "BBM Standar Nasional", price: 10000, color: "text-emerald-400" },
  { id: "pertamax", name: "Pertamax (RON 92)", category: "BBM Standar Nasional", price: 12950, color: "text-blue-400" },
  { id: "pertamax-turbo", name: "Pertamax Turbo (RON 98)", category: "BBM Non-Subsidi", price: 14400, color: "text-red-400" },
  { id: "bio-solar", name: "Bio Solar Subsidi", category: "BBM Subsidi Nasional", price: 6800, color: "text-amber-400" },
  { id: "dexlite", name: "Dexlite (CN 51)", category: "BBM Non-Subsidi", price: 13900, color: "text-teal-400" },
  { id: "pertamina-dex", name: "Pertamina Dex (CN 53)", category: "BBM Non-Subsidi", price: 14650, color: "text-purple-400" },
];

// Daftar Default Standar Konsumsi Armada (km/L)
const DEFAULT_VEHICLE_STANDARDS: VehicleStandardItem[] = [
  { id: "mpv", vehicleType: "MPV / Kendaraan Ringan", examples: "Toyota Avanza, Veloz, Xenia, Ertiga", standardKml: "12 - 14 km/L" },
  { id: "medium-mpv", vehicleType: "Medium MPV / Diesel", examples: "Toyota Innova Reborn Diesel / Zenix", standardKml: "10 - 12 km/L" },
  { id: "commuter", vehicleType: "Van / Commuter", examples: "Toyota Hiace Commuter / Premio", standardKml: "9 - 10 km/L" },
  { id: "minibus", vehicleType: "Minibus / Isuzu Elf", examples: "Isuzu Elf Long / Microbus", standardKml: "7 - 9 km/L" },
  { id: "truk", vehicleType: "Truk / Kendaraan Berat", examples: "Colt Diesel / Truk Box", standardKml: "5 - 7 km/L" },
];

const FUEL_TYPES = DEFAULT_FUEL_TARIFFS;

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

// Jarak Jalan Raya (KM) dari KEDIRI, Jawa Timur (Lokasi Pengguna / Aplikasi) ke Berbagai Kota & Kecamatan
const DISTANCES_FROM_KEDIRI: Record<string, number> = {
  // Wilayah Kediri & Sekitar (Dalam Kota / Kecamatan / Hub Transportasi)
  "kediri": 10,
  "kota kediri": 10,
  "kabupaten kediri": 15,
  "slg": 6,
  "simpang lima gumul": 6,
  "bandara dhoho": 15,
  "bandara dhoho kediri": 15,
  "bandar udara dhoho": 15,
  "dhoho": 15,
  "stasiun kediri": 3,
  "terminal tamanan": 5,
  "pare": 25,
  "kertosono": 28,
  "papar": 16,
  "gampengrejo": 8,
  "ngadiluwih": 12,
  "kras": 18,
  "gurah": 10,
  "plosoklaten": 16,
  "wates": 20,
  "kandangan": 28,
  "badas": 26,
  "plemahan": 20,
  "purwoasri": 22,
  "tarokan": 15,
  "grogol": 12,
  "banyakan": 10,
  "mojo": 16,
  "semen": 8,
  "ringinrejo": 22,
  "ngancar": 28,
  "kelud": 35,
  "gunung kelud": 35,

  // Jawa Timur Sekitar (Nganjuk, Tulungagung, Blitar, Jombang, Trenggalek)
  "nganjuk": 32,
  "kota nganjuk": 32,
  "kabupaten nganjuk": 32,
  "baron": 25,
  "warujayeng": 24,
  "tulungagung": 32,
  "kota tulungagung": 32,
  "kabupaten tulungagung": 32,
  "ngunut": 30,
  "campurdarat": 42,
  "blitar": 42,
  "kota blitar": 42,
  "kabupaten blitar": 45,
  "srengat": 32,
  "wlingi": 60,
  "lodoyo": 50,
  "kanigoro": 48,
  "trenggalek": 52,
  "kota trenggalek": 52,
  "kabupaten trenggalek": 52,
  "durenan": 40,
  "watulimo": 75,
  "prigi": 80,
  "jombang": 45,
  "kota jombang": 45,
  "kabupaten jombang": 45,
  "ploso": 55,

  // Madiun Raya & Jawa Timur Barat
  "madiun": 76,
  "kota madiun": 76,
  "kabupaten madiun": 80,
  "caruban": 65,
  "dolopo": 60,
  "ponorogo": 72,
  "kota ponorogo": 72,
  "kabupaten ponorogo": 72,
  "ngawi": 92,
  "kabupaten ngawi": 92,
  "magetan": 95,
  "kabupaten magetan": 95,
  "maospati": 82,
  "sarangan": 115,
  "pacitan": 155,
  "kabupaten pacitan": 155,

  // Gerbangkertosusila & Pantai Utara Jawa Timur
  "mojokerto": 75,
  "kota mojokerto": 75,
  "kabupaten mojokerto": 78,
  "krian": 92,
  "sidoarjo": 105,
  "kabupaten sidoarjo": 105,
  "porong": 98,
  "waru": 110,
  "juanda": 115,
  "bandara juanda": 115,
  "bandara juanda surabaya": 115,
  "surabaya": 120,
  "kota surabaya": 120,
  "tanjung perak": 125,
  "pelabuhan tanjung perak": 125,
  "gresik": 115,
  "kabupaten gresik": 115,
  "lamongan": 92,
  "kabupaten lamongan": 92,
  "babat": 78,
  "bojonegoro": 95,
  "kabupaten bojonegoro": 95,
  "tuban": 118,
  "kabupaten tuban": 118,

  // Malang Raya & Jawa Timur Timur
  "batu": 82,
  "kota batu": 82,
  "pujon": 68,
  "ngantang": 52,
  "kasembon": 42,
  "malang": 88,
  "kota malang": 88,
  "kabupaten malang": 92,
  "kepanjen": 85,
  "singosari": 95,
  "lawang": 100,
  "pasuruan": 125,
  "kota pasuruan": 125,
  "kabupaten pasuruan": 125,
  "bangil": 115,
  "gempol": 102,
  "pandaan": 110,
  "probolinggo": 165,
  "kota probolinggo": 165,
  "kabupaten probolinggo": 165,
  "kraksaan": 190,
  "bromo": 135,
  "lumajang": 160,
  "kabupaten lumajang": 160,
  "jember": 210,
  "kabupaten jember": 210,
  "bondowoso": 230,
  "kabupaten bondowoso": 230,
  "situbondo": 245,
  "kabupaten situbondo": 245,
  "banyuwangi": 350,
  "kabupaten banyuwangi": 350,
  "ketapang": 355,
  "pelabuhan ketapang": 355,

  // Madura dari Kediri
  "bangkalan": 145,
  "sampang": 195,
  "pamekasan": 225,
  "sumenep": 275,

  // Jawa Tengah & DIY dari Kediri
  "cepu": 115,
  "blora": 145,
  "sragen": 165,
  "solo": 175,
  "surakarta": 175,
  "surakarta (solo)": 175,
  "karanganyar": 185,
  "sukoharjo": 185,
  "boyolali": 195,
  "klaten": 205,
  "wonogiri": 215,
  "salatiga": 220,
  "rembang": 190,
  "pati": 240,
  "kudus": 250,
  "jepara": 265,
  "demak": 260,
  "semarang": 265,
  "kota semarang": 265,
  "kendal": 290,
  "batang": 320,
  "pekalongan": 350,
  "pemalang": 385,
  "tegal": 415,
  "brebes": 440,
  "magelang": 255,
  "temanggung": 280,
  "wonosobo": 295,
  "purworejo": 285,
  "kebumen": 325,
  "purwokerto": 380,
  "banyumas": 380,
  "purbalingga": 365,
  "banjarnegara": 335,
  "cilacap": 415,
  "yogyakarta": 235,
  "jogja": 235,
  "sleman": 230,
  "bantul": 240,
  "gunungkidul": 230,
  "kulon progo": 255,

  // Jawa Barat, DKI Jakarta, Banten dari Kediri
  "cirebon": 490,
  "kuningan": 510,
  "majalengka": 525,
  "indramayu": 535,
  "sumedang": 590,
  "bandung": 620,
  "cimahi": 625,
  "tasikmalaya": 570,
  "ciamis": 545,
  "banjar": 515,
  "garut": 620,
  "subang": 630,
  "purwakarta": 650,
  "karawang": 665,
  "bekasi": 690,
  "jakarta": 710,
  "dki jakarta": 710,
  "jakarta pusat": 710,
  "jakarta timur": 700,
  "jakarta selatan": 710,
  "jakarta barat": 715,
  "jakarta utara": 710,
  "depok": 715,
  "bogor": 730,
  "tangerang": 735,
  "tangerang selatan": 730,
  "serang": 790,
  "cilegon": 810,
  "sukabumi": 760,
  "cianjur": 695,

  // Bali & Luar Jawa dari Kediri
  "gilimanuk": 360,
  "denpasar": 465,
  "badung": 475,
  "gianyar": 485,
  "tabanan": 440,
  "singaraja": 420,
  "mataram": 620,
  "lombok": 620,
  "lampung": 910,
  "bandar lampung": 910,
  "palembang": 1180,
  "jambi": 1430,
  "padang": 1880,
  "pekanbaru": 1910,
  "medan": 2330,
  "banda aceh": 2780
};

// Jarak Jalan Raya (KM) dari Surabaya ke Berbagai Kota (Alternatif Origin)
const DISTANCES_FROM_SURABAYA: Record<string, number> = {
  "surabaya": 15,
  "sidoarjo": 28,
  "gresik": 32,
  "mojokerto": 52,
  "pasuruan": 65,
  "lamongan": 48,
  "bangkalan": 35,
  "malang": 92,
  "batu": 105,
  "probolinggo": 105,
  "lumajang": 145,
  "jember": 195,
  "bondowoso": 182,
  "situbondo": 188,
  "banyuwangi": 290,
  "jombang": 78,
  "kediri": 120,
  "blitar": 155,
  "tulungagung": 150,
  "trenggalek": 180,
  "nganjuk": 110,
  "madiun": 165,
  "solo": 255,
  "semarang": 345,
  "yogyakarta": 325,
  "bandung": 710,
  "jakarta": 780,
  "denpasar": 405
};

// Koordinat Kota-Kota di Indonesia untuk Kalkulasi Jarak Universal (Haversine)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "kediri": { lat: -7.8166, lng: 112.0118 },
  "surabaya": { lat: -7.2575, lng: 112.7521 },
  "sidoarjo": { lat: -7.4478, lng: 112.7183 },
  "malang": { lat: -7.9666, lng: 112.6326 },
  "batu": { lat: -7.8712, lng: 112.5273 },
  "nganjuk": { lat: -7.6053, lng: 111.9038 },
  "jombang": { lat: -7.5468, lng: 112.2331 },
  "tulungagung": { lat: -8.0664, lng: 111.9027 },
  "blitar": { lat: -8.0983, lng: 112.1681 },
  "trenggalek": { lat: -8.0504, lng: 111.7147 },
  "madiun": { lat: -7.6298, lng: 111.5239 },
  "ponorogo": { lat: -7.8671, lng: 111.4657 },
  "ngawi": { lat: -7.4039, lng: 111.4447 },
  "magetan": { lat: -7.6521, lng: 111.3283 },
  "bojonegoro": { lat: -7.1502, lng: 111.8817 },
  "tuban": { lat: -6.8976, lng: 112.0649 },
  "lamongan": { lat: -7.1283, lng: 112.4131 },
  "gresik": { lat: -7.1566, lng: 112.6555 },
  "mojokerto": { lat: -7.4726, lng: 112.4381 },
  "pasuruan": { lat: -7.6453, lng: 112.9075 },
  "probolinggo": { lat: -7.7543, lng: 113.2159 },
  "lumajang": { lat: -8.1331, lng: 113.2246 },
  "jember": { lat: -8.1724, lng: 113.7007 },
  "bondowoso": { lat: -7.9135, lng: 113.8214 },
  "situbondo": { lat: -7.7061, lng: 114.0048 },
  "banyuwangi": { lat: -8.2192, lng: 114.3692 },
  "pacitan": { lat: -8.2065, lng: 111.0921 },
  "solo": { lat: -7.5755, lng: 110.8243 },
  "surakarta": { lat: -7.5755, lng: 110.8243 },
  "semarang": { lat: -6.9667, lng: 110.4167 },
  "yogyakarta": { lat: -7.7956, lng: 110.3695 },
  "bandung": { lat: -6.9175, lng: 107.6191 },
  "jakarta": { lat: -6.2088, lng: 106.8456 },
  "denpasar": { lat: -8.6705, lng: 115.2126 }
};

// Helper parse rute teks (misal: "Kediri - Surabaya PP", "Kediri ke Malang", "Surabaya PP")
const parseRouteString = (
  raw: string,
  origin: string = "Kediri"
): { cleanDestination: string; isRoundTrip: boolean } => {
  if (!raw) return { cleanDestination: "", isRoundTrip: false };
  let str = raw.trim();

  // 1. Deteksi kata PP / Pulang Pergi / Bolak Balik
  const isRoundTrip = /\b(pp|p\.p|pergi\s*pulang|pulang\s*pergi|bolak\s*balik|round\s*trip)\b/i.test(str);
  str = str.replace(/\b(pp|p\.p|pergi\s*pulang|pulang\s*pergi|bolak\s*balik|round\s*trip)\b/gi, " ");

  // 2. Format rute: "Kediri - Surabaya", "Kediri ke Surabaya", "Kediri -> Surabaya"
  const separators = [" - ", " ke ", " menuju ", " -> ", " ➔ ", " --> "];
  let matchedSep = false;
  for (const sep of separators) {
    if (str.toLowerCase().includes(sep)) {
      const parts = str.split(new RegExp(sep, "i"));
      if (parts.length >= 2) {
        str = parts[parts.length - 1].trim();
        matchedSep = true;
        break;
      }
    }
  }

  // Jika dipisah tanda minus sederhana "kediri-surabaya" tanpa spasi
  if (!matchedSep && str.includes("-")) {
    const parts = str.split("-");
    if (parts.length >= 2) {
      str = parts[parts.length - 1].trim();
    }
  }

  // 3. Bersihkan prefix dan suffix umum
  str = str
    .replace(/^dari\s+[a-z\s]+(ke|menuju)\s+/i, "")
    .replace(/^(ke|menuju)\s+/i, "")
    .replace(/^(kota|kabupaten|kab\.|kecamatan|kec\.|wilayah|kantor|cabang|area|rsud)\s+/i, "")
    .replace(/,\s*(jawa\s*timur|jatim|jawa\s*tengah|jateng|jawa\s*barat|jabar|diy|dki\s*jakarta|dki|bali).*$/i, "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();

  return { cleanDestination: str, isRoundTrip };
};

// Helper pencari jarak otomatis antar kota (Default asal: Kediri, Jawa Timur)
const getAutoDistanceForDestination = (
  targetCity: string,
  originCity: string = "Kediri",
  destList: any[] = [],
  tripMultiplier: number = 1
): number | null => {
  if (!targetCity) return null;

  const parsed = parseRouteString(targetCity, originCity);
  const cleanTarget = (parsed.cleanDestination || targetCity).trim().toLowerCase();
  const effectiveMultiplier = (parsed.isRoundTrip ? 2 : 1) * tripMultiplier;

  const cleanOrigin = (originCity || "kediri")
    .trim()
    .toLowerCase()
    .replace(/^(kota|kabupaten|kab\.)\s+/i, "")
    .replace(/\s+\(.*\)$/, "")
    .trim();

  let oneWayDistance: number | null = null;

  // 1. Jika Origin adalah Kediri (Lokasi Pengguna)
  if (cleanOrigin.includes("kediri") || !cleanOrigin) {
    if (DISTANCES_FROM_KEDIRI[cleanTarget] !== undefined) {
      oneWayDistance = DISTANCES_FROM_KEDIRI[cleanTarget];
    } else {
      // Prioritaskan kecocokan key terpanjang terlebih dahulu agar tidak salah cocok
      const sortedKeys = Object.keys(DISTANCES_FROM_KEDIRI).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (cleanTarget === key) {
          oneWayDistance = DISTANCES_FROM_KEDIRI[key];
          break;
        }
      }
      if (oneWayDistance === null) {
        for (const key of sortedKeys) {
          if (cleanTarget.includes(key) || (key.length >= 4 && key.includes(cleanTarget))) {
            oneWayDistance = DISTANCES_FROM_KEDIRI[key];
            break;
          }
        }
      }
    }
  }

  // 2. Jika Origin adalah Surabaya
  if (oneWayDistance === null && cleanOrigin.includes("surabaya")) {
    if (DISTANCES_FROM_SURABAYA[cleanTarget] !== undefined) {
      oneWayDistance = DISTANCES_FROM_SURABAYA[cleanTarget];
    } else {
      const sortedKeys = Object.keys(DISTANCES_FROM_SURABAYA).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (cleanTarget.includes(key) || (key.length >= 4 && key.includes(cleanTarget))) {
          oneWayDistance = DISTANCES_FROM_SURABAYA[key];
          break;
        }
      }
    }
  }

  // 3. Cek dari master destination database
  if (oneWayDistance === null && destList && destList.length > 0) {
    const fromDb = destList.find((d: any) => d.city?.toLowerCase().includes(cleanTarget));
    if (fromDb && fromDb.distance_km && Number(fromDb.distance_km) > 0) {
      oneWayDistance = Number(fromDb.distance_km);
    }
  }

  // 4. Fallback kalkulasi via Koordinat GPS (Haversine formula * faktor jalan darat 1.32)
  if (oneWayDistance === null) {
    const origCoord = CITY_COORDINATES[cleanOrigin] || CITY_COORDINATES["kediri"];
    let targetCoord = CITY_COORDINATES[cleanTarget];
    if (!targetCoord) {
      for (const [key, coord] of Object.entries(CITY_COORDINATES)) {
        if (cleanTarget.includes(key) || key.includes(cleanTarget)) {
          targetCoord = coord;
          break;
        }
      }
    }

    if (origCoord && targetCoord) {
      const R = 6371; // radius bumi km
      const dLat = ((targetCoord.lat - origCoord.lat) * Math.PI) / 180;
      const dLng = ((targetCoord.lng - origCoord.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((origCoord.lat * Math.PI) / 180) *
          Math.cos((targetCoord.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const airDistance = R * c;
      oneWayDistance = Math.max(10, Math.round(airDistance * 1.32));
    }
  }

  if (oneWayDistance !== null) {
    return oneWayDistance * effectiveMultiplier;
  }

  return null;
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

  // Dynamic Fuel Tariffs & Vehicle Standards (Bisa Edit & Tambahkan)
  const [fuelTariffs, setFuelTariffs] = useState<FuelTariffItem[]>(DEFAULT_FUEL_TARIFFS);
  const [vehicleStandards, setVehicleStandards] = useState<VehicleStandardItem[]>(DEFAULT_VEHICLE_STANDARDS);

  // Sub-tab tampilan modal referensi ("all" | "fuel" | "vehicle")
  const [referenceTab, setReferenceTab] = useState<"all" | "fuel" | "vehicle">("all");

  // State Edit & Tambah Fuel Tariff
  const [editingFuelId, setEditingFuelId] = useState<string | null>(null);
  const [editFuelForm, setEditFuelForm] = useState<{ name: string; category: string; price: number }>({ name: "", category: "", price: 0 });
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  const [newFuelForm, setNewFuelForm] = useState<{ name: string; category: string; price: number }>({ name: "", category: "BBM Standar Nasional", price: 10000 });

  // State Edit & Tambah Standar Kendaraan
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState<{ vehicleType: string; examples: string; standardKml: string }>({ vehicleType: "", examples: "", standardKml: "" });
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState<{ vehicleType: string; examples: string; standardKml: string }>({ vehicleType: "", examples: "", standardKml: "" });

  // Load persistent tariffs from localStorage
  useEffect(() => {
    try {
      const savedFuels = localStorage.getItem("transkp_fuel_tariffs");
      if (savedFuels) {
        const parsed = JSON.parse(savedFuels);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFuelTariffs(parsed);
        }
      }
      const savedVehicles = localStorage.getItem("transkp_vehicle_standards");
      if (savedVehicles) {
        const parsedV = JSON.parse(savedVehicles);
        if (Array.isArray(parsedV) && parsedV.length > 0) {
          setVehicleStandards(parsedV);
        }
      }
    } catch (e) {
      console.error("Failed loading local tariff references", e);
    }
  }, []);

  const handleSaveFuelList = (updated: FuelTariffItem[]) => {
    setFuelTariffs(updated);
    try {
      localStorage.setItem("transkp_fuel_tariffs", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveVehicleList = (updated: VehicleStandardItem[]) => {
    setVehicleStandards(updated);
    try {
      localStorage.setItem("transkp_vehicle_standards", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFuel = () => {
    if (!newFuelForm.name.trim()) {
      toast.error("Nama jenis bahan bakar wajib diisi!");
      return;
    }
    if (!newFuelForm.price || newFuelForm.price <= 0) {
      toast.error("Harga BBM harus lebih besar dari Rp 0!");
      return;
    }
    const newItem: FuelTariffItem = {
      id: `fuel-${Date.now()}`,
      name: newFuelForm.name.trim(),
      category: newFuelForm.category.trim() || "BBM Standar Nasional",
      price: Number(newFuelForm.price),
      color: "text-amber-400",
    };
    const next = [...fuelTariffs, newItem];
    handleSaveFuelList(next);
    setIsAddingFuel(false);
    setNewFuelForm({ name: "", category: "BBM Standar Nasional", price: 10000 });
    toast.success(`Jenis BBM "${newItem.name}" berhasil ditambahkan!`);
  };

  const handleStartEditFuel = (f: FuelTariffItem) => {
    setEditingFuelId(f.id);
    setEditFuelForm({
      name: f.name,
      category: f.category,
      price: f.price,
    });
  };

  const handleSaveEditFuel = (id: string) => {
    if (!editFuelForm.name.trim()) {
      toast.error("Nama bahan bakar tidak boleh kosong!");
      return;
    }
    const oldItem = fuelTariffs.find((f) => f.id === id);
    const updatedPrice = Number(editFuelForm.price) || 0;
    const next = fuelTariffs.map((f) =>
      f.id === id
        ? {
            ...f,
            name: editFuelForm.name.trim(),
            category: editFuelForm.category.trim() || "BBM Standar Nasional",
            price: updatedPrice > 0 ? updatedPrice : f.price,
          }
        : f
    );
    handleSaveFuelList(next);
    if (oldItem && fuelType === oldItem.name) {
      setFuelType(editFuelForm.name.trim());
      if (updatedPrice > 0) setFuelPrice(updatedPrice);
    }
    setEditingFuelId(null);
    toast.success("Perubahan tarif BBM berhasil disimpan!");
  };

  const handleDeleteFuel = (id: string, name: string) => {
    if (fuelTariffs.length <= 1) {
      toast.error("Minimal harus menyisakan 1 jenis BBM!");
      return;
    }
    if (!confirm(`Hapus jenis BBM "${name}" dari tabel?`)) return;
    const next = fuelTariffs.filter((f) => f.id !== id);
    handleSaveFuelList(next);
    toast.success(`Jenis BBM "${name}" telah dihapus.`);
  };

  const handleResetFuelTariffs = () => {
    handleSaveFuelList(DEFAULT_FUEL_TARIFFS);
    toast.info("Tarif BBM dikembalikan ke standar awal Pertamina.");
  };

  const handleAddVehicleStandard = () => {
    if (!newVehicleForm.vehicleType.trim()) {
      toast.error("Tipe kendaraan wajib diisi!");
      return;
    }
    if (!newVehicleForm.standardKml.trim()) {
      toast.error("Standar konsumsi (km/L) wajib diisi!");
      return;
    }
    const newItem: VehicleStandardItem = {
      id: `veh-${Date.now()}`,
      vehicleType: newVehicleForm.vehicleType.trim(),
      examples: newVehicleForm.examples.trim() || "-",
      standardKml: newVehicleForm.standardKml.trim(),
    };
    const next = [...vehicleStandards, newItem];
    handleSaveVehicleList(next);
    setIsAddingVehicle(false);
    setNewVehicleForm({ vehicleType: "", examples: "", standardKml: "" });
    toast.success(`Standar kendaraan "${newItem.vehicleType}" berhasil ditambahkan!`);
  };

  const handleStartEditVehicle = (v: VehicleStandardItem) => {
    setEditingVehicleId(v.id);
    setEditVehicleForm({
      vehicleType: v.vehicleType,
      examples: v.examples,
      standardKml: v.standardKml,
    });
  };

  const handleSaveEditVehicle = (id: string) => {
    if (!editVehicleForm.vehicleType.trim()) {
      toast.error("Tipe kendaraan tidak boleh kosong!");
      return;
    }
    const next = vehicleStandards.map((v) =>
      v.id === id
        ? {
            ...v,
            vehicleType: editVehicleForm.vehicleType.trim(),
            examples: editVehicleForm.examples.trim() || "-",
            standardKml: editVehicleForm.standardKml.trim() || v.standardKml,
          }
        : v
    );
    handleSaveVehicleList(next);
    setEditingVehicleId(null);
    toast.success("Standar konsumsi armada berhasil diperbarui!");
  };

  const handleDeleteVehicleStandard = (id: string, type: string) => {
    if (vehicleStandards.length <= 1) {
      toast.error("Minimal harus menyisakan 1 standar kendaraan!");
      return;
    }
    if (!confirm(`Hapus tipe kendaraan "${type}" dari tabel?`)) return;
    const next = vehicleStandards.filter((v) => v.id !== id);
    handleSaveVehicleList(next);
    toast.success(`Standar "${type}" telah dihapus.`);
  };

  const handleResetVehicleStandards = () => {
    handleSaveVehicleList(DEFAULT_VEHICLE_STANDARDS);
    toast.info("Standar konsumsi armada dikembalikan ke standar awal.");
  };
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

  // Kota Asal & Kota Tujuan / Rute (Default Asal: Kediri, Jawa Timur)
  const [originCity, setOriginCity] = useState("Kediri");
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
  const [tripType, setTripType] = useState<"single" | "round_trip">("single");
  const [startKm, setStartKm] = useState<number | string>(12000);
  const [endKm, setEndKm] = useState<number | string>(12000);
  const [manualDistance, setManualDistance] = useState<number | string>(0);

  // Otomatis hitung jarak sesuai lokasi aplikasi (Kediri)
  const [isAutoDistance, setIsAutoDistance] = useState(false);
  const [autoDistanceNote, setAutoDistanceNote] = useState("");
  const [userHasCustomKm, setUserHasCustomKm] = useState(false);

  // Otomatis hitung jarak ke kota tujuan jika KM belum di-input manual
  useEffect(() => {
    if (!destination) {
      setIsAutoDistance(false);
      return;
    }
    const mult = tripType === "round_trip" ? 2 : 1;
    if (!userHasCustomKm || !manualDistance || manualDistance === 0) {
      const autoDist = getAutoDistanceForDestination(destination, originCity, destinations, mult);
      if (autoDist && autoDist > 0) {
        setManualDistance(autoDist);
        const s = Number(startKm) || 12000;
        setEndKm(s + autoDist);
        setIsAutoDistance(true);
        const parsed = parseRouteString(destination, originCity);
        const tripLabel = mult === 2 || parsed.isRoundTrip ? "PP" : "1x jalan";
        setAutoDistanceNote(`± ${autoDist} KM (${originCity} ➔ ${parsed.cleanDestination || destination}, ${tripLabel})`);
      }
    }
  }, [destination, originCity, destinations, userHasCustomKm, startKm, tripType]);

  const handleRecalculateAutoDistance = (
    targetCity?: string,
    baseCity?: string,
    forceTripType?: "single" | "round_trip"
  ) => {
    const cityToLookup = targetCity || destination;
    const fromCity = baseCity || originCity || "Kediri";
    const effectiveTripType = forceTripType || tripType;
    const mult = effectiveTripType === "round_trip" ? 2 : 1;

    if (!cityToLookup) {
      toast.error("Pilih atau ketik kota tujuan terlebih dahulu!");
      return;
    }
    const autoDist = getAutoDistanceForDestination(cityToLookup, fromCity, destinations, mult);
    if (autoDist && autoDist > 0) {
      setManualDistance(autoDist);
      const s = Number(startKm) || 12000;
      setEndKm(s + autoDist);
      setIsAutoDistance(true);
      setUserHasCustomKm(false);
      const parsed = parseRouteString(cityToLookup, fromCity);
      const tripLabel = mult === 2 || parsed.isRoundTrip ? "PP" : "1x jalan";
      setAutoDistanceNote(`± ${autoDist} KM (${fromCity} ➔ ${parsed.cleanDestination || cityToLookup}, ${tripLabel})`);
      toast.success(`Jarak ${fromCity} ke ${parsed.cleanDestination || cityToLookup} (${tripLabel}) otomatis dihitung: ± ${autoDist} KM`);
    } else {
      toast.info(`Jarak ke "${cityToLookup}" belum terdaftar. Silakan masukkan KM secara manual.`);
    }
  };

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

  const POPULAR_DESTINATIONS_FROM_KEDIRI = useMemo(
    () => [
      "Surabaya",
      "Malang",
      "Nganjuk",
      "Tulungagung",
      "Blitar",
      "Jombang",
      "Trenggalek",
      "Madiun",
      "Batu",
      "Mojokerto",
      "Sidoarjo",
      "Gresik",
      "Pasuruan",
      "Probolinggo",
      "Ngawi",
      "Magetan",
      "Ponorogo",
      "Lamongan",
      "Bojonegoro",
      "Tuban",
      "Pacitan",
      "Lumajang",
      "Jember",
      "Banyuwangi",
      "Solo",
      "Yogyakarta",
      "Semarang",
      "Jakarta",
      "Bandara Dhoho Kediri",
      "Bandara Juanda Surabaya",
      "Pare",
      "Kertosono",
    ],
    []
  );

  const masterCities = useMemo(() => {
    const set = new Set<string>();
    POPULAR_DESTINATIONS_FROM_KEDIRI.forEach((c) => set.add(c));
    destinations.forEach((d: any) => d.city && set.add(d.city));
    INDONESIA_CITIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [destinations, POPULAR_DESTINATIONS_FROM_KEDIRI]);

  const filteredCities = useMemo(() => {
    if (!citySearch) {
      const popularSet = new Set(POPULAR_DESTINATIONS_FROM_KEDIRI.map((c) => c.toLowerCase()));
      const others = masterCities.filter((c) => !popularSet.has(c.toLowerCase())).sort();
      return [...POPULAR_DESTINATIONS_FROM_KEDIRI, ...others];
    }
    return masterCities
      .filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(citySearch.toLowerCase());
        const bStarts = b.toLowerCase().startsWith(citySearch.toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });
  }, [masterCities, citySearch, POPULAR_DESTINATIONS_FROM_KEDIRI]);

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

              {/* 3a. Kota Asal / Titik Berangkat (Default: Kediri, Jawa Timur) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Kota Asal / Titik Berangkat
                  </label>
                  <span className="text-[10px] text-cyan-400 font-medium">
                    Lokasi Anda: Kediri, Jawa Timur
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["Kediri", "Surabaya", "Jakarta"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setOriginCity(c);
                        handleRecalculateAutoDistance(destination, c, tripType);
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                        originCity.toLowerCase() === c.toLowerCase()
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                          : "bg-surface-900 text-surface-400 border border-surface-700 hover:text-white"
                      )}
                    >
                      {c === "Kediri" ? "📍 Kediri (Lokasi Anda)" : c}
                    </button>
                  ))}
                  <input
                    type="text"
                    placeholder="Kota asal lain..."
                    value={originCity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOriginCity(val);
                      if (destination) {
                        handleRecalculateAutoDistance(destination, val, tripType);
                      }
                    }}
                    className="flex-1 min-w-[120px] px-3 py-1.5 bg-surface-900 border border-surface-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* 3b. Kota Tujuan / Destinasi & Tipe Perjalanan (Sekali Jalan / PP) */}
              <div ref={cityDropdownRef} className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Kota Tujuan / Destinasi
                  </label>
                  {/* Tipe Rute Toggle: Sekali Jalan vs PP */}
                  <div className="flex items-center gap-1 bg-surface-900 p-0.5 rounded-lg border border-surface-700">
                    <button
                      type="button"
                      onClick={() => {
                        setTripType("single");
                        if (destination) {
                          handleRecalculateAutoDistance(destination, originCity, "single");
                        }
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                        tripType === "single"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-surface-400 hover:text-white"
                      )}
                    >
                      ➔ 1x Jalan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTripType("round_trip");
                        if (destination) {
                          handleRecalculateAutoDistance(destination, originCity, "round_trip");
                        }
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                        tripType === "round_trip"
                          ? "bg-amber-400 text-slate-950 shadow-sm"
                          : "text-surface-400 hover:text-white"
                      )}
                    >
                      ⇄ Pulang-Pergi (PP)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Pilih atau ketik kota tujuan (cth: Surabaya, Malang, Nganjuk)..."
                    value={destination}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDestination(val);
                      setCitySearch(val);
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
                        setManualDistance(0);
                        const s = Number(startKm) || 12000;
                        setEndKm(s);
                        setIsAutoDistance(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Destinasi Populer dari Kediri */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-surface-400 font-medium block">
                    Destinasi Populer dari Kediri (Klik langsung hitung akurat):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { name: "Surabaya", baseKm: 120 },
                      { name: "Malang", baseKm: 88 },
                      { name: "Nganjuk", baseKm: 32 },
                      { name: "Tulungagung", baseKm: 32 },
                      { name: "Blitar", baseKm: 42 },
                      { name: "Jombang", baseKm: 45 },
                      { name: "Trenggalek", baseKm: 52 },
                      { name: "Madiun", baseKm: 76 },
                      { name: "Batu", baseKm: 82 },
                      { name: "Mojokerto", baseKm: 75 },
                      { name: "Sidoarjo", baseKm: 105 },
                      { name: "Solo", baseKm: 175 },
                      { name: "Semarang", baseKm: 265 },
                      { name: "Jakarta", baseKm: 710 },
                      { name: "Bandara Dhoho", baseKm: 15 },
                      { name: "Bandara Juanda", baseKm: 115 },
                    ].map((item) => {
                      const dist = tripType === "round_trip" ? item.baseKm * 2 : item.baseKm;
                      const isSel = destination.toLowerCase().includes(item.name.toLowerCase());
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => {
                            setDestination(item.name);
                            setCitySearch(item.name);
                            setIsCityDropdownOpen(false);
                            setManualDistance(dist);
                            const s = Number(startKm) || 12000;
                            setEndKm(s + dist);
                            setIsAutoDistance(true);
                            setUserHasCustomKm(false);
                            setAutoDistanceNote(
                              `± ${dist} KM (${originCity} ➔ ${item.name}, ${tripType === "round_trip" ? "PP" : "1x jalan"})`
                            );
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] border transition-all cursor-pointer flex items-center gap-1",
                            isSel
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold"
                              : "bg-surface-900 text-surface-400 border-surface-800 hover:text-white hover:border-surface-600"
                          )}
                        >
                          <span>{item.name}</span>
                          <span className="font-mono text-cyan-400 font-semibold">{dist} km</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isCityDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl shadow-black max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/60">
                    {filteredCities.length > 0 ? (
                      filteredCities.slice(0, 35).map((city) => {
                        const mult = tripType === "round_trip" ? 2 : 1;
                        const autoDist = getAutoDistanceForDestination(city, originCity, destinations, mult);
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setDestination(city);
                              setCitySearch(city);
                              setIsCityDropdownOpen(false);
                              if (autoDist && autoDist > 0) {
                                setManualDistance(autoDist);
                                const s = Number(startKm) || 12000;
                                setEndKm(s + autoDist);
                                setIsAutoDistance(true);
                                setUserHasCustomKm(false);
                                setAutoDistanceNote(
                                  `± ${autoDist} KM (${originCity} ➔ ${city}, ${mult === 2 ? "PP" : "1x jalan"})`
                                );
                              }
                            }}
                            className="w-full text-left px-3.5 py-2 text-sm text-surface-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                          >
                            <span className="font-medium text-white">{city}</span>
                            {autoDist && autoDist > 0 && (
                              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                                ± {autoDist} KM ({mult === 2 ? "PP" : "1x"} dari {originCity})
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

                {/* Status Jarak Otomatis Sesuai Lokasi Asal & Tujuan */}
                {destination && (
                  <div className="flex items-center justify-between mt-1 text-[11px] px-0.5">
                    {isAutoDistance ? (
                      <span className="text-cyan-400 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                        Jarak otomatis: <strong className="text-white font-mono">{manualDistance} KM</strong> ({autoDistanceNote})
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        Jarak perjalanan: <strong className="text-white font-mono">{effectiveDistance} KM</strong> ({originCity} ➔ {destination})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRecalculateAutoDistance(destination, originCity, tripType)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 ml-auto cursor-pointer"
                      title={`Hitung otomatis jarak dari ${originCity} ke ${destination}`}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Hitung Ulang Jarak
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Menu Standar Konsumsi BBM per KM & Perhitungan Otomatis */}
              <div className="sm:col-span-2 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-[#0c1427] to-slate-900/95 border border-slate-700/80 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Gauge className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Standar Konsumsi BBM per KM (km/L)
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                          Otomatis Dihitung
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Pilih kategori efisiensi armada operasional atau tentukan standar km per liter.
                      </p>
                    </div>
                  </div>

                  {/* Ringkasan Cepat Konsumsi & Biaya per KM */}
                  <div className="flex items-center gap-2">
                    <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Konsumsi per KM</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {(1 / (Number(standardKml) || 10)).toFixed(3)} L / KM
                      </span>
                    </div>
                    <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Biaya per KM</span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {formatRp(Math.round((fuelPrice || 10000) / (Number(standardKml) || 10)))} / KM
                      </span>
                    </div>
                  </div>
                </div>



                {/* Input Manual km/L & Live Perhitungan Otomatis */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Ketik Manual Standar km/L
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="50"
                        value={standardKml}
                        onChange={(e) => setStandardKml(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="cth: 12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                        km/Liter
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      1 Liter BBM menempuh {standardKml} KM ({(1 / (Number(standardKml) || 10)).toFixed(3)} L / KM)
                    </span>
                  </div>

                  {/* Panel Hasil Perhitungan Otomatis Real-Time */}
                  <div className="sm:col-span-2 grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 items-center">
                    <div className="p-2 rounded-lg bg-slate-900/90 text-center">
                      <span className="text-[10px] text-slate-400 block">Jarak Rute</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-white">
                        {effectiveDistance} KM
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/90 text-center">
                      <span className="text-[10px] text-slate-400 block">Estimasi BBM</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-cyan-400">
                        ± {effectiveFuelUsed} L
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                      <span className="text-[10px] text-amber-300 block">Estimasi Biaya</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-amber-400">
                        {formatRp(effectiveFuelCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Pilihan Jenis BBM & Harga per Liter (Dinamis dari fuelTariffs) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">
                    Jenis BBM & Harga / Liter
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-amber-400 font-bold">{formatRp(fuelPrice)} / L</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceTab("fuel");
                        setShowTariffReference(true);
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 transition-colors"
                      title="Buka tabel referensi untuk mengubah harga atau menambah jenis BBM"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      Edit / Kelola Tarif
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {fuelTariffs.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFuelType(f.name);
                        setFuelPrice(f.price);
                      }}
                      className={cn(
                        "py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between",
                        fuelType === f.name
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md ring-1 ring-amber-500/30"
                          : "bg-surface-900 text-surface-400 border-surface-700/80 hover:text-white hover:border-surface-600 hover:bg-surface-850"
                      )}
                      title={`${f.name} - ${formatRp(f.price)}`}
                    >
                      <span className="font-semibold text-xs truncate w-full">{f.name}</span>
                      <span className="font-mono text-[11px] font-bold text-amber-400 mt-1">{formatRp(f.price)}</span>
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
                  <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Jarak Tempuh (KM) <span className="text-red-400">*</span></span>
                    {isAutoDistance && (
                      <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-mono font-normal">
                        Otomatis Lokasi
                      </span>
                    )}
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
                        onChange={(e) => {
                          setStartKm(e.target.value);
                          setUserHasCustomKm(true);
                          setIsAutoDistance(false);
                        }}
                        placeholder="KM Awal"
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-surface-400 block mb-0.5">KM Akhir</span>
                      <input
                        type="number"
                        value={endKm}
                        onChange={(e) => {
                          setEndKm(e.target.value);
                          setUserHasCustomKm(true);
                          setIsAutoDistance(false);
                        }}
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
                      onChange={(e) => {
                        setManualDistance(e.target.value);
                        setUserHasCustomKm(true);
                        setIsAutoDistance(false);
                      }}
                      placeholder="Total Jarak dalam KM"
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-700 text-white rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <p className="text-cyan-400 font-mono font-medium">
                    Total Jarak: <strong>{effectiveDistance} KM</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRecalculateAutoDistance()}
                    className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Hitung otomatis jarak sesuai kota tujuan dari lokasi aplikasi"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Hitung Sesuai Lokasi Aplikasi
                  </button>
                </div>
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
      {/* MODAL: TABEL STANDAR KENDARAAN & TARIF BBM (BISA EDIT & TAMBAH) */}
      {/* ======================================================== */}
      {showTariffReference && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in p-3 sm:p-6 flex items-center justify-center">
          <div className="bg-[#0f172a] border border-slate-700/80 w-full max-w-4xl rounded-2xl shadow-2xl shadow-black/90 flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Header Modal - Sticky */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Fuel className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Tabel Standar Kendaraan & Tarif Resmi BBM
                    </h3>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      Bisa Edit & Tambah
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pedoman harga resmi BBM Pertamina dan standar konsumsi armada operasional (km/L).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTariffReference(false);
                  setIsAddingFuel(false);
                  setIsAddingVehicle(false);
                  setEditingFuelId(null);
                  setEditingVehicleId(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header / Navigasi Tampilan Tab */}
            <div className="shrink-0 px-5 sm:px-6 py-2.5 bg-[#0b1324] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setReferenceTab("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
                    referenceTab === "all" ? "bg-amber-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
                  )}
                >
                  Semua Tabel ({fuelTariffs.length + vehicleStandards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReferenceTab("fuel")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    referenceTab === "fuel" ? "bg-amber-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Fuel className="w-3.5 h-3.5" />
                  Tarif BBM ({fuelTariffs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReferenceTab("vehicle")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    referenceTab === "vehicle" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Car className="w-3.5 h-3.5" />
                  Standar Konsumsi ({vehicleStandards.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Kembalikan seluruh daftar BBM dan standar konsumsi armada ke data awal?")) {
                      handleResetFuelTariffs();
                      handleResetVehicleStandards();
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-amber-500/30 transition-all cursor-pointer bg-slate-900/50"
                  title="Kembalikan tabel ke data default Pertamina dan pabrikan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-7 custom-scrollbar">
              {/* ==================================================== */}
              {/* TABEL 1: DAFTAR TARIF RESMI BAHAN BAKAR MINYAK (BBM) */}
              {/* ==================================================== */}
              {(referenceTab === "all" || referenceTab === "fuel") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      1. Daftar Tarif Resmi Bahan Bakar (BBM)
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-mono font-normal">
                        {fuelTariffs.length} Jenis
                      </span>
                    </h4>

                    <button
                      type="button"
                      onClick={() => setIsAddingFuel(!isAddingFuel)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium",
                        isAddingFuel
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                      )}
                    >
                      {isAddingFuel ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Batal Tambah
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Jenis BBM
                        </>
                      )}
                    </button>
                  </div>

                  {/* Form Tambah BBM Baru */}
                  {isAddingFuel && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3 animate-fade-in shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Form Tambah Jenis BBM Baru
                        </span>
                        <span className="text-[11px] text-slate-400">Isi data kemudian klik Simpan</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Nama BBM <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="cth: Pertamax Green 95"
                            value={newFuelForm.name}
                            onChange={(e) => setNewFuelForm({ ...newFuelForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Kategori / Oktan
                          </label>
                          <input
                            type="text"
                            placeholder="cth: RON 95 / Bioetanol"
                            value={newFuelForm.category}
                            onChange={(e) => setNewFuelForm({ ...newFuelForm, category: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Harga / Liter (Rp) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="cth: 13900"
                            value={newFuelForm.price || ""}
                            onChange={(e) => setNewFuelForm({ ...newFuelForm, price: Number(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingFuel(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleAddFuel}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center gap-1.5 shadow cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Simpan Jenis BBM
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabel Data BBM */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#0f172a] text-slate-300 font-semibold uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Jenis Bahan Bakar</th>
                          <th className="px-4 py-3">Oktan / Kategori</th>
                          <th className="px-4 py-3 text-right">Harga Resmi / Liter</th>
                          <th className="px-4 py-3 text-center w-28">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-200">
                        {fuelTariffs.map((f) => {
                          const isEditing = editingFuelId === f.id;
                          return (
                            <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                              {isEditing ? (
                                <>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={editFuelForm.name}
                                      onChange={(e) => setEditFuelForm({ ...editFuelForm, name: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 rounded text-white text-xs focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={editFuelForm.category}
                                      onChange={(e) => setEditFuelForm({ ...editFuelForm, category: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 rounded text-white text-xs focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="number"
                                      value={editFuelForm.price}
                                      onChange={(e) => setEditFuelForm({ ...editFuelForm, price: Number(e.target.value) || 0 })}
                                      className="w-28 px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 rounded text-amber-400 font-mono font-bold text-xs text-right focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditFuel(f.id)}
                                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                                        title="Simpan Perubahan"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingFuelId(null)}
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                        title="Batal"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2.5 font-medium text-white flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    {f.name}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-400">{f.category || "BBM Standar Nasional"}</td>
                                  <td className="px-4 py-2.5 text-right font-bold font-mono text-amber-400">
                                    {formatRp(f.price)}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditFuel(f)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="Edit Tarif"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteFuel(f.id, f.name)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                        title="Hapus Jenis BBM"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* TABEL 2: STANDAR KONSUMSI BBM KENDARAAN (KM/L)      */}
              {/* ==================================================== */}
              {(referenceTab === "all" || referenceTab === "vehicle") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      2. Standar Konsumsi BBM Kendaraan (km/L)
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-normal">
                        {vehicleStandards.length} Kategori
                      </span>
                    </h4>

                    <button
                      type="button"
                      onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium",
                        isAddingVehicle
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25"
                      )}
                    >
                      {isAddingVehicle ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Batal Tambah
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Tipe Kendaraan
                        </>
                      )}
                    </button>
                  </div>

                  {/* Form Tambah Standar Kendaraan Baru */}
                  {isAddingVehicle && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3 animate-fade-in shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Form Tambah Kategori Standar Armada
                        </span>
                        <span className="text-[11px] text-slate-400">Isi tipe dan estimasi standar km/L</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Tipe Kendaraan <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="cth: SUV / 4x4"
                            value={newVehicleForm.vehicleType}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vehicleType: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Contoh Armada
                          </label>
                          <input
                            type="text"
                            placeholder="cth: Fortuner, Pajero Sport"
                            value={newVehicleForm.examples}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, examples: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Standar Konsumsi <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="cth: 9 - 11 km/L"
                            value={newVehicleForm.standardKml}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, standardKml: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-semibold text-emerald-400 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingVehicle(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleAddVehicleStandard}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all flex items-center gap-1.5 shadow cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Simpan Standar Kendaraan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabel Data Standar Konsumsi */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#0f172a] text-slate-300 font-semibold uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Tipe Kendaraan</th>
                          <th className="px-4 py-3">Contoh Armada</th>
                          <th className="px-4 py-3 text-right">Standar Konsumsi</th>
                          <th className="px-4 py-3 text-center w-28">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-200">
                        {vehicleStandards.map((v) => {
                          const isEditing = editingVehicleId === v.id;
                          return (
                            <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                              {isEditing ? (
                                <>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={editVehicleForm.vehicleType}
                                      onChange={(e) => setEditVehicleForm({ ...editVehicleForm, vehicleType: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-cyan-500/50 rounded text-white text-xs focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={editVehicleForm.examples}
                                      onChange={(e) => setEditVehicleForm({ ...editVehicleForm, examples: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-cyan-500/50 rounded text-white text-xs focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="text"
                                      value={editVehicleForm.standardKml}
                                      onChange={(e) => setEditVehicleForm({ ...editVehicleForm, standardKml: e.target.value })}
                                      className="w-28 px-2.5 py-1.5 bg-slate-900 border border-cyan-500/50 rounded text-emerald-400 font-semibold text-xs text-right focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditVehicle(v.id)}
                                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                                        title="Simpan Perubahan"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingVehicleId(null)}
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                        title="Batal"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2.5 font-medium text-white flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    {v.vehicleType}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-400">{v.examples}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-emerald-400">
                                    {v.standardKml}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditVehicle(v)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="Edit Standar"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteVehicleStandard(v.id, v.vehicleType)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                        title="Hapus Standar"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal - Sticky */}
            <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Perubahan disimpan otomatis di browser & langsung terintegrasi dengan Kalkulator BBM.</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowTariffReference(false);
                  setIsAddingFuel(false);
                  setIsAddingVehicle(false);
                  setEditingFuelId(null);
                  setEditingVehicleId(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer ml-auto"
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
