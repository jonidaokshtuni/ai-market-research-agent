
import "server-only";

import { env, pipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/multilingual-e5-small";

// Vercel's application directory is not writable.
// Use its temporary filesystem for downloaded model files.
env.cacheDir =
  process.env.TRANSFORMERS_CACHE || "/tmp/transformers-cache";

type EmbeddingPipeline = Awaited<
  ReturnType<typeof pipeline<"feature-extraction">>
>;

let pipelinePromise: Promise<EmbeddingPipeline> | null = null;

async function getEmbeddingPipeline(): Promise<EmbeddingPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline("feature-extraction", MODEL_ID, {
      dtype: "q8",
    });
  }

  try {
    return await pipelinePromise;
  } catch (error) {
    pipelinePromise = null;
    throw error;
  }
}

async function generateEmbedding(
  text: string,
  prefix: "passage" | "query"
): Promise<number[]> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("Cannot generate an embedding for empty text.");
  }

  const extractor = await getEmbeddingPipeline();

  const output = await extractor(`${prefix}: ${normalizedText}`, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data as Float32Array);

  if (embedding.length !== 384) {
    throw new Error(
      `Expected 384 embedding dimensions, received ${embedding.length}.`
    );
  }

  return embedding;
}

export function embedDocument(text: string): Promise<number[]> {
  return generateEmbedding(text, "passage");
}

export function embedQuery(text: string): Promise<number[]> {
  return generateEmbedding(text, "query");
}
