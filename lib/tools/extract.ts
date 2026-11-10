import { z } from "zod";

const TavilyExtractResponseSchema = z.object({
  results: z.array(
    z.object({
      url: z.string().url(),
      raw_content: z.string().optional(),
      images: z.array(z.string()).optional(),
    })
  ),
});

function validatePublicUrl(input: string): URL {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid website URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not allowed.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal" ||
    hostname === "169.254.169.254" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error("Private or local URLs are not allowed.");
  }

  return url;
}

export async function extractWebsite(input: string) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const url = validatePublicUrl(input);

  const response = await fetch("https://api.tavily.com/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      urls: [url.toString()],
      extract_depth: "advanced",
      format: "text",
    }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tavily extraction failed (${response.status}).`);
  }

  const data: unknown = await response.json();
  const parsed = TavilyExtractResponseSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("Invalid extraction response from Tavily.");
  }

  return parsed.data.results;
}
