import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import prisma from '@/lib/prisma';
import { DEFAULT_THRESHOLDS } from '@/lib/fuel-monitoring';

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

// GET /api/fuel-monitoring/config - Ambil konfigurasi ambang batas anomali
export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let config = await prisma.fuelThresholdConfig.findFirst();
    if (!config) {
      config = await prisma.fuelThresholdConfig.create({
        data: {
          max_consumption_diff_percent: DEFAULT_THRESHOLDS.maxConsumptionDiffPercent,
          sudden_drop_liter: DEFAULT_THRESHOLDS.suddenDropLiter,
          max_gps_odo_diff_percent: DEFAULT_THRESHOLDS.maxGpsOdoDiffPercent,
          offline_timeout_minutes: DEFAULT_THRESHOLDS.offlineTimeoutMinutes,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/fuel-monitoring/config - Update ambang batas (Admin saja)
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const existing = await prisma.fuelThresholdConfig.findFirst();

    const data: any = {
      updated_by: (user as any).full_name || 'Admin',
    };

    if (body.max_consumption_diff_percent !== undefined) {
      data.max_consumption_diff_percent = parseFloat(body.max_consumption_diff_percent);
    }
    if (body.sudden_drop_liter !== undefined) {
      data.sudden_drop_liter = parseFloat(body.sudden_drop_liter);
    }
    if (body.max_gps_odo_diff_percent !== undefined) {
      data.max_gps_odo_diff_percent = parseFloat(body.max_gps_odo_diff_percent);
    }
    if (body.offline_timeout_minutes !== undefined) {
      data.offline_timeout_minutes = parseInt(body.offline_timeout_minutes);
    }

    let config;
    if (existing) {
      config = await prisma.fuelThresholdConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      config = await prisma.fuelThresholdConfig.create({
        data,
      });
    }

    // Catat Audit Trail
    await prisma.fuelAuditLog.create({
      data: {
        entity_type: 'config',
        entity_id: config.id,
        action: 'update_thresholds',
        actor_name: (user as any).full_name || 'Admin',
        actor_nik: (user as any).nik || null,
        old_value: JSON.stringify(existing || {}),
        new_value: JSON.stringify(config),
        notes: 'Pembaruan ambang batas deteksi anomali BBM',
      },
    });

    return NextResponse.json({
      message: 'Konfigurasi ambang batas berhasil disimpan',
      config,
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
