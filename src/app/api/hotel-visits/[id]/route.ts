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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { check_out_lat, check_out_lng, selfie_check_out_url } = body;

    const existingVisit = await prisma.hotelVisit.findUnique({
      where: { id }
    });

    if (!existingVisit) {
      return NextResponse.json({ message: 'Kunjungan tidak ditemukan' }, { status: 404 });
    }

    if (existingVisit.user_id !== user.id && user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const checkOutTime = new Date();
    const durationMs = checkOutTime.getTime() - new Date(existingVisit.check_in_time).getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    const updatedVisit = await prisma.hotelVisit.update({
      where: { id },
      data: {
        check_out_time: checkOutTime,
        check_out_lat,
        check_out_lng,
        selfie_check_out_url,
        duration_minutes: durationMinutes
      }
    });

    return NextResponse.json({ message: 'Check-out berhasil', visit: updatedVisit });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
