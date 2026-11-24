
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

// Groq is used only by the market researcher during our initial test.
export const marketResearchModel = groq("openai/gpt-oss-120b");

// Existing Gemini models remain available to the other agents.
export const researchModel = google("gemini-3.5-flash-lite");

// Gemini fallback models for the market researcher.
export const researchFallbackModel = google("gemini-3.1-flash-lite");

export const AI_CONFIG = {
  maxRetries: 1,
  maxToolSteps: 2,
  maxSearchResults: 5,
  maxResearchQueries: 4,
} as const;
