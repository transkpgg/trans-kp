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

// Cari nilai kolom berdasarkan beberapa kemungkinan nama header (case-insensitive)
function pick(row: Record<string, unknown>, keys: string[]): string {
  const map = new Map(Object.keys(row).map((k) => [k.trim().toLowerCase(), k]));
  for (const key of keys) {
    const real = map.get(key.toLowerCase());
    if (real !== undefined && row[real] !== undefined && row[real] !== null) {
      return String(row[real]).trim();
    }
  }
  return '';
}

// POST /api/vehicles/import - impor kendaraan dari Excel (admin saja)
// Kolom template: "Nopol" (wajib), "Jenis Kendaraan", "Konsumsi BBM (1 L/km)"
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

    const existingList = await prisma.vehicle.findMany({ select: { nopol: true } });
    const existing = new Set(existingList.map((v) => v.nopol));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;
      const nopol = pick(row, ['Nopol', 'No Polisi', 'Nomor Polisi']).toUpperCase().replace(/\s+/g, ' ');
      const type = pick(row, ['Jenis Kendaraan', 'Jenis', 'Tipe']) || 'Mobil';
      const fuelRaw = pick(row, ['Konsumsi BBM (1 L/km)', 'Konsumsi BBM 1/km', 'Konsumsi BBM', 'BBM']);

      if (!nopol) {
        skipped++;
        errors.push(`Baris ${rowIndex}: Nopol kosong`);
        continue;
      }
      if (existing.has(nopol)) {
        skipped++;
        errors.push(`Baris ${rowIndex}: Nopol '${nopol}' sudah terdaftar`);
        continue;
      }

      let fuel: number | null = null;
      if (fuelRaw) {
        fuel = parseFloat(fuelRaw.replace(',', '.'));
        if (isNaN(fuel)) {
          skipped++;
          errors.push(`Baris ${rowIndex}: Konsumsi BBM '${fuelRaw}' tidak valid`);
          continue;
        }
      }

      try {
        await prisma.vehicle.create({
          data: { nopol, name: type, type, fuel_consumption: fuel },
        });
        existing.add(nopol);
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`Baris ${rowIndex}: ${err instanceof Error ? err.message : 'Gagal menyimpan'}`);
      }
    }

    return NextResponse.json({
      message: `Impor selesai. ${imported} kendaraan ditambahkan, ${skipped} dilewati.`,
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
