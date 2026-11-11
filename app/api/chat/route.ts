import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  messages as messagesTable,
  sessions as sessionsTable,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { runResearchAgent } from "@/lib/ai/orchestrator";
import { ChatMessageSchema, ChatRequestSchema } from "@/lib/validation/chat";

export const maxDuration = 30;

const MAX_HISTORY_MESSAGES = 30;

export async function POST(req: Request) {
  try {
    //  Authenticate the user.
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    //  Parse the request body.
    const body: unknown = await req.json().catch(() => null);

    if (body === null) {
      return Response.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    // Validate the request.
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

    const { message, mode, sessionId } = validation.data;

    //  Verify session ownership.
    const [session] = await db
      .select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(
        and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, user.id))
      )
      .limit(1);

    if (!session) {
      return Response.json(
        { error: "Research session not found." },
        { status: 404 }
      );
    }

    //  Check whether this is the first message.
    const existingMessages = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .limit(1);

    const isFirstMessage = existingMessages.length === 0;

    //  Persist the new user message.
    await db.insert(messagesTable).values({
      sessionId,
      role: "user",
      content: message,
    });

    //  Set the session title on the first message.
    if (isFirstMessage) {
      await db
        .update(sessionsTable)
        .set({
          title: message.slice(0, 60),
        })
        .where(
          and(
            eq(sessionsTable.id, sessionId),
            eq(sessionsTable.userId, user.id)
          )
        );
    }

    // 8. Load trusted conversation history from the database.
    const storedMessages = await db
      .select({
        role: messagesTable.role,
        content: messagesTable.content,
      })
      .from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(MAX_HISTORY_MESSAGES);

    // Restore chronological order and validate stored messages.
    const conversationHistory = storedMessages
      .reverse()
      .flatMap((storedMessage) => {
        const parsed = ChatMessageSchema.safeParse(storedMessage);

        return parsed.success ? [parsed.data] : [];
      });

    if (
      conversationHistory.length === 0 ||
      conversationHistory[conversationHistory.length - 1]?.role !== "user"
    ) {
      throw new Error("Invalid conversation history.");
    }

    // 9. Execute the research agent.
    const result = await runResearchAgent({
      messages: conversationHistory,
      mode,
    });

    // 10. Persist the assistant response.
    await db.insert(messagesTable).values({
      sessionId,
      role: "assistant",
      content: result.reply,
      report: result.report,
      sources: result.sources,
      toolsUsed: result.toolsUsed,
    });

    // 11. Return the response.
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
