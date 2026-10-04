import { PrismaClient } from "@prisma/client";

/**
 * Checks whether a Prisma error is a transient connection issue
 * that can be resolved by retrying (e.g. Supabase project paused,
 * PgBouncer connection reset, serverless cold-start timeout).
 */
function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return [
    "Can't reach database server",
    "Connection refused",
    "Connection timed out",
    "prepared statement",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "socket hang up",
    "connection is not available",
    "Server has closed the connection",
    "Client has closed the connection",
    "terminating connection",
    "project is paused",
    "Too many connections",
    "remaining connection slots",
    "server closed the connection unexpectedly",
    "Connection terminated unexpectedly",
    "idle timeout",
  ].some((pattern) => msg.includes(pattern));
}

/**
 * Sleep helper with jitter to avoid thundering herd.
 */
function sleep(ms: number): Promise<void> {
  const jitter = Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // --- Prisma Client Extension: automatic retry on transient errors ---
  const extendedClient = client.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError: unknown;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            return await query(args);
          } catch (error: unknown) {
            lastError = error;
            if (!isRetryableError(error) || attempt === MAX_RETRIES) {
              throw error;
            }
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(
              `[Prisma Auto-Retry] Attempt ${attempt}/${MAX_RETRIES} failed: ${
                error instanceof Error ? error.message : String(error)
              }. Retrying in ${delay}ms...`
            );
            await sleep(delay);
          }
        }
        throw lastError;
      },
    },
  });

  return extendedClient;
};

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

declare global {
  // eslint-disable-next-line no-var
  var prisma: ExtendedPrismaClient | undefined;
}

const prisma: ExtendedPrismaClient =
  globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
