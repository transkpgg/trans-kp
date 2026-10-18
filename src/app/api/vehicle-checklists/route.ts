import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import prisma from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-trans-kp-2024'
);

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload.id) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        nik: true,
        full_name: true,
        username: true,
        role: true,
        jabatan: true,
      }
    });
    return user;
  } catch (e) {
    return null;
  }
}

// GET /api/vehicle-checklists
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const isTeknisi = user.jabatan === 'Teknisi';
    const isMaintenanceAdmin = user.jabatan === 'Admin Perawatan Kendaraan';
    const isSuperAdmin = user.role === 'super_admin';

    // Akses hanya untuk Teknisi, Admin Perawatan Kendaraan, dan Super Admin
    if (!isTeknisi && !isMaintenanceAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { message: 'Akses ditolak: Menu ini khusus untuk Teknisi dan Admin Perawatan Kendaraan' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const nopol = searchParams.get('nopol');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (nopol) {
      where.nopol = { contains: nopol, mode: 'insensitive' };
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.date.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    if (search) {
      where.OR = [
        { nopol: { contains: search, mode: 'insensitive' } },
        { driver_name: { contains: search, mode: 'insensitive' } },
        { technician_name: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { general_notes: { contains: search, mode: 'insensitive' } },
        { checklist_no: { contains: search, mode: 'insensitive' } },
      ];
    }

    const checklists = await prisma.vehicleChecklist.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        technician: {
          select: {
            id: true,
            nik: true,
            full_name: true,
            username: true,
          }
        }
      }
    });

    return NextResponse.json(checklists);
  } catch (error: any) {
    console.error('Error fetching vehicle checklists:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/vehicle-checklists
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const isTeknisi = user.jabatan === 'Teknisi';
    const isMaintenanceAdmin = user.jabatan === 'Admin Perawatan Kendaraan';
    const isSuperAdmin = user.role === 'super_admin';

    if (!isTeknisi && !isMaintenanceAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { message: 'Akses ditolak: Hanya Teknisi atau Admin Perawatan yang dapat membuat ceklis' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      date,
      inspection_time,
      nopol,
      kilometer,
      fuel_level,
      destination,
      
      // 1. Kondisi Mesin & Cairan
      engine_oil,
      radiator_water,
      battery_water,
      power_steering_oil,
      v_belt,
      understell,
      dashboard_indicator,
      engine_condition,

      // 2. Kelengkapan
      wheel_wrench,
      jack,
      safety_triangle,
      first_aid_box,
      stnk_pkb,

      // 3. Ban Utama
      main_tire_condition,

      // 4. Ban Serep
      spare_tire_condition,

      // 5. Accesories
      ac_condition,
      radio_tape,
      cigarette_lighter,

      // 6. Lampu-Lampu
      lights_condition,
      lights_notes,

      // 7. Rem
      brake_operation,
      brake_fluid,
      hand_brake,

      // Catatan & Status
      general_notes,
      status,

      // Tanda Tangan & Personil
      driver_name,
      driver_signature,
      technician_name,
      technician_signature,
      supervisor_name,
      supervisor_signature,
    } = body;

    if (!nopol || kilometer === undefined || kilometer === null) {
      return NextResponse.json(
        { message: 'Nomor Polisi dan Posisi Kilometer wajib diisi' },
        { status: 400 }
      );
    }

    // Auto generate nomor ceklis
    const todayStr = (date ? new Date(date) : new Date()).toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await prisma.vehicleChecklist.count({
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        }
      }
    });
    const checklist_no = `CHK-${todayStr}-${String(countToday + 1).padStart(3, '0')}`;

    // Tentukan status default jika tidak dikirim:
    // Jika ada yang Rusak / Kosong / Tidak Ada -> "Perlu Perbaikan", selain itu "Baik / Laik Jalan"
    let computedStatus = status || 'Baik / Laik Jalan';
    if (!status) {
      const items = [
        engine_oil, radiator_water, battery_water, power_steering_oil,
        v_belt, understell, dashboard_indicator, engine_condition,
        wheel_wrench, jack, safety_triangle, first_aid_box, stnk_pkb,
        main_tire_condition, spare_tire_condition, ac_condition,
        radio_tape, cigarette_lighter, lights_condition,
        brake_operation, brake_fluid, hand_brake
      ];
      const hasIssue = items.some(val => val === 'Rusak' || val === 'Kosong' || val === 'Tidak Ada');
      if (hasIssue) {
        computedStatus = 'Perlu Perbaikan';
      }
    }

    const newChecklist = await prisma.vehicleChecklist.create({
      data: {
        checklist_no,
        date: date ? new Date(date) : new Date(),
        inspection_time: inspection_time || formatTimeNow(),
        nopol: String(nopol).trim().toUpperCase(),
        kilometer: parseInt(String(kilometer)),
        fuel_level: fuel_level || 'Cukup',
        destination: destination ? String(destination).trim() : null,

        engine_oil: engine_oil || 'Cukup',
        radiator_water: radiator_water || 'Cukup',
        battery_water: battery_water || 'Cukup',
        power_steering_oil: power_steering_oil || 'Cukup',
        v_belt: v_belt || 'Baik',
        understell: understell || 'Baik',
        dashboard_indicator: dashboard_indicator || 'Baik',
        engine_condition: engine_condition || 'Baik',

        wheel_wrench: wheel_wrench || 'Ada',
        jack: jack || 'Ada',
        safety_triangle: safety_triangle || 'Ada',
        first_aid_box: first_aid_box || 'Ada',
        stnk_pkb: stnk_pkb || 'Ada',

        main_tire_condition: main_tire_condition || 'Baik',
        spare_tire_condition: spare_tire_condition || 'Baik',

        ac_condition: ac_condition || 'Dingin',
        radio_tape: radio_tape || 'Baik',
        cigarette_lighter: cigarette_lighter || 'Baik',

        lights_condition: lights_condition || 'Baik',
        lights_notes: lights_notes || null,

        brake_operation: brake_operation || 'Baik',
        brake_fluid: brake_fluid || 'Baik',
        hand_brake: hand_brake || 'Baik',

        general_notes: general_notes || null,
        status: computedStatus,

        driver_name: driver_name || null,
        driver_signature: driver_signature || null,

        technician_id: isTeknisi ? user.id : (body.technician_id || null),
        technician_name: technician_name || user.full_name,
        technician_signature: technician_signature || null,

        supervisor_name: supervisor_name || null,
        supervisor_signature: supervisor_signature || null,
      }
    });

    return NextResponse.json({
      message: 'Ceklis kondisi kendaraan berhasil disimpan',
      checklist: newChecklist
    });
  } catch (error: any) {
    console.error('Error creating vehicle checklist:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

function formatTimeNow() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}.${m}`;
}
