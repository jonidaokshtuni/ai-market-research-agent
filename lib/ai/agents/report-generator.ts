import { generateText, Output } from "ai";
import { z } from "zod";
import { researchModel, AI_CONFIG } from "../models";
import type { AgentResult } from "../schemas/agent-results";

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

export type GeneratedMarketReport = z.infer<typeof MarketReportSchema>;

export async function runReportGenerator({
  originalTask,
  agents,
}: {
  originalTask: string;
  agents: AgentResult[];
}): Promise<GeneratedMarketReport> {
  const researchData = agents.map((agent) => ({
    specialist: agent.agentName,
    summary: agent.summary,
    findings: agent.findings,
    keyInsights: agent.keyInsights,
    limitations: agent.limitations,
  }));

  const response = await generateText({
    model: researchModel,
    system: `
You are the Senior Market Research Report Generator.

Your job is to transform research findings from four specialist agents
into a professional, evidence-based market research report.

REPORT REQUIREMENTS:

1. SUMMARY
Provide a clear overview of the market, its current situation and
the most important conclusions.

2. KEY TRENDS
Identify the most important market and industry trends.
Avoid repeating the same trend in different words.

3. SWOT ANALYSIS
- Strengths: Internal advantages supported by the research.
- Weaknesses: Internal disadvantages or limitations.
- Opportunities: External opportunities supported by the research.
- Threats: External risks and competitive threats.

4. RECOMMENDATION
Provide a practical strategic recommendation based on the research.
Explain the most important next steps.

IMPORTANT RULES:
- Use only information supported by the supplied research.
- Never invent statistics, financial figures or market facts.
- Do not treat estimates as confirmed facts.
- Identify uncertainty when evidence is limited.
- Resolve conflicting findings carefully and mention important limitations.
- Do not invent source URLs.
- Be specific, analytical and actionable.
- Return exactly the requested structured report.
`,
    prompt: `
ORIGINAL RESEARCH REQUEST:

${originalTask}

SPECIALIST RESEARCH FINDINGS:

${JSON.stringify(researchData, null, 2)}

Generate the final market research report using these findings.
`,
    maxRetries: AI_CONFIG.maxRetries,
    output: Output.object({
      schema: MarketReportSchema,
    }),
  });

  return response.output;
}
