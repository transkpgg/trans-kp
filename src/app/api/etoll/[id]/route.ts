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

    const card = await prisma.etollCard.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ message: 'Kartu tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { action, user_id, notes, amount } = body;

    // We do all updates in a transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      let updatedCard;
      let newHistory;

      if (action === "assign") {
        if (card.status !== "available" && card.status !== "returned") {
          throw new Error("Kartu sedang tidak tersedia untuk dipinjamkan");
        }
        
        updatedCard = await tx.etollCard.update({
          where: { id },
          data: { status: "in_use", last_used_at: new Date() }
        });

        newHistory = await tx.etollHistory.create({
          data: {
            card_id: id,
            user_id: user_id,
            action: "assigned",
            notes: notes || null
          }
        });
      } 
      else if (action === "return") {
        if (card.status !== "in_use") {
          throw new Error("Kartu sedang tidak dipinjam");
        }

        updatedCard = await tx.etollCard.update({
          where: { id },
          data: { status: "available" }
        });

        newHistory = await tx.etollHistory.create({
          data: {
            card_id: id,
            user_id: currentUser.id as string,
            action: "returned",
            notes: "Dikembalikan ke admin"
          }
        });
      }
      else if (action === "topup") {
        if (!amount || amount <= 0) {
          throw new Error("Jumlah top up tidak valid");
        }

        updatedCard = await tx.etollCard.update({
          where: { id },
          data: { balance: { increment: amount } }
        });

        newHistory = await tx.etollHistory.create({
          data: {
            card_id: id,
            user_id: currentUser.id as string,
            action: "topup",
            amount_used: amount,
            balance_before: card.balance,
            balance_after: card.balance + amount,
            notes: "Top Up Saldo"
          }
        });
      }
      else if (action === "edit") {
        updatedCard = await tx.etollCard.update({
          where: { id },
          data: { 
            card_number: body.card_number !== undefined ? body.card_number : card.card_number,
            name: body.card_name !== undefined ? body.card_name : card.name
          }
        });
      }
      else {
        throw new Error("Action tidak valid");
      }

      return { updatedCard, newHistory };
    });

    return NextResponse.json({ message: 'Sukses', data: result.updatedCard });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
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

    const card = await prisma.etollCard.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ message: 'Kartu tidak ditemukan' }, { status: 404 });
    }
    if (card.status === 'in_use') {
      return NextResponse.json({ message: 'Tidak bisa menghapus kartu yang sedang dipakai' }, { status: 400 });
    }

    await prisma.etollHistory.deleteMany({ where: { card_id: id } });
    await prisma.etollCard.delete({ where: { id } });

    return NextResponse.json({ message: 'Berhasil dihapus' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
