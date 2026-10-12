/**
 * Helper modul kalkulasi, evaluasi anomali, dan rumus standar BBM
 * Sesuai spesifikasi Monitoring BBM & Deteksi Anomali Trans KP
 */

export interface FuelCalculationInput {
  odoDistance: number;     // Jarak tempuh (km) = end_km - start_km
  fuelUsed: number;        // Liter BBM terpakai
  fuelCost: number;        // Total rupiah pembelian BBM
  standardKml?: number | null; // Standar km/L kendaraan
  gpsDistance?: number | null; // Jarak GPS (jika ada sensor)
}

export interface FuelCalculationResult {
  actualKml: number;       // Jarak (km) / BBM terpakai (liter)
  actualL100km: number;    // (BBM terpakai / Jarak) * 100
  costPerKm: number;       // Total biaya BBM / Jarak
  diffKml: number;         // actualKml - standardKml
  diffPercent: number;     // % deviasi terhadap standar (positif = lebih boros dari standar)
  anomalyStatus: "normal" | "perlu_diperiksa" | "indikasi_anomali";
  detectedAnomalies: {
    type: string;
    title: string;
    description: string;
    severity: "info" | "warning" | "critical";
    diffValue: string;
  }[];
}

export interface ThresholdConfig {
  maxConsumptionDiffPercent: number; // default 20%
  suddenDropLiter: number;           // default 5 Liter
  maxGpsOdoDiffPercent: number;      // default 15%
  offlineTimeoutMinutes: number;     // default 60 menit
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  maxConsumptionDiffPercent: 20.0,
  suddenDropLiter: 5.0,
  maxGpsOdoDiffPercent: 15.0,
  offlineTimeoutMinutes: 60,
};

/**
 * Menghitung konsumsi BBM dan mengevaluasi anomali secara otomatis
 */
export function calculateFuelMetrics(
  input: FuelCalculationInput,
  config: ThresholdConfig = DEFAULT_THRESHOLDS
): FuelCalculationResult {
  const { odoDistance, fuelUsed, fuelCost, standardKml, gpsDistance } = input;

  // 1. Konsumsi km/liter = Jarak tempuh (km) / BBM terpakai (liter)
  const actualKml =
    odoDistance > 0 && fuelUsed > 0
      ? Number((odoDistance / fuelUsed).toFixed(2))
      : 0;

  // 2. Liter/100 km = (BBM terpakai / Jarak tempuh) * 100
  const actualL100km =
    odoDistance > 0 && fuelUsed > 0
      ? Number(((fuelUsed / odoDistance) * 100).toFixed(2))
      : 0;

  // 3. Biaya per km = Total biaya BBM / Jarak tempuh
  const costPerKm =
    odoDistance > 0 && fuelCost > 0
      ? Math.round(fuelCost / odoDistance)
      : 0;

  // 4. Selisih thd standar kendaraan
  let diffKml = 0;
  let diffPercent = 0; // % pemborosan dibandingkan standar

  if (standardKml && standardKml > 0 && actualKml > 0) {
    diffKml = Number((actualKml - standardKml).toFixed(2));
    // Jika standar 10 km/L dan aktual 7 km/L, pemborosan = (10 - 7)/10 * 100 = 30%
    diffPercent = Number((((standardKml - actualKml) / standardKml) * 100).toFixed(1));
  }

  // 5. Evaluasi Anomali
  const detectedAnomalies: FuelCalculationResult["detectedAnomalies"] = [];

  // A. Konsumsi BBM melebihi batas standar toleransi
  if (standardKml && standardKml > 0 && diffPercent > config.maxConsumptionDiffPercent) {
    const isCritical = diffPercent >= config.maxConsumptionDiffPercent * 1.8;
    detectedAnomalies.push({
      type: "konsumsi_melebihi_standar",
      title: "Indikasi Konsumsi BBM Melebihi Standar",
      description: `Konsumsi aktual (${actualKml} km/L) lebih boros ${diffPercent}% dibandingkan standar kendaraan (${standardKml} km/L).`,
      severity: isCritical ? "critical" : "warning",
      diffValue: `+${diffPercent}% deviasi (${Math.abs(diffKml)} km/L lebih boros)`,
    });
  }

  // B. Selisih Jarak GPS vs Odometer
  if (gpsDistance && gpsDistance > 0 && odoDistance > 0) {
    const diffKm = Math.abs(odoDistance - gpsDistance);
    const maxDist = Math.max(odoDistance, gpsDistance);
    const diffGpsPercent = Number(((diffKm / maxDist) * 100).toFixed(1));

    if (diffGpsPercent > config.maxGpsOdoDiffPercent) {
      const isCritical = diffGpsPercent >= 30;
      detectedAnomalies.push({
        type: "selisih_gps_odometer",
        title: "Indikasi Selisih Jarak Odometer vs GPS",
        description: `Jarak odometer manual (${odoDistance} km) berselisih ${diffKm.toFixed(1)} km (${diffGpsPercent}%) terhadap perekaman jarak GPS (${gpsDistance.toFixed(1)} km).`,
        severity: isCritical ? "critical" : "warning",
        diffValue: `Selisih ${diffKm.toFixed(1)} km (${diffGpsPercent}%)`,
      });
    }
  }

  // Menentukan status akhir
  let anomalyStatus: "normal" | "perlu_diperiksa" | "indikasi_anomali" = "normal";
  if (detectedAnomalies.some((a) => a.severity === "critical")) {
    anomalyStatus = "indikasi_anomali";
  } else if (detectedAnomalies.some((a) => a.severity === "warning")) {
    anomalyStatus = "perlu_diperiksa";
  }

  return {
    actualKml,
    actualL100km,
    costPerKm,
    diffKml,
    diffPercent,
    anomalyStatus,
    detectedAnomalies,
  };
}

/**
 * Format mata uang Rupiah
 */
export function formatRp(val: number): string {
  return "Rp " + Math.round(val || 0).toLocaleString("id-ID");
}
