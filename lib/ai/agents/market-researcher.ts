import { generateText, Output, tool, stepCountIs } from "ai";
import { z } from "zod";

import { researchModel, AI_CONFIG } from "../models";
import { searchInternet } from "@/lib/tools/search";
import { extractWebsite } from "@/lib/tools/extract";

import { AgentResultSchema } from "../schemas/agent-results";

const MarketResearchResultSchema = AgentResultSchema.extend({
  agentName: z.literal("market-researcher"),
});

export type MarketResearchOutput = z.infer<typeof MarketResearchResultSchema>;

export async function runMarketResearcher({ task }: { task: string }): Promise<{
  result: MarketResearchOutput;
  sources: { title: string; url: string }[];
  toolsUsed: string[];
}> {
  const sources: { title: string; url: string }[] = [];
  const toolsUsed: string[] = [];

  const researchTools = {
    searchInternet: tool({
      description:
        "Search the internet for reliable and current market research, industry statistics, market size, growth rates, customer demand and industry trends.",
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
        "Extract content from a public HTTP or HTTPS website to investigate market trends, statistics and industry information.",
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
You are the Market Research Specialist in an AI Market Research team.

YOUR RESPONSIBILITIES:
1. Investigate the target market and industry.
2. Identify market size and growth when reliable data is available.
3. Analyze customer demand and purchasing behavior.
4. Identify important industry trends.
5. Find market opportunities and emerging developments.

RESEARCH RULES:
- Use web search to gather current information.
- Extract relevant websites when useful.
- Prefer credible sources, industry reports and official statistics.
- Never invent market sizes, statistics or growth rates.
- Distinguish verified facts from estimates.
- Include source URLs in your findings when available.
- Report limitations when reliable information is unavailable.
- Focus on market research, not competitor financial analysis or general risk analysis.

OUTPUT:
Return structured findings following the provided schema.
Provide actionable insights rather than generic statements.
`;

  const response = await generateText({
    model: researchModel,
    system: systemPrompt,
    prompt: task,
    tools: researchTools,
    stopWhen: stepCountIs(AI_CONFIG.maxToolSteps),
    maxRetries: AI_CONFIG.maxRetries,
    output: Output.object({
      schema: MarketResearchResultSchema,
    }),
  });

  return {
    result: response.output,
    sources,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
