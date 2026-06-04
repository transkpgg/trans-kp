"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Camera,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Navigation,
  Shield,
  X,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "info" | "camera" | "gps" | "success";

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function HotelCheckInPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("info");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Info
  const [hotelName, setHotelName] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2: Camera
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Step 3: GPS
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Step transitions ----
  const goToCamera = () => {
    if (!hotelName.trim()) return;
    setCurrentStep("camera");
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const confirmPhoto = () => {
    // Auto proceed to GPS step
    setCurrentStep("gps");
    startGPS();
  };

  const retakePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        const data: GPSData = { latitude, longitude, accuracy };
        setGpsData(data);
        setGpsLoading(false);
      },
      (error) => {
        setGpsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError(
              "Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser Anda, lalu coba lagi."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError(
              "Lokasi tidak tersedia. Pastikan GPS HP Anda aktif dan coba lagi."
            );
            break;
          case error.TIMEOUT:
            setGpsError(
              "Waktu pencarian GPS habis. Pastikan Anda berada di area terbuka dan coba lagi."
            );
            break;
          default:
            setGpsError("Gagal mendapatkan lokasi. Silakan coba lagi.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Force fresh location, no cache
      }
    );
  };

  const finishCheckIn = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/hotel-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_name: hotelName,
          notes: notes,
          check_in_lat: gpsData?.latitude,
          check_in_lng: gpsData?.longitude,
          selfie_check_in_url: photoPreview || "photo_captured",
        }),
      });
      if (res.ok) {
        setCurrentStep("success");
      } else {
        alert("Gagal menyimpan data check-in");
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { key: "info", label: "Info Hotel", num: 1 },
    { key: "camera", label: "Selfie", num: 2 },
    { key: "gps", label: "Lokasi GPS", num: 3 },
    { key: "success", label: "Selesai", num: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6 slide-up max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (currentStep === "info") router.back();
            else if (currentStep === "camera") {
              setCurrentStep("info");
              retakePhoto();
            }
          }}
          className={cn(
            "p-2 rounded-xl bg-surface-800 text-surface-300 hover:text-white transition-colors",
            currentStep === "gps" || currentStep === "success"
              ? "invisible"
              : ""
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Check In Hotel</h1>
          <p className="text-xs text-surface-400 mt-0.5">
            Catat kunjungan hotel perjalanan dinas
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                  i < currentStepIndex
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : i === currentStepIndex
                    ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "bg-surface-800 border-surface-700 text-surface-500"
                )}
              >
                {i < currentStepIndex ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  step.num
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  i <= currentStepIndex ? "text-white" : "text-surface-500"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 sm:w-12 h-0.5 mx-1 mb-5 rounded-full transition-colors",
                  i < currentStepIndex ? "bg-emerald-500" : "bg-surface-700"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: Info Hotel ===== */}
      {currentStep === "info" && (
        <div className="glass-card p-6 space-y-5 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-brand-500/10">
              <Building2 className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Informasi Hotel</h2>
              <p className="text-xs text-surface-400">
                Masukkan detail hotel yang dikunjungi
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-300">
              Nama Hotel <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-surface-600"
              placeholder="Contoh: Hotel Ibis Budget Surabaya"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-300">
              Catatan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-surface-900/50 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-surface-600 resize-none"
              placeholder="Rute perjalanan, tujuan, dll (opsional)"
            />
          </div>

          <button
            onClick={goToCamera}
            disabled={!hotelName.trim()}
            className="w-full gradient-brand text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            Lanjutkan
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* ===== STEP 2: Camera Selfie (Real Camera) ===== */}
      {currentStep === "camera" && (
        <div className="glass-card overflow-hidden fade-in">
          <div className="p-4 border-b border-surface-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Camera className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Foto Selfie</h2>
              <p className="text-xs text-surface-400">
                Ambil foto selfie sebagai bukti kehadiran
              </p>
            </div>
          </div>

          {/* Hidden file input for camera */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handlePhotoCapture}
            className="hidden"
          />

          <div className="relative aspect-[3/4] bg-[#0a0a0a]">
            {!photoPreview ? (
              // Show button to open camera
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
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
              // Show photo preview
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 relative">
                  <img
                    src={photoPreview}
                    alt="Selfie preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Foto Berhasil
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons when photo is taken */}
          {photoPreview && (
            <div className="p-4 grid grid-cols-2 gap-3 bg-surface-900/50">
              <button
                onClick={retakePhoto}
                className="py-3 rounded-xl border border-surface-700 text-white font-medium flex items-center justify-center gap-2 hover:bg-surface-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Ulangi
              </button>
              <button
                onClick={confirmPhoto}
                className="py-3 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2"
              >
                Lanjutkan
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 3: GPS Validation (Real GPS) ===== */}
      {currentStep === "gps" && (
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-5 fade-in">
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
              onClick={finishCheckIn}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Konfirmasi Check In
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

      {/* ===== STEP 4: Success ===== */}
      {currentStep === "success" && (
        <div className="glass-card p-8 text-center space-y-6 fade-in">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">
              Check In Berhasil!
            </h2>
            <p className="text-surface-400 mt-2">
              Kunjungan hotel telah tercatat dalam sistem.
            </p>
          </div>

          <div className="glass-card p-4 text-left space-y-3 bg-surface-900/50">
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Hotel</span>
              <span className="text-sm font-medium text-white">
                {hotelName}
              </span>
            </div>
            {notes && (
              <div className="flex justify-between">
                <span className="text-sm text-surface-400">Catatan</span>
                <span className="text-sm text-white truncate max-w-[200px]">
                  {notes}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Waktu</span>
              <span className="text-sm font-mono text-brand-400">
                {new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">GPS</span>
              <span className="text-sm text-emerald-400 font-medium">
                ✅ Terverifikasi ({gpsData?.latitude.toFixed(4)},{" "}
                {gpsData?.longitude.toFixed(4)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Selfie</span>
              <span className="text-sm text-emerald-400 font-medium">
                ✅ Tersimpan
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/hotel-visit")}
            className="w-full gradient-brand text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-500/25 transition-all"
          >
            Kembali ke Hotel
          </button>
        </div>
      )}
    </div>
  );
}
