import { generateText, Output, tool, stepCountIs } from "ai";
import { z } from "zod";

import { researchModel, AI_CONFIG } from "../models";
import { searchInternet } from "@/lib/tools/search";
import { extractWebsite } from "@/lib/tools/extract";

import { AgentResultSchema } from "../schemas/agent-results";

const CompetitorResultSchema = AgentResultSchema.extend({
  agentName: z.literal("competitor-analyst"),
});

export type CompetitorAnalysisOutput = z.infer<typeof CompetitorResultSchema>;

export async function runCompetitorAnalyst({
  task,
}: {
  task: string;
}): Promise<{
  result: CompetitorAnalysisOutput;
  sources: { title: string; url: string }[];
  toolsUsed: string[];
}> {
  const sources: { title: string; url: string }[] = [];
  const toolsUsed: string[] = [];

  const researchTools = {
    searchInternet: tool({
      description:
        "Search for competitors, competing products, pricing, positioning, market share and competitive strategies.",
      inputSchema: z.object({
        query: z.string().min(1).max(500),
      }),
      execute: async ({ query }) => {
        const results = await searchInternet(query);

        toolsUsed.push("Web Search");

        for (const item of results) {
          if (!sources.some((source) => source.url === item.url)) {
            sources.push({
              title: item.title || item.url,
              url: item.url,
            });
          }
        }

        return results;
      },
    }),

    extractWebsite: tool({
      description:
        "Extract public competitor websites to analyze products, services, pricing and positioning.",
      inputSchema: z.object({
        url: z.string().url(),
      }),
      execute: async ({ url }) => {
        const results = await extractWebsite(url);

        toolsUsed.push("Website Extraction");

        for (const item of results) {
          if (!sources.some((source) => source.url === item.url)) {
            sources.push({
              title: item.url,
              url: item.url,
            });
          }
        }

        return results;
      },
    }),
  };

  const systemPrompt = `
You are the Competitor Analyst in an AI Market Research team.

YOUR RESPONSIBILITIES:
1. Identify direct and indirect competitors.
2. Analyze competitor products and services.
3. Compare pricing and business positioning when information is available.
4. Identify competitors' strengths and weaknesses.
5. Investigate competitive advantages and differentiation.
6. Identify gaps that a new or existing business could exploit.

RESEARCH RULES:
- Use web search to gather current competitor information.
- Extract competitor websites when useful.
- Prefer official company websites and credible sources.
- Never invent competitor revenue, market share or pricing.
- Clearly distinguish verified information from estimates.
- Include source URLs in findings whenever available.
- Report limitations when information cannot be verified.
- Focus on competitive analysis, not general market sizing or financial forecasting.

OUTPUT:
Return structured findings following the provided schema.
Provide specific, actionable insights rather than generic statements.
`;

  const response = await generateText({
    model: researchModel,
    system: systemPrompt,
    prompt: task,
    tools: researchTools,
    stopWhen: stepCountIs(AI_CONFIG.maxToolSteps),
    maxRetries: AI_CONFIG.maxRetries,
    output: Output.object({
      schema: CompetitorResultSchema,
    }),
  });

  return {
    result: response.output,
    sources,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
