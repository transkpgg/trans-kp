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
  } catch {
    return null;
  }
}

interface Notification {
  id: string;
  type: 'etoll' | 'hotel';
  message: string;
  timestamp: string;
}

export async function GET() {
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

    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

    const [etollHistories, hotelVisits] = await Promise.all([
      prisma.etollHistory.findMany({
        where: {
          timestamp: { gte: sixtySecondsAgo },
        },
        include: {
          user: { select: { full_name: true } },
          card: { select: { card_number: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.hotelVisit.findMany({
        where: {
          OR: [
            { check_in_time: { gte: sixtySecondsAgo } },
            { check_out_time: { gte: sixtySecondsAgo } },
          ],
        },
        include: {
          user: { select: { full_name: true } },
        },
        orderBy: { check_in_time: 'desc' },
      }),
    ]);

    const notifications: Notification[] = [];

    for (const history of etollHistories) {
      const userName = history.user.full_name;
      const cardIdentifier = history.card.name || history.card.card_number;
      let actionLabel = history.action;
      if (history.action === 'assigned') actionLabel = 'meminjam';
      else if (history.action === 'returned') actionLabel = 'mengembalikan';
      else if (history.action === 'topup') actionLabel = 'top up';

      notifications.push({
        id: history.id,
        type: 'etoll',
        message: `${userName} ${actionLabel} kartu E-Toll ${cardIdentifier}`,
        timestamp: history.timestamp.toISOString(),
      });
    }

    for (const visit of hotelVisits) {
      const userName = visit.user.full_name;

      if (visit.check_out_time && visit.check_out_time >= sixtySecondsAgo) {
        notifications.push({
          id: `${visit.id}-checkout`,
          type: 'hotel',
          message: `${userName} check-out dari ${visit.hotel_name}`,
          timestamp: visit.check_out_time.toISOString(),
        });
      }

      if (visit.check_in_time >= sixtySecondsAgo) {
        notifications.push({
          id: `${visit.id}-checkin`,
          type: 'hotel',
          message: `${userName} check-in di ${visit.hotel_name}`,
          timestamp: visit.check_in_time.toISOString(),
        });
      }
    }

    notifications.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(notifications);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Failed to fetch notifications', error: errorMessage },
      { status: 500 }
    );
  }
}
