
import { google } from "@ai-sdk/google";

// Primary model
export const researchModel = google("gemini-3.5-flash-lite");

// Fallback model, used when the primary model is temporarily unavailable
export const researchFallbackModel = google("gemini-3.1-flash-lite");

export const AI_CONFIG = {
  maxRetries: 1,
  maxToolSteps: 2,
  maxSearchResults: 5,
  maxResearchQueries: 4,
} as const;
