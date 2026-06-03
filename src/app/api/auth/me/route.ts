import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import prisma from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-trans-kp-2024'
);

export async function GET(request: Request) {
  try {
    const token = cookies().get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 });
    }

    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: payload.id as string },
      });

      if (!user) {
        return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
      }

      const { password: _, ...safeUser } = user;
      
      return NextResponse.json({ user: safeUser });
    } catch (e) {
      return NextResponse.json({ message: 'Token tidak valid' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
