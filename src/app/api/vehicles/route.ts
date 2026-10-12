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

// GET /api/vehicles - semua user login boleh membaca (dipakai dropdown Bon Pengemudi)
export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const vehicles = await prisma.vehicle.findMany({ orderBy: { nopol: 'asc' } });
    return NextResponse.json(vehicles);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/vehicles - tambah kendaraan (admin saja)
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const nopol = String(body.nopol || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const type = String(body.type || '').trim() || 'Mobil';
    const name = String(body.name || '').trim() || type;
    if (!nopol) {
      return NextResponse.json({ message: 'Nopol wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.vehicle.findUnique({ where: { nopol } });
    if (existing) {
      return NextResponse.json({ message: 'Nopol sudah terdaftar' }, { status: 400 });
    }

    const fuel = body.fuel_consumption !== undefined && body.fuel_consumption !== '' && body.fuel_consumption !== null
      ? parseFloat(String(body.fuel_consumption).replace(',', '.'))
      : null;

    const vehicle = await prisma.vehicle.create({
      data: {
        nopol,
        name,
        type,
        capacity: body.capacity ? parseInt(body.capacity) : null,
        fuel_consumption: fuel !== null && !isNaN(fuel) ? fuel : null,
        notes: body.notes || null,
        is_active: body.is_active !== false,
      },
    });
    return NextResponse.json({ message: 'Kendaraan berhasil ditambahkan', vehicle });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
