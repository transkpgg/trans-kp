import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
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
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        nik: true,
        full_name: true,
        username: true,
        password: true,
        role: true,
        jabatan: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getUserFromToken();
    if (!currentUser || currentUser.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nik, full_name, username, password, role, position } = body;

    // Hanya super_admin yang boleh membuat admin
    if (role !== 'karyawan' && currentUser.role !== 'super_admin') {
      return NextResponse.json({ message: 'Hanya Super Admin yang dapat menambahkan Admin' }, { status: 403 });
    }

    // Check existing
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { nik }] }
    });
    if (existing) {
      return NextResponse.json({ message: 'Username atau NIK sudah digunakan' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        nik,
        full_name,
        username,
        password,
        role,
        jabatan: position,
      },
      select: { id: true, username: true, full_name: true }
    });

    return NextResponse.json({ message: 'User berhasil ditambahkan', user: newUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
