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

// PUT /api/destinations/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.city !== undefined) {
      data.city = String(body.city).trim();
      const dup = await prisma.destination.findFirst({
        where: { city: { equals: data.city, mode: 'insensitive' }, NOT: { id } },
      });
      if (dup) return NextResponse.json({ message: 'Kota tujuan sudah terdaftar' }, { status: 400 });
    }
    if (body.province !== undefined) data.province = body.province || null;
    if (body.distance_km !== undefined) data.distance_km = body.distance_km ? parseInt(body.distance_km) : null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.is_active !== undefined) data.is_active = !!body.is_active;

    const destination = await prisma.destination.update({ where: { id }, data });
    return NextResponse.json({ message: 'Kota tujuan berhasil diperbarui', destination });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/destinations/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await prisma.destination.delete({ where: { id } });
    return NextResponse.json({ message: 'Kota tujuan berhasil dihapus' });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
