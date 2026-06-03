"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Navigation,
  Shield,
  X,
  RefreshCw,
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

  // Step 1: Info
  const [hotelName, setHotelName] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2: Camera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  // Step 3: GPS
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsValidation, setGpsValidation] = useState<{
    accuracy_ok: boolean;
    mock_detected: boolean;
    server_time_ok: boolean;
    overall_valid: boolean;
  } | null>(null);

  // ---- Step transitions ----
  const goToCamera = () => {
    if (!hotelName.trim()) return;
    setCurrentStep("camera");
    // Auto-activate camera after a short delay
    setTimeout(() => setIsCameraActive(true), 500);
  };

  const confirmPhoto = () => {
    setPhotoTaken(true);
    // Auto proceed to GPS step
    setTimeout(() => {
      setCurrentStep("gps");
      startGPS();
    }, 800);
  };

  const startGPS = () => {
    setGpsLoading(true);
    setGpsValidation(null);

    // Simulate GPS acquisition
    setTimeout(() => {
      setGpsData({
        latitude: -7.257472 + (Math.random() - 0.5) * 0.002,
        longitude: 112.75209 + (Math.random() - 0.5) * 0.002,
        accuracy: Math.random() * 10 + 3,
      });
      setGpsLoading(false);

      // Then validate
      setTimeout(() => {
        setGpsValidation({
          accuracy_ok: true,
          mock_detected: false,
          server_time_ok: true,
          overall_valid: true,
        });
      }, 1500);
    }, 2000);
  };

  const finishCheckIn = () => {
    setCurrentStep("success");
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
            else if (currentStep === "camera") { setCurrentStep("info"); setIsCameraActive(false); setPhotoTaken(false); }
          }}
          className={cn("p-2 rounded-xl bg-surface-800 text-surface-300 hover:text-white transition-colors", currentStep === "gps" || currentStep === "success" ? "invisible" : "")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Check In Hotel</h1>
          <p className="text-xs text-surface-400 mt-0.5">Catat kunjungan hotel perjalanan dinas</p>
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
                  i < currentStepIndex ? "bg-emerald-500 border-emerald-500 text-white" :
                  i === currentStepIndex ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/30" :
                  "bg-surface-800 border-surface-700 text-surface-500"
                )}
              >
                {i < currentStepIndex ? <CheckCircle2 className="w-5 h-5" /> : step.num}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                i <= currentStepIndex ? "text-white" : "text-surface-500"
              )}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-8 sm:w-12 h-0.5 mx-1 mb-5 rounded-full transition-colors",
                i < currentStepIndex ? "bg-emerald-500" : "bg-surface-700"
              )} />
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
              <p className="text-xs text-surface-400">Masukkan detail hotel yang dikunjungi</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-300">Nama Hotel <span className="text-red-400">*</span></label>
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
            <label className="text-sm font-medium text-surface-300">Catatan</label>
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

      {/* ===== STEP 2: Camera Selfie ===== */}
      {currentStep === "camera" && (
        <div className="glass-card overflow-hidden fade-in">
          <div className="p-4 border-b border-surface-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Camera className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Foto Selfie</h2>
              <p className="text-xs text-surface-400">Ambil foto selfie sebagai bukti kehadiran</p>
            </div>
          </div>

          {/* Camera Viewfinder */}
          <div className="relative aspect-[3/4] bg-[#0a0a0a]">
            {isCameraActive && !photoTaken && (
              <>
                {/* Simulated camera feed - dark background with face guide */}
                <div className="absolute inset-0 bg-gradient-to-b from-surface-900/50 to-transparent" />

                {/* Face guide circle */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-44 h-56 border-2 border-dashed border-white/30 rounded-[50%] flex items-center justify-center">
                    <p className="text-white/40 text-xs text-center px-4">Posisikan wajah di dalam area ini</p>
                  </div>
                </div>

                {/* Camera info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between text-xs text-white/60 mb-4">
                    <span>📸 Kamera Depan</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* After photo taken */}
            {photoTaken && (
              <div className="absolute inset-0 bg-surface-900 flex flex-col items-center justify-center gap-4 fade-in">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-emerald-400 font-medium">Foto berhasil diambil!</p>
                <p className="text-xs text-surface-400">Mengaktifkan GPS...</p>
              </div>
            )}

            {/* Camera loading */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                <p className="text-surface-400 text-sm">Membuka kamera...</p>
              </div>
            )}
          </div>

          {/* Capture Button */}
          {isCameraActive && !photoTaken && (
            <div className="p-6 flex flex-col items-center gap-3 bg-surface-900/50">
              <button
                onClick={confirmPhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group"
              >
                <div className="w-16 h-16 rounded-full bg-white group-hover:bg-white/90 transition-colors" />
              </button>
              <p className="text-xs text-surface-400">Tekan untuk mengambil foto</p>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 3: GPS Validation ===== */}
      {currentStep === "gps" && (
        <div className="glass-card p-6 space-y-6 fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Navigation className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Validasi Lokasi GPS</h2>
              <p className="text-xs text-surface-400">Memverifikasi lokasi Anda secara otomatis</p>
            </div>
          </div>

          {/* GPS Status */}
          <div className="space-y-4">
            {/* GPS Acquisition */}
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              gpsData ? "bg-emerald-500/5 border-emerald-500/20" : "bg-surface-900 border-surface-800"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className={cn("w-5 h-5", gpsData ? "text-emerald-400" : "text-surface-400")} />
                  <span className="text-sm font-medium text-white">Koordinat GPS</span>
                </div>
                {gpsLoading && <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />}
                {gpsData && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>
              {gpsLoading && (
                <div className="space-y-2">
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                  </div>
                  <p className="text-xs text-surface-400">Mencari sinyal GPS...</p>
                </div>
              )}
              {gpsData && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <p className="text-[10px] text-surface-500 uppercase font-semibold">Latitude</p>
                    <p className="text-sm font-mono text-brand-400">{gpsData.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-surface-500 uppercase font-semibold">Longitude</p>
                    <p className="text-sm font-mono text-brand-400">{gpsData.longitude.toFixed(6)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Accuracy */}
            {gpsData && (
              <div className={cn(
                "p-4 rounded-xl border fade-in",
                gpsData.accuracy <= 15 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className={cn("w-5 h-5", gpsData.accuracy <= 15 ? "text-emerald-400" : "text-amber-400")} />
                    <span className="text-sm font-medium text-white">Akurasi GPS</span>
                  </div>
                  <span className={cn(
                    "text-sm font-bold font-mono",
                    gpsData.accuracy <= 15 ? "text-emerald-400" : "text-amber-400"
                  )}>
                    ±{gpsData.accuracy.toFixed(1)}m
                  </span>
                </div>
                <p className={cn("text-xs mt-2", gpsData.accuracy <= 15 ? "text-emerald-400/70" : "text-amber-400/70")}>
                  {gpsData.accuracy <= 15 ? "✅ Akurasi baik — lokasi valid" : "⚠️ Akurasi rendah — coba di area terbuka"}
                </p>
              </div>
            )}

            {/* Validation Checklist */}
            {gpsValidation && (
              <div className="space-y-2 fade-in">
                <p className="text-xs text-surface-400 uppercase font-semibold mb-3">Validasi Keamanan</p>
                {[
                  { label: "Akurasi GPS", ok: gpsValidation.accuracy_ok },
                  { label: "Mock Location (Fake GPS)", ok: !gpsValidation.mock_detected, invertLabel: true },
                  { label: "Sinkronisasi Waktu Server", ok: gpsValidation.server_time_ok },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-900 border border-surface-800 slide-up"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    {item.ok ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <X className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    <span className="text-sm text-white flex-1">{item.label}</span>
                    <span className={cn("text-xs font-bold", item.ok ? "text-emerald-400" : "text-red-400")}>
                      {item.ok ? (item.invertLabel ? "Tidak Terdeteksi" : "Valid") : "Gagal"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {gpsValidation && (
            <div className="space-y-3 fade-in">
              {gpsValidation.overall_valid ? (
                <button
                  onClick={finishCheckIn}
                  className="w-full gradient-brand text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-500/25 transition-all group"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Konfirmasi Check In
                </button>
              ) : (
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
            <h2 className="text-2xl font-bold text-white">Check In Berhasil!</h2>
            <p className="text-surface-400 mt-2">Kunjungan hotel telah tercatat dalam sistem.</p>
          </div>

          <div className="glass-card p-4 text-left space-y-3 bg-surface-900/50">
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Hotel</span>
              <span className="text-sm font-medium text-white">{hotelName}</span>
            </div>
            {notes && (
              <div className="flex justify-between">
                <span className="text-sm text-surface-400">Catatan</span>
                <span className="text-sm text-white truncate max-w-[200px]">{notes}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Waktu</span>
              <span className="text-sm font-mono text-brand-400">
                {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">GPS</span>
              <span className="text-sm text-emerald-400 font-medium">✅ Terverifikasi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Selfie</span>
              <span className="text-sm text-emerald-400 font-medium">✅ Tersimpan</span>
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
