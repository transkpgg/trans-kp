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

    const cards = await prisma.etollCard.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        histories: {
          include: { user: { select: { full_name: true } } },
          orderBy: { timestamp: 'desc' }
        }
      }
    });
    return NextResponse.json(cards);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { card_number, name } = body;

    const existing = await prisma.etollCard.findUnique({
      where: { card_number }
    });
    if (existing) {
      return NextResponse.json({ message: 'Kartu E-Toll sudah terdaftar' }, { status: 400 });
    }

    const newCard = await prisma.etollCard.create({
      data: {
        card_number,
        name,
        balance: 0,
        status: 'available'
      }
    });

    return NextResponse.json({ message: 'Kartu E-Toll berhasil ditambahkan', card: newCard });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
