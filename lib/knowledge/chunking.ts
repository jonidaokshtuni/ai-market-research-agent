
const MAX_CHUNK_CHARACTERS = 1_200;
const CHUNK_OVERLAP_CHARACTERS = 180;

export type TextChunk = {
  chunkIndex: number;
  content: string;
};

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits oversized text without breaking Unicode surrogate pairs.
 */
function splitLongText(text: string): string[] {
  const characters = Array.from(text);
  const segments: string[] = [];

  let start = 0;

  while (start < characters.length) {
    const end = Math.min(
      start + MAX_CHUNK_CHARACTERS,
      characters.length
    );

    const segment = characters.slice(start, end).join("").trim();

    if (segment) {
      segments.push(segment);
    }

    if (end >= characters.length) {
      break;
    }

    start = Math.max(end - CHUNK_OVERLAP_CHARACTERS, start + 1);
  }

  return segments;
}

/**
 * Splits a paragraph into sentence-sized units where possible.
 */
function splitParagraph(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHUNK_CHARACTERS) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[.!?。！？])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  // If sentence splitting cannot produce useful smaller units,
  // fall back to bounded Unicode-safe splitting.
  if (sentences.length <= 1) {
    return splitLongText(paragraph);
  }

  const result: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= MAX_CHUNK_CHARACTERS) {
      result.push(sentence);
    } else {
      result.push(...splitLongText(sentence));
    }
  }

  return result;
}

/**
 * Converts extracted document text into overlapping chunks.
 *
 * Character limits are intentionally conservative because the
 * multilingual embedding model has a finite token context window.
 */
export function chunkText(text: string): TextChunk[] {
  if (typeof text !== "string") {
    throw new TypeError("Document text must be a string.");
  }

  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const units = paragraphs.flatMap(splitParagraph);

  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    const candidate = current
      ? `${current}\n\n${unit}`
      : unit;

    if (candidate.length <= MAX_CHUNK_CHARACTERS) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    // Carry a small amount of context into the next chunk.
    const overlap = current
      ? Array.from(current)
          .slice(-CHUNK_OVERLAP_CHARACTERS)
          .join("")
      : "";

    const next = overlap ? `${overlap}\n\n${unit}` : unit;

    if (next.length <= MAX_CHUNK_CHARACTERS) {
      current = next;
    } else {
      const split = splitLongText(unit);

      if (overlap && split.length > 0) {
        const first = `${overlap}\n\n${split[0]}`;

        if (first.length <= MAX_CHUNK_CHARACTERS) {
          chunks.push(first);
          chunks.push(...split.slice(1));
        } else {
          chunks.push(...split);
        }
      } else {
        chunks.push(...split);
      }

      current = "";
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks
    .map((content) => content.trim())
    .filter(Boolean)
    .map((content, chunkIndex) => ({
      chunkIndex,
      content,
    }));
}
