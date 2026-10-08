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

// PUT /api/vehicles/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.nopol !== undefined) {
      data.nopol = String(body.nopol).trim().toUpperCase().replace(/\s+/g, ' ');
      const dup = await prisma.vehicle.findFirst({ where: { nopol: data.nopol, NOT: { id } } });
      if (dup) return NextResponse.json({ message: 'Nopol sudah terdaftar' }, { status: 400 });
    }
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.type !== undefined) data.type = body.type;
    if (body.capacity !== undefined) data.capacity = body.capacity ? parseInt(body.capacity) : null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.is_active !== undefined) data.is_active = !!body.is_active;

    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    return NextResponse.json({ message: 'Kendaraan berhasil diperbarui', vehicle });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/vehicles/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ message: 'Kendaraan berhasil dihapus' });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
