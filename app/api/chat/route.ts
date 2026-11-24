
import { and, desc, eq } from "drizzle-orm";

import { retrieveKnowledge } from "@/lib/knowledge/retrieval";
import { db } from "@/db";
import {
  messages as messagesTable,
  sessions as sessionsTable,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";
import { runResearchAgent } from "@/lib/ai/orchestrator";
import { ChatMessageSchema, ChatRequestSchema } from "@/lib/validation/chat";

export const maxDuration = 30;

const MAX_HISTORY_MESSAGES = 30;

type ErrorDetails = {
  messages: string[];
  codes: string[];
  statusCodes: number[];
};

function collectErrorDetails(error: unknown): ErrorDetails {
  const details: ErrorDetails = {
    messages: [],
    codes: [],
    statusCodes: [],
  };

  const visited = new Set<object>();

  function inspect(value: unknown, depth = 0): void {
    if (depth > 5 || value === null || value === undefined) {
      return;
    }

    if (typeof value !== "object") {
      if (typeof value === "string") {
        details.messages.push(value);
      }
      return;
    }

    if (visited.has(value)) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        inspect(item, depth + 1);
      }
      return;
    }

    const object = value as Record<string, unknown>;

    if (typeof object.message === "string") {
      details.messages.push(object.message);
    }

    if (typeof object.code === "string") {
      details.codes.push(object.code);
    }

    if (typeof object.name === "string") {
      details.codes.push(object.name);
    }

    for (const key of ["statusCode", "status"]) {
      const status = Number(object[key]);

      if (
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599
      ) {
        details.statusCodes.push(status);
      }
    }

    // Inspect nested AI SDK errors, including retry and provider errors.
    for (const key of [
      "cause",
      "lastError",
      "errors",
      "response",
      "data",
    ]) {
      if (object[key] !== undefined) {
        inspect(object[key], depth + 1);
      }
    }
  }

  inspect(error);

  return details;
}

function getAiErrorResponse(error: unknown): {
  error: string;
  code: string;
  status: number;
} | null {
  const details = collectErrorDetails(error);

  const messages = details.messages.join(" ").toLowerCase();
  const codes = details.codes.join(" ").toLowerCase();

  const isQuotaError =
    details.statusCodes.includes(429) ||
    /resource_exhausted|quota|rate.?limit|too many requests|daily limit|requests per minute|token limit/.test(
      `${messages} ${codes}`,
    );

  if (isQuotaError) {
    return {
      error:
        "The AI service has reached its current usage limit. Please try again later. Your uploaded documents and saved research are safe.",
      code: "AI_USAGE_LIMIT_REACHED",
      status: 429,
    };
  }

  const isUnavailable =
    details.statusCodes.some((status) =>
      [500, 502, 503, 504].includes(status),
    ) ||
    /high demand|temporarily unavailable|service unavailable|overloaded|capacity|server error/.test(
      `${messages} ${codes}`,
    );

  if (isUnavailable) {
    return {
      error:
        "The AI service is temporarily unavailable due to high demand or a service interruption. Please try again in a few minutes. Your uploaded documents and saved research are safe.",
      code: "AI_SERVICE_UNAVAILABLE",
      status: 503,
    };
  }

  return null;
}

export async function POST(req: Request) {
  let currentStage = "request";

  try {
    // 1. Authenticate user.
    currentStage = "authentication";

    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    // 2. Resolve active workspace.
    currentStage = "workspace";

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return Response.json(
        { error: "No active workspace found." },
        { status: 403 },
      );
    }

    // 3. Parse request body.
    currentStage = "request-validation";

    const body: unknown = await req.json().catch(() => null);

    if (body === null) {
      return Response.json(
        { error: "Invalid JSON request." },
        { status: 400 },
      );
    }

    const validation = ChatRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: "Invalid request.",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { message, mode, sessionId } = validation.data;

    // 4. Verify that the session belongs to the active workspace.
    currentStage = "session-validation";

    const [session] = await db
      .select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.id, sessionId),
          eq(sessionsTable.organizationId, workspace.id),
        ),
      )
      .limit(1);

    if (!session) {
      return Response.json(
        { error: "Research session not found." },
        { status: 404 },
      );
    }

    // 5. Check whether this is the first message.
    currentStage = "existing-message-check";

    const existingMessages = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .limit(1);

    const isFirstMessage = existingMessages.length === 0;

    // 6. Persist the new user message.
    currentStage = "save-user-message";

    await db.insert(messagesTable).values({
      sessionId,
      role: "user",
      content: message,
    });

    // 7. Set session title on the first message.
    if (isFirstMessage) {
      currentStage = "update-session-title";

      await db
        .update(sessionsTable)
        .set({
          title: message.slice(0, 60),
        })
        .where(
          and(
            eq(sessionsTable.id, sessionId),
            eq(sessionsTable.organizationId, workspace.id),
          ),
        );
    }

    // 8. Load trusted conversation history.
    currentStage = "conversation-history";

    const storedMessages = await db
      .select({
        role: messagesTable.role,
        content: messagesTable.content,
      })
      .from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(MAX_HISTORY_MESSAGES);

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

    // 9. Retrieve relevant personal and workspace knowledge.
    currentStage = "knowledge-retrieval";

    console.log("[Chat API] Starting knowledge retrieval.");

    const knowledgeContext = await retrieveKnowledge({
      query: message,
      userId: user.id,
      organizationId: workspace.id,
      limit: 5,
    });

    console.log(
      "[Chat API] Retrieved knowledge chunks:",
      knowledgeContext.length,
    );

    if (knowledgeContext.length > 0) {
      console.log(
        "[Chat API] Retrieved document names:",
        [...new Set(knowledgeContext.map((chunk) => chunk.documentName))],
      );
    }

    // 10. Execute the existing research agent with retrieved knowledge.
    currentStage = "research-agent";

    console.log("[Chat API] Starting research agent.");

    const result = await runResearchAgent({
      messages: conversationHistory,
      mode,
      knowledgeContext: knowledgeContext.map((chunk) => ({
        documentName: chunk.documentName,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
      })),
    });

    console.log("[Chat API] Research agent completed.");

    // 11. Persist assistant response.
    currentStage = "save-assistant-response";

    await db.insert(messagesTable).values({
      sessionId,
      role: "assistant",
      content: result.reply,
      report: result.report,
      sources: result.sources,
      toolsUsed: result.toolsUsed,
    });

    // 12. Return response.
    currentStage = "response";

    return Response.json({
      success: true,
      mode,
      reply: result.reply,
      report: result.report,
      sources: result.sources,
      toolsUsed: result.toolsUsed,
    });
  } catch (error) {
    console.error("----------------------------------------");
    console.error("[Chat API] Request failed.");
    console.error("[Chat API] Failed stage:", currentStage);
    console.error("[Chat API] Original error:", error);

    if (error instanceof Error) {
      console.error("[Chat API] Error name:", error.name);
      console.error("[Chat API] Error message:", error.message);
      console.error("[Chat API] Stack:", error.stack);
    }

    console.error("----------------------------------------");

    // Only classify provider errors when the research agent was running.
    if (currentStage === "research-agent") {
      const aiError = getAiErrorResponse(error);

      if (aiError) {
        console.warn("[Chat API] AI provider issue:", aiError.code);

        return Response.json(
          {
            success: false,
            error: aiError.error,
            code: aiError.code,
          },
          { status: aiError.status },
        );
      }
    }

    return Response.json(
      {
        success: false,
        error: "Research could not be completed. Please try again.",
        code: "RESEARCH_FAILED",
      },
      { status: 500 },
    );
  }
}
