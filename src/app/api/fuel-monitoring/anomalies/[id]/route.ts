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

// PUT /api/fuel-monitoring/anomalies/[id] - Verifikasi & tindak lanjut anomali
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized: Hanya admin yang dapat memverifikasi' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, verification_notes } = body;

    const validStatuses = ['baru', 'sedang_diperiksa', 'selesai', 'tidak_terbukti'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ message: 'Status verifikasi tidak valid' }, { status: 400 });
    }

    const existing = await prisma.fuelAnomaly.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Data anomali tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.fuelAnomaly.update({
      where: { id },
      data: {
        status: status || existing.status,
        verification_notes: verification_notes !== undefined ? verification_notes : existing.verification_notes,
        verified_by: (user as any).full_name || 'Admin',
        verified_at: new Date(),
      },
    });

    // Catat Audit Trail
    await prisma.fuelAuditLog.create({
      data: {
        entity_type: 'anomaly',
        entity_id: id,
        action: 'update_anomaly_status',
        actor_name: (user as any).full_name || 'Admin',
        actor_nik: (user as any).nik || null,
        old_value: JSON.stringify({ status: existing.status, notes: existing.verification_notes }),
        new_value: JSON.stringify({ status: updated.status, notes: updated.verification_notes }),
        notes: `Verifikasi anomali oleh ${(user as any).full_name}`,
      },
    });

    return NextResponse.json({
      message: 'Status verifikasi anomali berhasil diperbarui',
      anomaly: updated,
    });
  } catch (error) {
    console.error('Error updating anomaly:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
