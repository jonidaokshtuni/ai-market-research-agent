import { generateText, Output } from "ai";
import { z } from "zod";

import { researchModel, AI_CONFIG } from "../models";

import { runMarketResearcher } from "./market-researcher";
import { runCompetitorAnalyst } from "./competitor-analyst";
import { runFinancialAnalyst } from "./financial-analyst";
import { runRiskAnalyst } from "./risk-analyst";

const ResearchPlanSchema = z.object({
  marketResearchTask: z.string(),
  competitorAnalysisTask: z.string(),
  financialAnalysisTask: z.string(),
  riskAnalysisTask: z.string(),
});

export type ResearchPlan = z.infer<typeof ResearchPlanSchema>;

// Wait between specialists to reduce API request bursts.
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runResearchCoordinator({ task }: { task: string }) {
  // Step 1: Create the research plan.
  const planResponse = await generateText({
    model: researchModel,
    system: `You are a Research Coordinator.
Divide the user's research request into four focused tasks:
1. Market research
2. Competitor analysis
3. Financial analysis
4. Risk analysis

Keep each task specific, relevant, and concise.
Do not perform the research yourself.`,
    prompt: `Original research request:\n\n${task}`,
    maxRetries: AI_CONFIG.maxRetries,
    output: Output.object({ schema: ResearchPlanSchema }),
  });

  const plan = planResponse.output;

  // Step 2: Run specialists sequentially instead of simultaneously.
  const marketResearch = await runMarketResearcher({
    task: plan.marketResearchTask,
  });

  await delay(10000);

  const competitorAnalysis = await runCompetitorAnalyst({
    task: plan.competitorAnalysisTask,
  });

  await delay(10000);

  const financialAnalysis = await runFinancialAnalyst({
    task: plan.financialAnalysisTask,
  });

  await delay(10000);

  const riskAnalysis = await runRiskAnalyst({
    task: plan.riskAnalysisTask,
  });

  // Step 3: Combine sources and tools.
  const allSources = [
    ...marketResearch.sources,
    ...competitorAnalysis.sources,
    ...financialAnalysis.sources,
    ...riskAnalysis.sources,
  ];

  const uniqueSources = Array.from(
    new Map(allSources.map((source) => [source.url, source])).values()
  );

  const allToolsUsed = [
    ...marketResearch.toolsUsed,
    ...competitorAnalysis.toolsUsed,
    ...financialAnalysis.toolsUsed,
    ...riskAnalysis.toolsUsed,
  ];

  return {
    originalTask: task,
    plan,
    agents: [
      marketResearch.result,
      competitorAnalysis.result,
      financialAnalysis.result,
      riskAnalysis.result,
    ],
    sources: uniqueSources,
    toolsUsed: [...new Set(allToolsUsed)],
  };
}
