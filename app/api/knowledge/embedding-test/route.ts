
import { getCurrentUser } from "@/lib/auth";
import { embedQuery } from "@/lib/knowledge/embeddings";

export const maxDuration = 60;

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const startTime = Date.now();

    const embedding = await embedQuery(
      "Vercel server-side embedding runtime test"
    );

    const durationMs = Date.now() - startTime;

    if (
      embedding.length !== 384 ||
      !embedding.every(Number.isFinite)
    ) {
      throw new Error("Invalid embedding output.");
    }

    return Response.json({
      success: true,
      model: "Xenova/multilingual-e5-small",
      dimensions: embedding.length,
      allValuesFinite: true,
      durationMs,
    });
  } catch (error) {
    console.error("Embedding runtime test failed:", error);

    return Response.json(
      { error: "Embedding runtime test failed." },
      { status: 500 }
    );
  }
}
