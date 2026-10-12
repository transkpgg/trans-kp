import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import prisma from '@/lib/prisma';
import { calculateFuelMetrics, DEFAULT_THRESHOLDS } from '@/lib/fuel-monitoring';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-trans-kp-2024'
);

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// GET /api/fuel-monitoring/trips - Daftar perjalanan & audit BBM
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const nopol = searchParams.get('nopol');
    const driverId = searchParams.get('driverId');
    const branchId = searchParams.get('branchId');
    const anomalyStatus = searchParams.get('anomalyStatus');

    const where: any = {};

    if (startDate || endDate) {
      where.trip_date = {};
      if (startDate) where.trip_date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.trip_date.lte = end;
      }
    }

    if (nopol) where.nopol = { contains: nopol, mode: 'insensitive' };
    if (driverId) where.driver_id = driverId;
    if (branchId) where.branch_id = branchId;
    if (anomalyStatus && anomalyStatus !== 'all') where.anomaly_status = anomalyStatus;

    const trips = await prisma.fuelTripLog.findMany({
      where,
      orderBy: { trip_date: 'desc' },
      include: {
        vehicle: true,
        driver: { select: { id: true, full_name: true, nik: true } },
        anomalies: true,
      },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error('Error fetching fuel trips:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/fuel-monitoring/trips - Tambah data perjalanan & konsumsi BBM
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const nopol = String(body.nopol || '').trim().toUpperCase();
    const driver_name = String(body.driver_name || '').trim();
    const start_km = parseFloat(body.start_km);
    const end_km = parseFloat(body.end_km);
    const fuel_used = parseFloat(body.fuel_used);
    const fuel_refill = parseFloat(body.fuel_refill || 0);
    const fuel_cost = parseFloat(body.fuel_cost || 0);

    if (!nopol || !driver_name || isNaN(start_km) || isNaN(end_km) || isNaN(fuel_used)) {
      return NextResponse.json(
        { message: 'Nopol, nama pengemudi, KM awal, KM akhir, dan BBM terpakai wajib diisi' },
        { status: 400 }
      );
    }

    if (end_km < start_km) {
      return NextResponse.json(
        { message: 'Kilometer akhir tidak boleh lebih kecil dari kilometer awal' },
        { status: 400 }
      );
    }

    if (fuel_used <= 0) {
      return NextResponse.json(
        { message: 'BBM terpakai harus lebih besar dari 0 liter' },
        { status: 400 }
      );
    }

    const odo_distance = Number((end_km - start_km).toFixed(2));
    const gps_distance = body.gps_distance ? parseFloat(body.gps_distance) : null;

    // Ambil data kendaraan untuk standar konsumsi BBM & kapasitas tangki
    const vehicle = await prisma.vehicle.findUnique({ where: { nopol } });
    const standard_kml = vehicle?.fuel_consumption || (body.standard_kml ? parseFloat(body.standard_kml) : null);
    const tank_capacity = vehicle?.tank_capacity || (body.tank_capacity ? parseFloat(body.tank_capacity) : 60);

    // Ambil threshold konfigurasi dari database jika ada
    const configRow = await prisma.fuelThresholdConfig.findFirst();
    const thresholds = configRow
      ? {
          maxConsumptionDiffPercent: configRow.max_consumption_diff_percent,
          suddenDropLiter: configRow.sudden_drop_liter,
          maxGpsOdoDiffPercent: configRow.max_gps_odo_diff_percent,
          offlineTimeoutMinutes: configRow.offline_timeout_minutes,
        }
      : DEFAULT_THRESHOLDS;

    // Hitung konsumsi & anomali menggunakan formula standar
    const calculation = calculateFuelMetrics(
      {
        odoDistance: odo_distance,
        fuelUsed: fuel_used,
        fuelCost: fuel_cost,
        standardKml: standard_kml,
        gpsDistance: gps_distance,
      },
      thresholds
    );

    const fuel_start = body.fuel_start ? parseFloat(body.fuel_start) : null;
    const fuel_end = body.fuel_end ? parseFloat(body.fuel_end) : null;
    const current_fuel_level = fuel_end ?? fuel_start ?? null;
    const fuel_percent = current_fuel_level && tank_capacity > 0 ? Number(((current_fuel_level / tank_capacity) * 100).toFixed(1)) : null;

    const sensor_status = body.sensor_status || 'belum_terhubung';
    const vehicle_status = body.vehicle_status || 'berhenti';

    const trip = await prisma.fuelTripLog.create({
      data: {
        vehicle_id: vehicle?.id || null,
        nopol,
        driver_id: body.driver_id || null,
        driver_name,
        branch_id: body.branch_id || null,
        trip_date: body.trip_date ? new Date(body.trip_date) : new Date(),
        start_km,
        end_km,
        odo_distance,
        gps_distance,
        fuel_start,
        fuel_end,
        fuel_refill,
        fuel_cost,
        fuel_used,
        actual_kml: calculation.actualKml,
        actual_l100km: calculation.actualL100km,
        cost_per_km: calculation.costPerKm,
        standard_kml,
        diff_kml: calculation.diffKml,
        diff_percent: calculation.diffPercent,
        vehicle_status,
        sensor_status,
        current_fuel_level,
        tank_capacity,
        fuel_percent,
        last_telemetry_at: sensor_status === 'terhubung' ? new Date() : null,
        last_location: body.last_location || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        anomaly_status: calculation.anomalyStatus,
        calculation_method: body.calculation_method || 'full_to_full',
        receipt_url: body.receipt_url || null,
        notes: body.notes || null,
        is_manual: true,
      },
    });

    // Simpan anomali yang terdeteksi secara otomatis
    if (calculation.detectedAnomalies.length > 0) {
      for (const a of calculation.detectedAnomalies) {
        await prisma.fuelAnomaly.create({
          data: {
            trip_id: trip.id,
            nopol,
            driver_name,
            anomaly_type: a.type,
            title: a.title,
            description: a.description,
            severity: a.severity,
            diff_value: a.diffValue,
            status: 'baru',
            location_name: body.last_location || null,
            latitude: body.latitude ? parseFloat(body.latitude) : null,
            longitude: body.longitude ? parseFloat(body.longitude) : null,
          },
        });
      }
    }

    // Catat Audit Trail
    await prisma.fuelAuditLog.create({
      data: {
        entity_type: 'trip',
        entity_id: trip.id,
        action: 'create_trip',
        actor_name: (user as any).full_name || 'Admin',
        actor_nik: (user as any).nik || null,
        new_value: JSON.stringify({
          nopol,
          driver_name,
          actual_kml: calculation.actualKml,
          anomaly_status: calculation.anomalyStatus,
        }),
      },
    });

    return NextResponse.json({
      message: 'Data perjalanan dan konsumsi BBM berhasil disimpan',
      trip,
      calculation,
    });
  } catch (error) {
    console.error('Error creating fuel trip:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
