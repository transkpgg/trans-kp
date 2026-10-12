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

// POST /api/destinations/import - impor kota tujuan dari file Excel (admin saja)
// Kolom template: "Kota Tujuan" (wajib), "Catatan", "Status" (Aktif/Nonaktif)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role === 'karyawan') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ message: 'File tidak ditemukan' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    const existingList = await prisma.destination.findMany({ select: { city: true } });
    const existing = new Set(existingList.map((d) => d.city.toLowerCase()));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // header di baris 1
      const city = String(row['Kota Tujuan'] ?? row['Kota'] ?? '').trim();
      const notes = String(row['Catatan'] ?? '').trim();
      const statusRaw = String(row['Status'] ?? '').trim().toLowerCase();
      const is_active = statusRaw === '' || !['nonaktif', 'tidak aktif', 'inactive', 'no', 'false', '0'].includes(statusRaw);

      if (!city) {
        skipped++;
        errors.push(`Baris ${rowIndex}: Kota Tujuan kosong`);
        continue;
      }
      if (existing.has(city.toLowerCase())) {
        skipped++;
        errors.push(`Baris ${rowIndex}: '${city}' sudah terdaftar`);
        continue;
      }

      try {
        await prisma.destination.create({
          data: { city, notes: notes || null, is_active },
        });
        existing.add(city.toLowerCase());
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`Baris ${rowIndex}: ${err instanceof Error ? err.message : 'Gagal menyimpan'}`);
      }
    }

    return NextResponse.json({
      message: `Impor selesai. ${imported} kota ditambahkan, ${skipped} dilewati.`,
      imported,
      skipped,
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { message: 'Gagal mengimpor file', error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
