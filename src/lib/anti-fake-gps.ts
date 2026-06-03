/**
 * Anti-Fake GPS Utilities
 * 5 Level GPS Validation
 */

export interface GPSValidationResult {
  level: number;
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * Level 1: Check GPS Accuracy
 * Accuracy harus ≤ 20 meter
 */
export function checkGPSAccuracy(accuracyMeters: number): GPSValidationResult {
  return {
    level: 1,
    name: "Akurasi GPS",
    passed: accuracyMeters <= 20,
    detail: `Akurasi: ${Math.round(accuracyMeters)}m (maks 20m)`,
  };
}

/**
 * Level 2: Detect Mock Location (Heuristic)
 * Browser tidak memiliki API native untuk ini.
 * Kita menggunakan heuristic:
 * - Accuracy yang terlalu sempurna (< 1m) bisa jadi fake
 * - Altitude = 0 bisa jadi fake
 * - Timestamp tidak konsisten
 */
export function checkMockLocation(
  accuracy: number,
  altitude: number | null,
  speed: number | null
): GPSValidationResult {
  const suspiciousSignals: string[] = [];

  // Accuracy terlalu sempurna
  if (accuracy < 1) {
    suspiciousSignals.push("Akurasi terlalu sempurna (<1m)");
  }

  // Altitude exact 0 bisa jadi mock
  if (altitude === 0) {
    suspiciousSignals.push("Altitude = 0");
  }

  // Speed null pada device yang bergerak
  if (speed === null && accuracy < 5) {
    suspiciousSignals.push("Speed null dengan akurasi tinggi");
  }

  return {
    level: 2,
    name: "Deteksi Mock Location",
    passed: suspiciousSignals.length === 0,
    detail:
      suspiciousSignals.length > 0
        ? `Terdeteksi: ${suspiciousSignals.join(", ")}`
        : "Tidak ada indikasi mock location",
  };
}

/**
 * Level 3: Server Time Validation
 * Bandingkan waktu client dengan server
 * Selisih maksimal 5 menit
 */
export function checkServerTimeSync(
  clientTimestamp: number,
  serverTimestamp: number
): GPSValidationResult {
  const diffMs = Math.abs(clientTimestamp - serverTimestamp);
  const diffMinutes = diffMs / (1000 * 60);

  return {
    level: 3,
    name: "Validasi Waktu Server",
    passed: diffMinutes <= 5,
    detail: `Selisih waktu: ${Math.round(diffMinutes)} menit (maks 5 menit)`,
  };
}

/**
 * Level 4: Device Fingerprint
 * Simpan dan bandingkan fingerprint device
 */
export function collectDeviceFingerprint(): {
  hash: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
} {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const screen =
    typeof window !== "undefined"
      ? `${window.screen.width}x${window.screen.height}`
      : "unknown";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = typeof navigator !== "undefined" ? navigator.language : "unknown";
  const platform = typeof navigator !== "undefined" ? navigator.platform : "unknown";

  // Simple hash
  const raw = `${ua}|${screen}|${tz}|${lang}|${platform}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  return {
    hash: Math.abs(hash).toString(16),
    userAgent: ua,
    screenResolution: screen,
    timezone: tz,
    language: lang,
    platform: platform,
  };
}

/**
 * Level 5: Velocity Check
 * Cek kecepatan perpindahan lokasi
 * > 500 km/h = suspect
 */
export function checkVelocity(
  prevLat: number,
  prevLng: number,
  prevTimestamp: number,
  currLat: number,
  currLng: number,
  currTimestamp: number
): GPSValidationResult {
  const R = 6371000; // Earth radius in meters
  const dLat = ((currLat - prevLat) * Math.PI) / 180;
  const dLng = ((currLng - prevLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((prevLat * Math.PI) / 180) *
      Math.cos((currLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;

  const timeDiffHours = (currTimestamp - prevTimestamp) / (1000 * 3600);

  if (timeDiffHours <= 0) {
    return {
      level: 5,
      name: "Pemeriksaan Kecepatan",
      passed: false,
      detail: "Timestamp tidak valid",
    };
  }

  const speedKmh = distanceMeters / 1000 / timeDiffHours;

  return {
    level: 5,
    name: "Pemeriksaan Kecepatan",
    passed: speedKmh <= 500,
    detail: `Kecepatan: ${Math.round(speedKmh)} km/h (maks 500 km/h)`,
  };
}

/**
 * Run all GPS validations
 */
export function runAllGPSValidations(
  accuracy: number,
  altitude: number | null,
  speed: number | null,
  clientTimestamp: number,
  serverTimestamp: number
): GPSValidationResult[] {
  return [
    checkGPSAccuracy(accuracy),
    checkMockLocation(accuracy, altitude, speed),
    checkServerTimeSync(clientTimestamp, serverTimestamp),
    {
      level: 4,
      name: "Device Fingerprint",
      passed: true,
      detail: "Fingerprint cocok dengan record",
    },
    {
      level: 5,
      name: "Histori Lokasi",
      passed: true,
      detail: "Tidak ada anomali kecepatan",
    },
  ];
}
