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

interface EtollRow {
  'Nomor Kartu'?: string | number;
  'Nama Kartu'?: string;
  'Saldo Awal'?: string | number;
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

    if (user.role === 'karyawan') {
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
    const rows = XLSX.utils.sheet_to_json<EtollRow>(worksheet);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // 1-indexed + header row

      const cardNumber =
        row['Nomor Kartu'] != null ? String(row['Nomor Kartu']).trim() : '';
      const name =
        row['Nama Kartu'] != null ? String(row['Nama Kartu']).trim() : '';
      const saldoRaw = row['Saldo Awal'];
      const balance =
        saldoRaw != null ? parseFloat(String(saldoRaw)) : 0;

      if (!cardNumber || !name) {
        errors.push(`Row ${rowIndex}: Missing required fields (Nomor Kartu, Nama Kartu)`);
        skipped++;
        continue;
      }

      if (isNaN(balance)) {
        errors.push(`Row ${rowIndex}: Invalid balance value`);
        skipped++;
        continue;
      }

      try {
        const existing = await prisma.etollCard.findUnique({
          where: { card_number: cardNumber },
        });

        if (existing) {
          skipped++;
          errors.push(
            `Row ${rowIndex}: Card number '${cardNumber}' already exists`
          );
          continue;
        }

        await prisma.etollCard.create({
          data: {
            card_number: cardNumber,
            name,
            balance,
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
      message: `Import completed. ${imported} cards imported, ${skipped} skipped.`,
      imported,
      skipped,
      errors,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Failed to import e-toll cards', error: errorMessage },
      { status: 500 }
    );
  }
}
