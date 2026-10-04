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

// GET /api/etoll/nfc/[uid] - Find card by NFC UID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { uid } = await params;
    const cleanUid = uid.replace(/[:\s-]/g, '');
    
    const card = await prisma.etollCard.findFirst({
      where: {
        OR: [
          { nfc_uid: uid },
          { nfc_uid: cleanUid },
          { nfc_uid: cleanUid.toLowerCase() },
          { nfc_uid: cleanUid.toUpperCase() },
        ]
      },
      include: {
        histories: {
          include: { user: { select: { full_name: true } } },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!card) {
      return NextResponse.json({ found: false, message: 'Kartu dengan NFC UID ini belum terdaftar' }, { status: 404 });
    }

    return NextResponse.json({ found: true, card });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
