import { db } from "@/db";
import { sessions, messages } from "@/db/schema";
import { desc, asc, eq } from "drizzle-orm";

// 1. Load all saved research sessions and their messages
export async function GET() {
  try {
    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt));

    const sessionsWithMessages = await Promise.all(
      allSessions.map(async (session) => {
        const sessionMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.sessionId, session.id))
          .orderBy(asc(messages.createdAt));

        return {
          ...session,
          messages: sessionMessages,
        };
      })
    );

    return Response.json({ sessions: sessionsWithMessages });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return Response.json(
      { error: "Failed to load sessions", sessions: [] },
      { status: 500 }
    );
  }
}

// 2. Create a new research session in PostgreSQL
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || "New Research";

    const [newSession] = await db
      .insert(sessions)
      .values({ title })
      .returning();

    return Response.json({
      session: {
        ...newSession,
        messages: [],
      },
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    return Response.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// 3. Delete a research session (messages cascade delete automatically)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Session ID required" }, { status: 400 });
    }

    await db.delete(sessions).where(eq(sessions.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return Response.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
