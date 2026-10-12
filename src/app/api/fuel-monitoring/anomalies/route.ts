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
    return payload;
  } catch {
    return null;
  }
}

// GET /api/fuel-monitoring/anomalies - Daftar seluruh temuan anomali
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const nopol = searchParams.get('nopol');

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (severity && severity !== 'all') where.severity = severity;
    if (nopol) where.nopol = { contains: nopol, mode: 'insensitive' };

    const anomalies = await prisma.fuelAnomaly.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        trip: {
          select: {
            id: true,
            trip_date: true,
            start_km: true,
            end_km: true,
            odo_distance: true,
            gps_distance: true,
            fuel_used: true,
            actual_kml: true,
            standard_kml: true,
            diff_percent: true,
            cost_per_km: true,
          },
        },
      },
    });

    return NextResponse.json(anomalies);
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
