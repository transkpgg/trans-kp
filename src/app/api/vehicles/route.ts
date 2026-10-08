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
    const name = String(body.name || '').trim();
    if (!nopol || !name) {
      return NextResponse.json({ message: 'Nopol dan nama kendaraan wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.vehicle.findUnique({ where: { nopol } });
    if (existing) {
      return NextResponse.json({ message: 'Nopol sudah terdaftar' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        nopol,
        name,
        type: body.type || 'Mobil',
        capacity: body.capacity ? parseInt(body.capacity) : null,
        notes: body.notes || null,
        is_active: body.is_active !== false,
      },
    });
    return NextResponse.json({ message: 'Kendaraan berhasil ditambahkan', vehicle });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
