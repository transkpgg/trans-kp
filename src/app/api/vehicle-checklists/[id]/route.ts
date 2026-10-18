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
    if (!payload.id) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        nik: true,
        full_name: true,
        username: true,
        role: true,
        jabatan: true,
      }
    });
    return user;
  } catch (e) {
    return null;
  }
}

// GET /api/vehicle-checklists/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const checklist = await prisma.vehicleChecklist.findUnique({
      where: { id },
      include: {
        technician: {
          select: {
            id: true,
            nik: true,
            full_name: true,
            username: true,
          }
        }
      }
    });

    if (!checklist) {
      return NextResponse.json({ message: 'Data ceklis tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(checklist);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/vehicle-checklists/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const isTeknisi = user.jabatan === 'Teknisi';
    const isMaintenanceAdmin = user.jabatan === 'Admin Perawatan Kendaraan';
    const isSuperAdmin = user.role === 'super_admin';

    if (!isTeknisi && !isMaintenanceAdmin && !isSuperAdmin) {
      return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.vehicleChecklist.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Data ceklis tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.vehicleChecklist.update({
      where: { id },
      data: {
        ...body,
        kilometer: body.kilometer !== undefined ? parseInt(String(body.kilometer)) : existing.kilometer,
        date: body.date ? new Date(body.date) : existing.date,
        updated_at: new Date(),
      }
    });

    return NextResponse.json({ message: 'Ceklis berhasil diperbarui', checklist: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/vehicle-checklists/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const isMaintenanceAdmin = user.jabatan === 'Admin Perawatan Kendaraan';
    const isSuperAdmin = user.role === 'super_admin';

    // Penghapusan hanya boleh dilakukan oleh Super Admin atau Admin Perawatan Kendaraan
    if (!isMaintenanceAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { message: 'Akses ditolak: Hanya Super Admin atau Admin Perawatan Kendaraan yang dapat menghapus' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.vehicleChecklist.delete({ where: { id } });

    return NextResponse.json({ message: 'Data ceklis berhasil dihapus' });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
