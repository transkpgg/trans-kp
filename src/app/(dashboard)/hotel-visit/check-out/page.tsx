"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Camera,
  CheckCircle2,
  Clock,
  Building2,
  Loader2,
  RefreshCw,
  ArrowRight,
  Navigation,
  MapPin,
  Shield,
  X,
} from "lucide-react";
import useSWR from "swr";
import { cn, formatTime, getDurationString } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Step = "INFO" | "SELFIE" | "GPS" | "SUCCESS";

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

function CheckOutContent() {
  const [step, setStep] = useState<Step>("INFO");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // GPS state
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get("id");
  const { data: visits } = useSWR("/api/hotel-visits", fetcher);
  const activeVisit = visits?.find((v: any) => v.id === id);

  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmPhotoAndGetGPS = () => {
    setStep("GPS");
    startGPS();
  };

  const startGPS = () => {
    setGpsLoading(true);
    setGpsError(null);
    setGpsData(null);

    if (!navigator.geolocation) {
      setGpsError("GPS tidak didukung oleh browser/HP Anda.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsData({ latitude, longitude, accuracy });
        setGpsLoading(false);
      },
      (error) => {
        setGpsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError(
              "Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser Anda."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError(
              "Lokasi tidak tersedia. Pastikan GPS HP Anda aktif."
            );
            break;
          case error.TIMEOUT:
            setGpsError(
              "Waktu pencarian GPS habis. Coba di area terbuka."
            );
            break;
          default:
            setGpsError("Gagal mendapatkan lokasi.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/hotel-visits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_out_lat: gpsData?.latitude,
          check_out_lng: gpsData?.longitude,
          selfie_check_out_url: photoPreview || "photo_captured",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessData(data.visit);
        setStep("SUCCESS");
      } else {
        alert("Gagal melakukan check out");
      }
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeVisit && step !== "SUCCESS")
    return (
      <div className="p-8 text-white text-center">Loading...</div>
    );

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/hotel-visit")}
          className="p-2 rounded-full bg-surface-800 text-surface-200 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Check Out Hotel</h1>
      </div>

      <div className="flex items-center justify-between mb-8 px-8 relative">
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-surface-800 -z-10" />
        {[
          { key: "INFO", label: "Konfirmasi" },
          { key: "SELFIE", label: "Selfie" },
          { key: "GPS", label: "Lokasi" },
          { key: "SUCCESS", label: "Selesai" },
        ].map((s, i) => {
          const stepOrder = ["INFO", "SELFIE", "GPS", "SUCCESS"];
          const currentIndex = stepOrder.indexOf(step);
          const isPassed = currentIndex > i;
          const isActive = currentIndex === i;

          return (
            <div
              key={s.key}
              className="flex flex-col items-center gap-2 bg-surface-950 px-3"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                  isPassed
                    ? "bg-brand-500 border-brand-500 text-white"
                    : isActive
                    ? "bg-surface-950 border-brand-500 text-brand-500"
                    : "bg-surface-950 border-surface-700 text-surface-600"
                )}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold",
                  isActive || isPassed
                    ? "text-brand-400"
                    : "text-surface-600"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col justify-center slide-up">
        {/* STEP 1: INFO */}
        {step === "INFO" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-6">
                {activeVisit.hotel_name}
              </h2>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 flex justify-between items-center">
                  <div className="flex items-center gap-3 text-surface-300">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Waktu Check In
                    </span>
                  </div>
                  <span className="font-bold text-white text-sm">
                    {formatTime(activeVisit.check_in_time)} WIB
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-500">
                    Waktu Sekarang
                  </span>
                  <span className="font-bold text-amber-400">
                    {formatTime(new Date().toISOString())} WIB
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("SELFIE")}
              className="w-full py-3.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all"
            >
              Lanjutkan Check Out
            </button>
          </div>
        )}

        {/* STEP 2: SELFIE (Real Camera) */}
        {step === "SELFIE" && (
          <div className="flex flex-col items-center w-full max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-white mb-2">
              Foto Selfie Check Out
            </h2>
            <p className="text-sm text-surface-400 mb-6 text-center">
              Ambil foto selfie sebagai bukti kehadiran
            </p>

            {/* Hidden file input for camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {!photoPreview ? (
              <div className="w-full aspect-[3/4] glass-card overflow-hidden relative flex flex-col items-center justify-center gap-6">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-surface-600 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-surface-500" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-surface-300 font-medium">
                    Ambil Foto Selfie
                  </p>
                  <p className="text-xs text-surface-500 px-8">
                    Kamera depan HP Anda akan terbuka secara otomatis
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="gradient-brand text-white font-medium px-8 py-3.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-brand-500/25 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  Buka Kamera
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col fade-in">
                <div className="w-full aspect-[3/4] glass-card overflow-hidden relative bg-[#0a0a0a]">
                  <img
                    src={photoPreview}
                    alt="Selfie checkout"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Foto Berhasil
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button
                    onClick={retakePhoto}
                    className="py-3.5 rounded-xl border border-surface-700 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Ulangi
                  </button>
                  <button
                    onClick={confirmPhotoAndGetGPS}
                    className="py-3.5 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2"
                  >
                    Lanjutkan
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: GPS (Real GPS) */}
        {step === "GPS" && (
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                  <Navigation className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">
                    Validasi Lokasi GPS
                  </h2>
                  <p className="text-xs text-surface-400">
                    Melacak lokasi asli HP Anda
                  </p>
                </div>
              </div>

              {/* GPS Status */}
              <div
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  gpsData
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : gpsError
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-surface-900 border-surface-800"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className={cn(
                        "w-5 h-5",
                        gpsData
                          ? "text-emerald-400"
                          : gpsError
                          ? "text-red-400"
                          : "text-surface-400"
                      )}
                    />
                    <span className="text-sm font-medium text-white">
                      Koordinat GPS
                    </span>
                  </div>
                  {gpsLoading && (
                    <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                  )}
                  {gpsData && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                {gpsLoading && (
                  <div className="space-y-2">
                    <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full animate-pulse"
                        style={{ width: "60%" }}
                      />
                    </div>
                    <p className="text-xs text-surface-400">
                      Mencari sinyal GPS dari satelit HP Anda...
                    </p>
                  </div>
                )}
                {gpsError && (
                  <p className="text-xs text-red-400 mt-2">{gpsError}</p>
                )}
                {gpsData && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase font-semibold">
                        Latitude
                      </p>
                      <p className="text-sm font-mono text-brand-400">
                        {gpsData.latitude.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase font-semibold">
                        Longitude
                      </p>
                      <p className="text-sm font-mono text-brand-400">
                        {gpsData.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Accuracy */}
              {gpsData && (
                <div
                  className={cn(
                    "p-4 rounded-xl border fade-in",
                    gpsData.accuracy <= 50
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield
                        className={cn(
                          "w-5 h-5",
                          gpsData.accuracy <= 50
                            ? "text-emerald-400"
                            : "text-amber-400"
                        )}
                      />
                      <span className="text-sm font-medium text-white">
                        Akurasi GPS
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold font-mono",
                        gpsData.accuracy <= 50
                          ? "text-emerald-400"
                          : "text-amber-400"
                      )}
                    >
                      ±{gpsData.accuracy.toFixed(1)}m
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-2",
                      gpsData.accuracy <= 50
                        ? "text-emerald-400/70"
                        : "text-amber-400/70"
                    )}
                  >
                    {gpsData.accuracy <= 50
                      ? "✅ Akurasi baik — lokasi valid"
                      : "⚠️ Akurasi rendah — coba di area terbuka"}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {gpsData && (
              <button
                onClick={handleCheckOut}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Konfirmasi Check Out
                  </>
                )}
              </button>
            )}
            {gpsError && (
              <button
                onClick={startGPS}
                className="w-full py-3.5 rounded-xl border border-amber-500/30 text-amber-400 font-medium flex items-center justify-center gap-2 hover:bg-amber-500/10 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Coba Lagi
              </button>
            )}
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center text-center h-full fade-in">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Check Out Berhasil!
            </h2>
            <p className="text-surface-400 mb-8">
              Data telah tersimpan di sistem.
            </p>

            <div className="glass-card p-6 w-full text-left space-y-4 mb-8">
              <div>
                <p className="text-xs text-surface-500 uppercase font-semibold">
                  Nama Hotel
                </p>
                <p className="font-bold text-white mt-1 text-lg">
                  {successData?.hotel_name}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">
                    Total Durasi
                  </p>
                  <p className="font-medium text-emerald-400 mt-1">
                    {successData?.duration_minutes
                      ? getDurationString(successData.duration_minutes)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">
                    Waktu Selesai
                  </p>
                  <p className="font-medium text-white mt-1">
                    {successData?.check_out_time
                      ? formatTime(successData.check_out_time)
                      : "-"}{" "}
                    WIB
                  </p>
                </div>
              </div>
              {gpsData && (
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">
                    Lokasi GPS
                  </p>
                  <p className="font-medium text-emerald-400 mt-1 text-sm">
                    ✅ {gpsData.latitude.toFixed(4)},{" "}
                    {gpsData.longitude.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push("/hotel-visit")}
              className="w-full py-4 rounded-xl bg-surface-800 text-white font-medium hover:bg-surface-700 transition-colors block text-center"
            >
              Kembali ke Daftar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HotelCheckOutPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-white text-center">Loading...</div>
      }
    >
      <CheckOutContent />
    </Suspense>
  );
}
