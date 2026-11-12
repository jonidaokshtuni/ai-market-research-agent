import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { messages, sessions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace found." },
        { status: 403 }
      );
    }

    const workspaceSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.organizationId, workspace.id))
      .orderBy(desc(sessions.createdAt));

    if (workspaceSessions.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const sessionIds = workspaceSessions.map((session) => session.id);

    const allMessages = await db
      .select()
      .from(messages)
      .where(inArray(messages.sessionId, sessionIds))
      .orderBy(asc(messages.createdAt));

    const messagesBySession = new Map<string, (typeof allMessages)[number][]>();

    for (const message of allMessages) {
      const existing = messagesBySession.get(message.sessionId) ?? [];
      existing.push(message);
      messagesBySession.set(message.sessionId, existing);
    }

    const sessionsWithMessages = workspaceSessions.map((session) => ({
      ...session,
      messages: messagesBySession.get(session.id) ?? [],
    }));

    return NextResponse.json({
      sessions: sessionsWithMessages,
    });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);

    return NextResponse.json(
      { error: "Unable to load research sessions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace found." },
        { status: 403 }
      );
    }

    const body: unknown = await request.json().catch(() => null);

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const rawTitle = (body as Record<string, unknown>).title;

    if (rawTitle !== undefined && typeof rawTitle !== "string") {
      return NextResponse.json(
        { error: "Title must be a string." },
        { status: 400 }
      );
    }

    const title =
      typeof rawTitle === "string" && rawTitle.trim()
        ? rawTitle.trim().slice(0, 100)
        : "New Research";

    const [newSession] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        organizationId: workspace.id,
        title,
      })
      .returning();

    return NextResponse.json(
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

    return NextResponse.json(
      { error: "Unable to create research session." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace found." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    const canDeleteAnySession =
      workspace.role === "owner" || workspace.role === "admin";

    const conditions = [
      eq(sessions.id, id),
      eq(sessions.organizationId, workspace.id),
    ];

    if (!canDeleteAnySession) {
      conditions.push(eq(sessions.userId, user.id));
    }

    const [deletedSession] = await db
      .delete(sessions)
      .where(and(...conditions))
      .returning({ id: sessions.id });

    if (!deletedSession) {
      return NextResponse.json(
        { error: "Research session not found or you cannot delete it." },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete session:", error);

    return NextResponse.json(
      { error: "Unable to delete research session." },
      { status: 500 }
    );
  }
}
