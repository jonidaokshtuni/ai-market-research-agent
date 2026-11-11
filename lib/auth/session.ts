import { db } from "@/db";
import { authSessions, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import "server-only";

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Hash the session token before storing it in the database
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Create a new authentication session
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(authSessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { expiresAt };
}

// Get the currently authenticated user
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = hashToken(token);

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        gt(authSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  return result[0] ?? null;
}

// Delete the current authentication session
export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashToken(token);

    await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
