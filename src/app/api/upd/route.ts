import { NextResponse } from 'next/server';
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
  } catch (e) {
    return null;
  }
}

// GET /api/upd - List riwayat perhitungan UPD
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { driver_name: { contains: search, mode: 'insensitive' } },
        { driver_nik: { contains: search, mode: 'insensitive' } },
        { nopol: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { no_spd: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      whereClause.departure_time = {};
      if (startDate) whereClause.departure_time.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.departure_time.lte = end;
      }
    }

    const records = await prisma.updCalculation.findMany({
      where: whereClause,
      include: {
        driver: {
          select: {
            id: true,
            full_name: true,
            nik: true,
            username: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(records);
  } catch (error: any) {
    console.error("Error GET /api/upd:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/upd - Simpan perhitungan UPD baru
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      driver_id,
      driver_name,
      driver_nik,
      nopol,
      destination,
      no_spd,
      departure_time,
      return_time,
      total_days,
      meal_allowance,
      overnight_allowance,
      cigarette_allowance,
      total_amount,
      daily_breakdown,
      notes,
    } = body;

    if (!driver_name || !departure_time || !return_time) {
      return NextResponse.json(
        { message: 'Nama pengemudi, waktu berangkat, dan waktu kepulangan wajib diisi' },
        { status: 400 }
      );
    }

    const created = await prisma.updCalculation.create({
      data: {
        driver_id: driver_id || null,
        driver_name,
        driver_nik: driver_nik || '-',
        nopol: nopol ? nopol.toUpperCase() : null,
        destination: destination || null,
        no_spd: no_spd || null,
        departure_time: new Date(departure_time),
        return_time: new Date(return_time),
        total_days: total_days || 1,
        meal_allowance: parseFloat(meal_allowance) || 0,
        overnight_allowance: parseFloat(overnight_allowance) || 0,
        cigarette_allowance: parseFloat(cigarette_allowance) || 0,
        total_amount: parseFloat(total_amount) || 0,
        daily_breakdown: typeof daily_breakdown === 'string' ? daily_breakdown : JSON.stringify(daily_breakdown || []),
        notes: notes || null,
        created_by: (user as any).username || (user as any).full_name || 'Admin',
      },
      include: {
        driver: {
          select: {
            id: true,
            full_name: true,
            nik: true,
          }
        }
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error POST /api/upd:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
