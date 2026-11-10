import { google } from "@ai-sdk/google";

export const researchModel = google("gemini-3.5-flash-lite");

export const AI_CONFIG = {
  maxRetries: 2,
  maxToolSteps: 8,
  maxSearchResults: 5,
  maxResearchQueries: 4,
} as const;
