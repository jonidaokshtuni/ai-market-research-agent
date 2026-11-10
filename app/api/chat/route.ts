import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  messages as messagesTable,
  sessions as sessionsTable,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

import { ChatRequestSchema } from "@/lib/validation/chat";
import { runResearchAgent } from "@/lib/ai/orchestrator";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    //  Authenticate the user
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    //  Parse request body
    const body: unknown = await req.json().catch(() => null);

    if (!body) {
      return Response.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    // Validate request
    const validation = ChatRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: "Invalid request.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { messages, mode, sessionId } = validation.data;

    //  Verify session ownership
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(
        and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId))
      )
      .limit(1);

    if (!session) {
      return Response.json(
        { error: "Research session not found." },
        { status: 404 }
      );
    }

    //  Identify latest user message
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return Response.json(
        { error: "A user message is required." },
        { status: 400 }
      );
    }

    // Persist user message
    await db.insert(messagesTable).values({
      sessionId,
      role: "user",
      content: latestUserMessage.content,
    });

    // Update session title
    const existingMessages = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .limit(2);

    if (existingMessages.length === 1) {
      await db
        .update(sessionsTable)
        .set({
          title: latestUserMessage.content.slice(0, 60),
        })
        .where(
          and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId))
        );
    }

    //  Execute AI research
    const result = await runResearchAgent({
      messages,
      mode,
    });

    // Persist assistant response
    await db.insert(messagesTable).values({
      sessionId,
      role: "assistant",
      content: result.reply,
      report: result.report,
      sources: result.sources,
      toolsUsed: result.toolsUsed,
    });

    //  Return response
    return Response.json({
      success: true,
      mode,
      reply: result.reply,
      report: result.report,
      sources: result.sources,
      toolsUsed: result.toolsUsed,
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    return Response.json(
      {
        error: "Research could not be completed. Please try again.",
      },
      { status: 500 }
    );
  }
}
