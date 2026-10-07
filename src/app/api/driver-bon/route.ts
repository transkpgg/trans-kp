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

// GET /api/driver-bon - List driver bons
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
        { keterangan: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      whereClause.bon_date = {};
      if (startDate) whereClause.bon_date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.bon_date.lte = end;
      }
    }

    const bons = await prisma.driverBon.findMany({
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
      orderBy: { bon_date: 'desc' }
    });

    return NextResponse.json(bons);
  } catch (error: any) {
    console.error("Error GET driver-bon:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/driver-bon - Create driver bon
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      bon_date,
      nopol,
      driver_id,
      driver_name,
      driver_nik,
      destination,
      no_spd,
      departure_date,
      amount,
      keterangan,
      signature_url,
    } = body;

    if (!nopol || !driver_name || !destination || !no_spd || !departure_date || amount === undefined || !keterangan) {
      return NextResponse.json(
        { message: 'Mohon lengkapi semua data wajib' },
        { status: 400 }
      );
    }

    const newBon = await prisma.driverBon.create({
      data: {
        bon_date: bon_date ? new Date(bon_date) : new Date(),
        nopol: nopol.toUpperCase(),
        driver_id: driver_id || null,
        driver_name,
        driver_nik: driver_nik || '-',
        destination,
        no_spd,
        departure_date: new Date(departure_date),
        amount: parseFloat(amount),
        keterangan,
        status: body.status || 'belum_lunas',
        signature_url: signature_url || null,
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

    return NextResponse.json(newBon, { status: 201 });
  } catch (error: any) {
    console.error("Error POST driver-bon:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
