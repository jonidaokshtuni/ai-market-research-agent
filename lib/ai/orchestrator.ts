import { generateText, Output, tool, stepCountIs } from "ai";
import { z } from "zod";

import { researchModel, AI_CONFIG } from "./models";
import { MARKET_RESEARCH_SYSTEM_PROMPT, SWOT_REPORT_PROMPT } from "./prompts";

import { searchInternet } from "@/lib/tools/search";
import { extractWebsite } from "@/lib/tools/extract";

const MarketReportSchema = z.object({
  summary: z.string(),
  keyTrends: z.array(z.string()),
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  recommendation: z.string(),
});

export type MarketReport = z.infer<typeof MarketReportSchema>;

export type ResearchSource = {
  title: string;
  url: string;
};

export type ResearchResult = {
  reply: string;
  report: MarketReport | null;
  sources: ResearchSource[];
  toolsUsed: string[];
};

export async function runResearchAgent({
  messages,
  mode,
}: {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  mode: "chat" | "report";
}): Promise<ResearchResult> {
  const sources: ResearchSource[] = [];
  const toolsUsed: string[] = [];

  const researchTools = {
    searchInternet: tool({
      description:
        "Search the internet for current market information, competitors, company data and industry trends.",
      inputSchema: z.object({
        query: z.string().min(1).max(500),
      }),
      execute: async ({ query }) => {
        const results = await searchInternet(query);

        toolsUsed.push("Web Search");

        for (const result of results) {
          if (!sources.some((source) => source.url === result.url)) {
            sources.push({
              title: result.title || result.url,
              url: result.url,
            });
          }
        }

        return results;
      },
    }),

    extractWebsite: tool({
      description:
        "Extract website content from a public HTTP or HTTPS URL supplied for market research.",
      inputSchema: z.object({
        url: z.string().url(),
      }),
      execute: async ({ url }) => {
        const results = await extractWebsite(url);

        toolsUsed.push("Website Extraction");

        for (const result of results) {
          if (!sources.some((source) => source.url === result.url)) {
            sources.push({
              title: result.url,
              url: result.url,
            });
          }
        }

        return results;
      },
    }),
  };

  const systemPrompt =
    mode === "report"
      ? `${MARKET_RESEARCH_SYSTEM_PROMPT}\n\n${SWOT_REPORT_PROMPT}`
      : MARKET_RESEARCH_SYSTEM_PROMPT;

  if (mode === "report") {
    const result = await generateText({
      model: researchModel,
      system: systemPrompt,
      messages,
      tools: researchTools,
      stopWhen: stepCountIs(AI_CONFIG.maxToolSteps),
      maxRetries: AI_CONFIG.maxRetries,
      output: Output.object({
        schema: MarketReportSchema,
      }),
    });

    return {
      reply: result.output.summary,
      report: result.output,
      sources,
      toolsUsed,
    };
  }

  const result = await generateText({
    model: researchModel,
    system: systemPrompt,
    messages,
    tools: researchTools,
    stopWhen: stepCountIs(AI_CONFIG.maxToolSteps),
    maxRetries: AI_CONFIG.maxRetries,
  });

  return {
    reply: result.text || "No research response was generated.",
    report: null,
    sources,
    toolsUsed,
  };
}
