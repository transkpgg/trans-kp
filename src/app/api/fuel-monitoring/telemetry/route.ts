import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_THRESHOLDS } from '@/lib/fuel-monitoring';

// POST /api/fuel-monitoring/telemetry - Endpoint penerimaan data IoT GPS & Sensor Tangki BBM
// Dapat dipanggil oleh GPS Tracker, OBD-II device, atau sensor level tangki
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nopol = String(body.nopol || '').trim().toUpperCase();

    if (!nopol) {
      return NextResponse.json({ message: 'Nopol kendaraan wajib disertakan' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { nopol } });
    if (!vehicle) {
      return NextResponse.json({ message: 'Kendaraan tidak ditemukan dalam master data' }, { status: 404 });
    }

    const current_fuel_level = body.current_fuel_level !== undefined ? parseFloat(body.current_fuel_level) : null;
    const latitude = body.latitude !== undefined ? parseFloat(body.latitude) : null;
    const longitude = body.longitude !== undefined ? parseFloat(body.longitude) : null;
    const vehicle_status = body.vehicle_status || 'berhenti'; // berjalan, berhenti, parkir, mesin_menyala
    const location_name = body.location_name || null;
    const tank_capacity = vehicle.tank_capacity || 60;
    const fuel_percent = current_fuel_level !== null && tank_capacity > 0
      ? Number(((current_fuel_level / tank_capacity) * 100).toFixed(1))
      : null;

    // Ambil trip aktif terakhir untuk nopol ini (jika ada)
    const latestTrip = await prisma.fuelTripLog.findFirst({
      where: { nopol },
      orderBy: { trip_date: 'desc' },
    });

    const configRow = await prisma.fuelThresholdConfig.findFirst();
    const suddenDropThreshold = configRow?.sudden_drop_liter || DEFAULT_THRESHOLDS.suddenDropLiter;

    // Evaluasi jika terjadi sudden drop saat parkir / mesin mati
    let anomalyCreated = false;
    if (
      latestTrip &&
      latestTrip.current_fuel_level !== null &&
      current_fuel_level !== null &&
      (vehicle_status === 'parkir' || vehicle_status === 'berhenti')
    ) {
      const dropAmount = latestTrip.current_fuel_level - current_fuel_level;
      if (dropAmount >= suddenDropThreshold) {
        await prisma.fuelAnomaly.create({
          data: {
            trip_id: latestTrip.id,
            nopol,
            driver_name: latestTrip.driver_name,
            anomaly_type: 'penurunan_tiba_tiba',
            title: 'Indikasi Penurunan Level BBM Tidak Wajar',
            description: `Sensor mendeteksi penurunan level BBM drastis sebesar ${dropAmount.toFixed(1)} Liter saat status kendaraan ${vehicle_status}.`,
            severity: 'critical',
            diff_value: `-${dropAmount.toFixed(1)} Liter`,
            status: 'baru',
            location_name,
            latitude,
            longitude,
          },
        });

        await prisma.fuelTripLog.update({
          where: { id: latestTrip.id },
          data: { anomaly_status: 'indikasi_anomali' },
        });

        anomalyCreated = true;
      }
    }

    // Update trip terkini dengan data telemetri terbaru
    if (latestTrip) {
      await prisma.fuelTripLog.update({
        where: { id: latestTrip.id },
        data: {
          current_fuel_level: current_fuel_level ?? latestTrip.current_fuel_level,
          fuel_percent: fuel_percent ?? latestTrip.fuel_percent,
          sensor_status: 'terhubung',
          vehicle_status,
          last_telemetry_at: new Date(),
          last_location: location_name ?? latestTrip.last_location,
          latitude: latitude ?? latestTrip.latitude,
          longitude: longitude ?? latestTrip.longitude,
          is_manual: false,
        },
      });
    }

    return NextResponse.json({
      message: 'Data telemetri berhasil diterima dan diproses',
      nopol,
      sensor_status: 'terhubung',
      current_fuel_level,
      fuel_percent,
      anomaly_detected: anomalyCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing telemetry:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
