import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This endpoint keeps the Supabase database alive by sending a lightweight
// query periodically. Supabase free-tier pauses after 1 week of inactivity.
// Configure an external cron to call GET /api/keep-alive every ~4 days.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();

  try {
    // Simple lightweight query to keep the database awake
    const result = await prisma.$queryRaw`SELECT 1 as alive`;
    const duration = Date.now() - startTime;

    // Also do a quick table count to ensure all tables are accessible
    const [userCount, branchCount, attendanceCount] = await Promise.all([
      prisma.user.count(),
      prisma.branch.count(),
      prisma.attendance.count(),
    ]);

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
        tables: {
          users: userCount,
          branches: branchCount,
          attendances: attendanceCount,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error("[Keep-Alive] Database connection failed:", errorMessage);

    // Try to reconnect
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      const retryResult = await prisma.$queryRaw`SELECT 1 as alive`;

      return NextResponse.json(
        {
          status: "recovered",
          database: "reconnected",
          responseTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          initialError: errorMessage,
        },
        { status: 200 }
      );
    } catch (retryError: unknown) {
      const retryErrorMessage =
        retryError instanceof Error ? retryError.message : String(retryError);

      return NextResponse.json(
        {
          status: "error",
          database: "disconnected",
          responseTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: errorMessage,
          retryError: retryErrorMessage,
        },
        { status: 503 }
      );
    }
  }
}
