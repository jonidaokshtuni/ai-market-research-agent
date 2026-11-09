import { google } from "@ai-sdk/google";
import { generateText, Output, tool, stepCountIs } from "ai";
import { z } from "zod";
import { db } from "@/db";
import {
  messages as messagesTable,
  sessions as sessionsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

const MarketReportSchema = z.object({
  summary: z.string().describe("Executive summary of the market or company"),
  keyTrends: z
    .array(z.string())
    .describe("3 to 5 bullet points of current trends or findings"),
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  recommendation: z.string().describe("Actionable strategic takeaway"),
});

export async function POST(req: Request) {
  try {
    const { messages, mode = "chat", sessionId } = await req.json();

    const latestUserMsg = messages[messages.length - 1];
    if (sessionId && latestUserMsg) {
      await db.insert(messagesTable).values({
        sessionId,
        role: "user",
        content: latestUserMsg.content,
      });

      if (messages.length === 1) {
        await db
          .update(sessionsTable)
          .set({ title: latestUserMsg.content.slice(0, 35) })
          .where(eq(sessionsTable.id, sessionId));
      }
    }

    const collectedSources: { title: string; url: string }[] = [];
    const toolsUsed: string[] = [];

    const tools = {
      searchInternet: tool({
        description:
          "Searches the web in real time for news, competitors, market trends, and company data.",
        inputSchema: z.object({
          query: z.string().describe("Targeted search query"),
        }),
        execute: async ({ query }) => {
          toolsUsed.push(`Web Search: "${query}"`);
          const response = await fetch("https://tavily.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              query,
              search_depth: "advanced",
              max_results: 5,
            }),
          });
          const data = await response.json();

          if (Array.isArray(data.results)) {
            for (const item of data.results) {
              if (
                item.url &&
                !collectedSources.some((s) => s.url === item.url)
              ) {
                collectedSources.push({
                  title: item.title || item.url,
                  url: item.url,
                });
              }
            }
          }
          return { results: data.results };
        },
      }),

      extractWebsite: tool({
        description:
          "Extracts and reads the full content of a specific website URL (e.g., a competitor's homepage or pricing page).",
        inputSchema: z.object({
          url: z
            .string()
            .url()
            .describe("The exact URL to extract content from"),
        }),
        execute: async ({ url }) => {
          toolsUsed.push(`Analyzed URL: ${url}`);
          const response = await fetch("https://tavily.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              urls: [url],
            }),
          });
          const data = await response.json();
          collectedSources.push({ title: url, url });
          return { extracted: data.results };
        },
      }),
    };

    if (mode === "report") {
      const result = await generateText({
        model: google("gemini-3.5-flash-lite"),
        maxRetries: 1,
        messages,
        system: `You are a Senior Market Research Analyst. Run 1 or 2 targeted searches using 'searchInternet' or 'extractWebsite' to gather real facts, then immediately generate the structured SWOT and market report.`,
        stopWhen: stepCountIs(10),
        tools,
        output: Output.object({ schema: MarketReportSchema }),
      });

      if (sessionId) {
        await db.insert(messagesTable).values({
          sessionId,
          role: "assistant",
          content: "",
          report: result.output,
          sources: collectedSources,
          toolsUsed,
        });
      }

      return Response.json({
        mode: "report",
        report: result.output,
        sources: collectedSources,
        toolsUsed,
      });
    }

    const result = await generateText({
      model: google("gemini-3.5-flash-lite"),
      maxRetries: 1,
      messages,
      system: `You are an Expert AI Market Research Agent. Run 1 or 2 targeted tool calls ('searchInternet' or 'extractWebsite') to gather live facts, then immediately write a clear, data-backed summary for the user.`,
      stopWhen: stepCountIs(10),
      tools,
    });

    const replyText = result.text || "No response generated.";

    if (sessionId) {
      await db.insert(messagesTable).values({
        sessionId,
        role: "assistant",
        content: replyText,
        sources: collectedSources,
        toolsUsed,
      });
    }

    return Response.json({
      mode: "chat",
      reply: replyText,
      sources: collectedSources,
      toolsUsed,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
