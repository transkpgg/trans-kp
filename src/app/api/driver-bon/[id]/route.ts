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

// PUT /api/driver-bon/[id] - Update driver bon
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.driverBon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Data Bon Pengemudi tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.driverBon.update({
      where: { id },
      data: {
        ...(body.bon_date && { bon_date: new Date(body.bon_date) }),
        ...(body.nopol && { nopol: body.nopol.toUpperCase() }),
        ...(body.driver_id !== undefined && { driver_id: body.driver_id }),
        ...(body.driver_name && { driver_name: body.driver_name }),
        ...(body.driver_nik && { driver_nik: body.driver_nik }),
        ...(body.destination && { destination: body.destination }),
        ...(body.no_spd && { no_spd: body.no_spd }),
        ...(body.departure_date && { departure_date: new Date(body.departure_date) }),
        ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
        ...(body.keterangan && { keterangan: body.keterangan }),
        ...(body.signature_url !== undefined && { signature_url: body.signature_url }),
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error PUT driver-bon:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/driver-bon/[id] - Delete driver bon
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await prisma.driverBon.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Data Bon Pengemudi berhasil dihapus' });
  } catch (error: any) {
    console.error("Error DELETE driver-bon:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
