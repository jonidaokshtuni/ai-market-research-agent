import { generateText, Output, tool, stepCountIs } from "ai";
import { z } from "zod";

import { researchModel, AI_CONFIG } from "../models";
import { searchInternet } from "@/lib/tools/search";
import { extractWebsite } from "@/lib/tools/extract";

import { AgentResultSchema } from "../schemas/agent-results";

const FinancialAnalystResultSchema = AgentResultSchema.extend({
  agentName: z.literal("financial-analyst"),
});

export type FinancialAnalystOutput = z.infer<
  typeof FinancialAnalystResultSchema
>;

export async function runFinancialAnalyst({ task }: { task: string }): Promise<{
  result: FinancialAnalystOutput;
  sources: { title: string; url: string }[];
  toolsUsed: string[];
}> {
  const sources: { title: string; url: string }[] = [];
  const toolsUsed: string[] = [];

  const researchTools = {
    searchInternet: tool({
      description:
        "Search for company financial information, revenue, profitability, funding, valuation, financial performance and industry financial benchmarks.",
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
        "Extract public financial reports, investor relations pages and company websites for financial analysis.",
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
You are the Financial Analyst in an AI Market Research team.

YOUR RESPONSIBILITIES:
1. Research publicly available company financial information.
2. Analyze revenue, profitability and financial performance when reliable data exists.
3. Investigate funding rounds, investments and valuations.
4. Identify relevant industry financial benchmarks.
5. Assess potential business models and revenue opportunities.
6. Identify financial strengths, weaknesses and constraints.

RESEARCH RULES:
- Use web search to gather current financial information.
- Extract official financial reports and investor relations pages when useful.
- Prefer audited reports, regulatory filings and official company disclosures.
- Never invent revenue, profit, funding, valuation or financial ratios.
- Clearly distinguish reported figures, estimates and projections.
- Include reporting periods and currencies whenever available.
- Report limitations when reliable financial information is unavailable.
- Focus on business and industry financial analysis, not personal financial advice.

OUTPUT:
Return structured findings following the provided schema.
Provide actionable insights and explain the evidence behind important conclusions.
`;

  const response = await generateText({
    model: researchModel,
    system: systemPrompt,
    prompt: task,
    tools: researchTools,
    stopWhen: stepCountIs(AI_CONFIG.maxToolSteps),
    maxRetries: AI_CONFIG.maxRetries,
    output: Output.object({
      schema: FinancialAnalystResultSchema,
    }),
  });

  return {
    result: response.output,
    sources,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
