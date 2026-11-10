import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sessions, messages } from "@/db/schema";
import { desc, asc, eq, and } from "drizzle-orm";

// GET: Retrieve only the authenticated user's sessions
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));

    const sessionsWithMessages = await Promise.all(
      userSessions.map(async (session) => {
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

    return Response.json({
      sessions: sessionsWithMessages,
    });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);

    return Response.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

// POST: Create a session owned by the authenticated user
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 100)
        : "New Research";

    const [newSession] = await db
      .insert(sessions)
      .values({
        userId,
        title,
      })
      .returning();

    return Response.json(
      {
        session: {
          ...newSession,
          messages: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create session:", error);

    return Response.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// DELETE: Delete only a session owned by the authenticated user
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Session ID required" }, { status: 400 });
    }

    await db
      .delete(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete session:", error);

    return Response.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
