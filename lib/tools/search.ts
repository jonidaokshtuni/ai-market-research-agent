import { z } from "zod";

const TavilyResultSchema = z.object({
  title: z.string().optional(),
  url: z.string().url(),
  content: z.string().optional(),
  score: z.number().optional(),
});

const TavilyResponseSchema = z.object({
  results: z.array(TavilyResultSchema),
});

export type SearchResult = z.infer<typeof TavilyResultSchema>;

export async function searchInternet(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const normalizedQuery = query.trim();

  if (!normalizedQuery || normalizedQuery.length > 500) {
    throw new Error("Search query must contain 1–500 characters.");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: normalizedQuery,
      search_depth: "advanced",
      max_results: 5,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed (${response.status}).`);
  }

  const data: unknown = await response.json();
  const parsed = TavilyResponseSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("Invalid response received from Tavily.");
  }

  return parsed.data.results;
}
