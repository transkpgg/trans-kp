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

// GET /api/upd/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const record = await prisma.updCalculation.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            full_name: true,
            nik: true,
            username: true,
          }
        }
      }
    });

    if (!record) {
      return NextResponse.json({ message: 'Data UPD tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("Error GET /api/upd/[id]:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/upd/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.updCalculation.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Data UPD berhasil dihapus' });
  } catch (error: any) {
    console.error("Error DELETE /api/upd/[id]:", error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
