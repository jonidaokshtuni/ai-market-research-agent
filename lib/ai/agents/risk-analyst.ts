import { generateText, Output, tool, stepCountIs } from "ai";
import { z } from "zod";

import { researchModel, AI_CONFIG } from "../models";
import { searchInternet } from "@/lib/tools/search";
import { extractWebsite } from "@/lib/tools/extract";

import { AgentResultSchema } from "../schemas/agent-results";

const RiskAnalystResultSchema = AgentResultSchema.extend({
  agentName: z.literal("risk-analyst"),
});

export type RiskAnalystOutput = z.infer<typeof RiskAnalystResultSchema>;

export async function runRiskAnalyst({ task }: { task: string }): Promise<{
  result: RiskAnalystOutput;
  sources: { title: string; url: string }[];
  toolsUsed: string[];
}> {
  const sources: { title: string; url: string }[] = [];
  const toolsUsed: string[] = [];

  const researchTools = {
    searchInternet: tool({
      description:
        "Search for market risks, regulatory changes, legal issues, economic threats, technology disruptions and industry challenges.",
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
        "Extract information from public government, regulatory, industry and company websites to investigate potential risks.",
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
You are the Risk Analyst in an AI Market Research team.

YOUR RESPONSIBILITIES:
1. Identify market and industry risks.
2. Investigate regulatory and legal challenges.
3. Analyze economic and geopolitical threats.
4. Identify technology and operational risks.
5. Investigate supply chain and competitive threats.
6. Assess potential barriers to market entry.
7. Recommend ways to mitigate important risks.

RESEARCH RULES:
- Use web search to investigate current risks.
- Extract official government, regulatory and industry sources when useful.
- Prefer credible and authoritative sources.
- Never invent regulations, statistics or incidents.
- Distinguish confirmed risks from potential scenarios.
- Explain the likely impact and importance of each risk.
- Include source URLs whenever available.
- Report limitations when reliable information is unavailable.
- Focus on risk analysis, not general competitor or financial analysis.

OUTPUT:
Return structured findings following the provided schema.
Make findings specific, evidence-based and actionable.
`;

  const response = await generateText({
    model: researchModel,
    system: systemPrompt,
    prompt: task,
    tools: researchTools,
    stopWhen: stepCountIs(AI_CONFIG.maxToolSteps),
    maxRetries: AI_CONFIG.maxRetries,
    output: Output.object({
      schema: RiskAnalystResultSchema,
    }),
  });

  return {
    result: response.output,
    sources,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
