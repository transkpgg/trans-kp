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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getUserFromToken();
    if (!currentUser || currentUser.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nik, full_name, username, password, role, position } = body;

    // Check if the user to edit is super_admin
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    // Hanya super admin yang bisa mengubah super admin atau membuat admin baru
    if (
      (targetUser.role === 'super_admin' || role === 'super_admin' || role === 'admin_cabang') &&
      currentUser.role !== 'super_admin'
    ) {
      return NextResponse.json({ message: 'Hanya Super Admin yang dapat mengubah role ini' }, { status: 403 });
    }

    const dataToUpdate: any = { nik, full_name, username, role, jabatan: position };
    if (password && password.trim() !== '') {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, username: true, full_name: true }
    });

    return NextResponse.json({ message: 'User berhasil diperbarui', user: updatedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getUserFromToken();
    if (!currentUser || currentUser.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ message: 'Tidak dapat menghapus Super Admin' }, { status: 403 });
    }

    if (targetUser.role === 'admin_cabang' && currentUser.role !== 'super_admin') {
      return NextResponse.json({ message: 'Hanya Super Admin yang dapat menghapus Admin' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
