import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import * as XLSX from 'xlsx';
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

interface UserRow {
  NIK?: string | number;
  'Nama Lengkap'?: string;
  Username?: string;
  Password?: string | number;
  Jabatan?: string;
  Role?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<UserRow>(worksheet);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // 1-indexed + header row

      const nik = row['NIK'] != null ? String(row['NIK']).trim() : '';
      const fullName = row['Nama Lengkap'] != null ? String(row['Nama Lengkap']).trim() : '';
      const username = row['Username'] != null ? String(row['Username']).trim() : '';
      const password = row['Password'] != null ? String(row['Password']).trim() : '';
      const jabatan = row['Jabatan'] != null ? String(row['Jabatan']).trim() : '';
      const role = row['Role'] != null ? String(row['Role']).trim() : 'karyawan';

      if (!nik || !fullName || !username || !password || !jabatan) {
        errors.push(`Row ${rowIndex}: Missing required fields`);
        skipped++;
        continue;
      }

      try {
        const existing = await prisma.user.findFirst({
          where: {
            OR: [{ nik }, { username }],
          },
        });

        if (existing) {
          skipped++;
          errors.push(
            `Row ${rowIndex}: NIK '${nik}' or Username '${username}' already exists`
          );
          continue;
        }

        await prisma.user.create({
          data: {
            nik,
            full_name: fullName,
            username,
            password,
            jabatan,
            role: role || 'karyawan',
          },
        });

        imported++;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${rowIndex}: ${errorMessage}`);
        skipped++;
      }
    }

    return NextResponse.json({
      message: `Import completed. ${imported} users imported, ${skipped} skipped.`,
      imported,
      skipped,
      errors,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Failed to import users', error: errorMessage },
      { status: 500 }
    );
  }
}
