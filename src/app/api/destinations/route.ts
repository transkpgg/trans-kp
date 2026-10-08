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

// GET /api/destinations - semua user login boleh membaca (dipakai dropdown Bon Pengemudi)
export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const destinations = await prisma.destination.findMany({ orderBy: { city: 'asc' } });
    return NextResponse.json(destinations);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/destinations - tambah kota tujuan (admin saja)
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const city = String(body.city || '').trim();
    if (!city) {
      return NextResponse.json({ message: 'Nama kota wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.destination.findFirst({
      where: { city: { equals: city, mode: 'insensitive' } },
    });
    if (existing) {
      return NextResponse.json({ message: 'Kota tujuan sudah terdaftar' }, { status: 400 });
    }

    const destination = await prisma.destination.create({
      data: {
        city,
        province: body.province || null,
        distance_km: body.distance_km ? parseInt(body.distance_km) : null,
        notes: body.notes || null,
        is_active: body.is_active !== false,
      },
    });
    return NextResponse.json({ message: 'Kota tujuan berhasil ditambahkan', destination });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
