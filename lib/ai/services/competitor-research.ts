import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  competitors,
  competitorSnapshots,
  competitorComparisons,
} from "@/db/schema";

import { runCompetitorAnalyst } from "@/lib/ai/agents/competitor-analyst";
import { detectCompetitorChanges } from "@/lib/ai/agents/competitor-change-detector";

type RunCompetitorResearchInput = {
  competitorId: string;
  userId: string;
};

export async function runAndSaveCompetitorResearch({
  competitorId,
  userId,
}: RunCompetitorResearchInput) {
  // Retrieve the competitor, enforcing ownership.
  const [competitor] = await db
    .select()
    .from(competitors)
    .where(
      and(eq(competitors.id, competitorId), eq(competitors.userId, userId))
    )
    .limit(1);

  if (!competitor) {
    return null;
  }

  // Retrieve the most recent previous snapshot.
  // This must happen before inserting the new snapshot.
  const [previousSnapshot] = await db
    .select()
    .from(competitorSnapshots)
    .where(
      and(
        eq(competitorSnapshots.competitorId, competitorId),
        eq(competitorSnapshots.userId, userId)
      )
    )
    .orderBy(desc(competitorSnapshots.createdAt), desc(competitorSnapshots.id))
    .limit(1);

  // Build a research task using the saved competitor information.
  const researchTask = `
Conduct an in-depth competitive intelligence investigation
of the following company.

COMPETITOR PROFILE

Name: ${competitor.name}
Website: ${competitor.website || "Not provided"}
Industry: ${competitor.industry || "Not provided"}
Description: ${competitor.description || "Not provided"}
Products: ${competitor.products || "Not provided"}
Pricing: ${competitor.pricing || "Not provided"}
Known strengths: ${competitor.strengths || "Not provided"}
Known weaknesses: ${competitor.weaknesses || "Not provided"}

RESEARCH OBJECTIVES

1. Investigate the company's current products and services.
2. Analyze its pricing and business model where information is available.
3. Examine its market positioning and differentiation.
4. Identify recent product launches, announcements, and strategic developments.
5. Analyze competitive strengths and weaknesses.
6. Identify potential opportunities and threats.
7. Compare new findings with the supplied profile where possible.

RESEARCH REQUIREMENTS

- Prioritize recent and verifiable information.
- Prefer official company sources and credible publications.
- Use the company's official website when available.
- Include source URLs in findings whenever possible.
- Never invent pricing, financial figures, or market share.
- Clearly explain uncertainty and research limitations.
- Provide specific, actionable strategic insights.
`;

  // Run the existing AI competitor analyst.
  const analysis = await runCompetitorAnalyst({
    task: researchTask,
  });

  // Save the completed research as a historical snapshot.
  const [snapshot] = await db
    .insert(competitorSnapshots)
    .values({
      competitorId: competitor.id,
      userId,
      researchTask,
      summary: analysis.result.summary,
      findings: analysis.result.findings,
      keyInsights: analysis.result.keyInsights,
      limitations: analysis.result.limitations,
      sources: analysis.sources,
      toolsUsed: analysis.toolsUsed,
    })
    .returning();

  // The first research run has no previous snapshot to compare.
  if (!previousSnapshot) {
    return snapshot;
  }

  // Detect changes without risking the successfully saved research.
  try {
    const comparison = await detectCompetitorChanges({
      competitorName: competitor.name,

      previousSnapshot: {
        summary: previousSnapshot.summary,
        findings: previousSnapshot.findings,
        keyInsights: previousSnapshot.keyInsights,
        limitations: previousSnapshot.limitations,
        sources: previousSnapshot.sources,
        createdAt: previousSnapshot.createdAt,
      },

      currentSnapshot: {
        summary: snapshot.summary,
        findings: snapshot.findings,
        keyInsights: snapshot.keyInsights,
        limitations: snapshot.limitations,
        sources: snapshot.sources,
        createdAt: snapshot.createdAt,
      },
    });

    // Persist the comparison between the two snapshots.
    await db.insert(competitorComparisons).values({
      competitorId: competitor.id,
      userId,
      previousSnapshotId: previousSnapshot.id,
      currentSnapshotId: snapshot.id,
      summary: comparison.summary,
      overallImpact: comparison.overallImpact,
      changes: comparison.changes,
      limitations: comparison.limitations,
      sources: [
        ...new Map(
          comparison.changes
            .flatMap((change) => change.sources)
            .map((source) => [source.url, source])
        ).values(),
      ],
    });

    console.info(
      `[Competitor Change Detection] Comparison saved for ${competitor.name}`
    );
  } catch (error) {
    console.error(
      `[Competitor Change Detection] Failed for ${competitor.name}:`,
      error
    );
  }

  // Preserve the existing service return value.
  return snapshot;
}
