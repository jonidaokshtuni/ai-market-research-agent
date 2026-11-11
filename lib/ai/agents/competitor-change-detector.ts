import { generateText, Output } from "ai";
import { z } from "zod";

import { researchModel, AI_CONFIG } from "../models";

// ------------------------------------------------------
// Change detection output schema
// ------------------------------------------------------

const CompetitorChangeSchema = z.object({
  category: z.enum([
    "product",
    "pricing",
    "positioning",
    "strategy",
    "strength",
    "weakness",
    "market",
  ]),

  changeType: z.enum(["new", "changed", "removed", "strategic_shift"]),

  title: z.string(),

  description: z.string(),

  previousValue: z.string().nullable(),

  currentValue: z.string().nullable(),

  impact: z.enum(["high", "medium", "low"]),

  confidence: z.enum(["high", "medium", "low"]),

  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
    })
  ),
});

const CompetitorChangeDetectionSchema = z.object({
  summary: z.string(),

  overallImpact: z.enum(["high", "medium", "low", "none"]),

  changes: z.array(CompetitorChangeSchema),

  limitations: z.array(z.string()),
});

// ------------------------------------------------------
// Snapshot types
// ------------------------------------------------------

type SnapshotFinding = {
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  sources: {
    title: string;
    url: string;
  }[];
};

export type CompetitorSnapshotForComparison = {
  summary: string;
  findings: SnapshotFinding[];
  keyInsights: string[];
  limitations: string[];
  sources: {
    title: string;
    url: string;
  }[];
  createdAt: Date;
};

// ------------------------------------------------------
// Agent
// ------------------------------------------------------

export async function detectCompetitorChanges({
  previousSnapshot,
  currentSnapshot,
  competitorName,
}: {
  previousSnapshot: CompetitorSnapshotForComparison;
  currentSnapshot: CompetitorSnapshotForComparison;
  competitorName: string;
}) {
  const previousResearch = {
    date: previousSnapshot.createdAt.toISOString(),
    summary: previousSnapshot.summary,
    findings: previousSnapshot.findings,
    keyInsights: previousSnapshot.keyInsights,
    limitations: previousSnapshot.limitations,
    sources: previousSnapshot.sources,
  };

  const currentResearch = {
    date: currentSnapshot.createdAt.toISOString(),
    summary: currentSnapshot.summary,
    findings: currentSnapshot.findings,
    keyInsights: currentSnapshot.keyInsights,
    limitations: currentSnapshot.limitations,
    sources: currentSnapshot.sources,
  };

  const prompt = `
Compare two competitor intelligence research snapshots
for the same company.

COMPETITOR
${competitorName}

PREVIOUS RESEARCH
${JSON.stringify(previousResearch, null, 2)}

CURRENT RESEARCH
${JSON.stringify(currentResearch, null, 2)}

YOUR OBJECTIVE

Identify meaningful developments that occurred between
the previous and current research snapshots.

ANALYZE THESE CATEGORIES

1. Products:
   New products, discontinued products, new features,
   product improvements, or service changes.

2. Pricing:
   Price increases, reductions, new pricing plans,
   packaging changes, and business model changes.

3. Positioning:
   Changes in target customers, market positioning,
   messaging, differentiation, or value proposition.

4. Strategy:
   Partnerships, acquisitions, expansion, launches,
   investments, and major strategic announcements.

5. Strengths:
   Newly demonstrated competitive advantages or
   improvements in existing strengths.

6. Weaknesses:
   Newly identified vulnerabilities or deterioration
   in previously identified capabilities.

7. Market:
   Relevant market developments affecting the
   competitor's competitive position.

IMPORTANT ANALYSIS RULES

- Compare the evidence, not just the wording.
- Do not report paraphrasing or minor wording differences
  as meaningful changes.
- Do not invent events, dates, pricing, figures, or claims.
- Never interpret missing information as proof that
  something was discontinued or removed.
- A "removed" change requires affirmative evidence
  that something was discontinued or withdrawn.
- If evidence is insufficient, do not report a change.
- Distinguish verified developments from uncertain
  observations using the confidence field.
- High impact means the change could materially affect
  competitive positioning or business decisions.
- Medium impact means the change may influence
  competitive performance.
- Low impact means the change is relatively minor.
- If no meaningful changes are supported by evidence,
  return an empty changes array and overallImpact "none".
- Do not force findings just to produce a non-empty result.

SOURCE REQUIREMENTS

- Use only URLs provided in the previous and current
  research snapshots.
- Never fabricate or modify source URLs.
- Attach relevant sources to each detected change.
- Prefer current snapshot sources when they support
  the newly identified development.
- If a change cannot be supported by a source,
  do not present it as a confirmed development.
- Explain insufficient evidence in limitations.

OUTPUT REQUIREMENTS

- Provide a concise but useful overall summary.
- Describe exactly what changed and why it matters.
- Populate previousValue and currentValue when
  the available evidence supports them.
- Use null when a value cannot be established.
- Return structured output matching the required schema.
`;

  const response = await generateText({
    model: researchModel,
    system: `
You are a senior competitive intelligence analyst
specializing in longitudinal competitor monitoring.

Your job is to identify genuine strategic changes
between historical research snapshots.

Accuracy, evidence, and analytical discipline are
more important than producing a large number of changes.

Never invent information or claim certainty without evidence.
`,
    prompt,
    maxRetries: AI_CONFIG.maxRetries,
    output: Output.object({
      schema: CompetitorChangeDetectionSchema,
    }),
  });

  return response.output;
}

export type CompetitorChangeDetection = z.infer<
  typeof CompetitorChangeDetectionSchema
>;
