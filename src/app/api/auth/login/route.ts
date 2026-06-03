import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import prisma from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-trans-kp-2024'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Username atau password salah' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { message: 'Akun Anda tidak aktif. Hubungi Administrator.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Buat JWT Token
    const alg = 'HS256';
    const token = await new jose.SignJWT({ 
      id: user.id, 
      role: user.role, 
      username: user.username,
      full_name: user.full_name
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Set cookie
    cookies().set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Return safe user object (without password)
    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      message: 'Login berhasil',
      user: safeUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
