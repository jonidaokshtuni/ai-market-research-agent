import { z } from "zod";

export const AgentSourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
});

export const AgentFindingSchema = z.object({
  title: z.string(),
  description: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  sources: z.array(AgentSourceSchema).default([]),
});

/**
 * Standard output returned by every specialist.
 */
export const AgentResultSchema = z.object({
  agentName: z.enum([
    "market-researcher",
    "competitor-analyst",
    "financial-analyst",
    "risk-analyst",
  ]),

  summary: z.string(),

  findings: z.array(AgentFindingSchema),

  keyInsights: z.array(z.string()),

  limitations: z.array(z.string()).default([]),
});

export type AgentSource = z.infer<typeof AgentSourceSchema>;

export type AgentFinding = z.infer<typeof AgentFindingSchema>;

export type AgentResult = z.infer<typeof AgentResultSchema>;

export type AgentName = AgentResult["agentName"];
