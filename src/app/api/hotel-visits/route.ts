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

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // Hapus riwayat yang lebih dari 1 bulan
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    await prisma.hotelVisit.deleteMany({
      where: {
        check_in_time: {
          lt: oneMonthAgo
        }
      }
    });

    let whereClause = {};
    if (user.role === 'karyawan') {
      whereClause = { user_id: user.id as string };
    }

    const visits = await prisma.hotelVisit.findMany({
      where: whereClause,
      include: {
        user: { select: { full_name: true, username: true } }
      },
      orderBy: { check_in_time: 'desc' }
    });
    return NextResponse.json(visits);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { hotel_name, notes, check_in_lat, check_in_lng, selfie_check_in_url } = body;

    // Cek apakah masih ada kunjungan aktif (belum check-out)
    const activeVisit = await prisma.hotelVisit.findFirst({
      where: {
        user_id: user.id as string,
        check_out_time: null
      }
    });

    if (activeVisit) {
      return NextResponse.json(
        { message: 'Anda harus melakukan Check Out pada kunjungan sebelumnya terlebih dahulu.' },
        { status: 400 }
      );
    }

    const newVisit = await prisma.hotelVisit.create({
      data: {
        user_id: user.id as string,
        hotel_name,
        notes,
        check_in_time: new Date(),
        check_in_lat,
        check_in_lng,
        selfie_check_in_url
      }
    });

    return NextResponse.json({ message: 'Check-in Hotel berhasil', visit: newVisit });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
