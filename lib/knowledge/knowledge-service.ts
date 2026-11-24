
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { knowledgeChunks, knowledgeDocuments } from "@/db/schema";

import { chunkText } from "./chunking";
import { embedDocument } from "./embeddings";
import {
  extractDocumentText,
  DocumentValidationError,
} from "./ingestion";

const MAX_CHUNKS_PER_DOCUMENT = 100;

export type ProcessDocumentInput = {
  file: File;
  userId: string;
  organizationId: string | null;
};

export type ProcessDocumentResult = {
  documentId: string;
  chunkCount: number;
};

function validateEmbedding(embedding: number[]): void {
  if (
    embedding.length !== 384 ||
    !embedding.every(Number.isFinite)
  ) {
    throw new Error("Invalid embedding generated.");
  }
}

/**
 * Extracts, chunks, embeds, and persists an uploaded document.
 *
 * The caller is responsible for authenticating the user and verifying
 * organization membership before passing organizationId.
 */
export async function processUploadedDocument(
  input: ProcessDocumentInput
): Promise<ProcessDocumentResult> {
  const { file, userId, organizationId } = input;

  if (!userId) {
    throw new Error("An authenticated user is required.");
  }

  // Extract and validate before creating a database record.
  const extracted = await extractDocumentText(file);
  const chunks = chunkText(extracted.text);

  if (chunks.length === 0) {
    throw new DocumentValidationError(
      "The document does not contain enough readable text."
    );
  }

  // Prevent unexpectedly expensive Vercel function executions.
  if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
    throw new DocumentValidationError(
      `The document is too large to process. The maximum is ${MAX_CHUNKS_PER_DOCUMENT} chunks.`
    );
  }

  // Create an unpublished document record.
  const [document] = await db
    .insert(knowledgeDocuments)
    .values({
      uploadedBy: userId,
      organizationId,
      name: file.name,
      originalName: file.name,
      mimeType: extracted.mimeType,
      sourceType: "upload",
      status: "processing",
      metadata: {
        originalSize: extracted.originalSize,
        chunkCount: chunks.length,
      },
    })
    .returning({
      id: knowledgeDocuments.id,
    });

  if (!document) {
    throw new Error("Could not create the knowledge document.");
  }

  try {
    const chunkRows = [];

    // Sequential embedding generation keeps memory and CPU concurrency
    // bounded within the serverless function.
    for (const chunk of chunks) {
      const embedding = await embedDocument(chunk.content);

      validateEmbedding(embedding);

      chunkRows.push({
        documentId: document.id,
        organizationId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding,
      });
    }

    // Neon HTTP batch executes these statements transactionally.
    // The document becomes visible to retrieval only if both succeed.
    await db.batch([
      db
        .insert(knowledgeChunks)
        .values(chunkRows),

      db
        .update(knowledgeDocuments)
        .set({
          status: "completed",
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeDocuments.id, document.id)),
    ]);

    return {
      documentId: document.id,
      chunkCount: chunkRows.length,
    };
  } catch (error) {
    // No chunk rows should have been committed if the final batch failed.
    // Keep the document unavailable even if failure reporting itself fails.
    try {
      await db
        .update(knowledgeDocuments)
        .set({
          status: "failed",
          error: "Document processing failed.",
          updatedAt: new Date(),
        })
        .where(eq(knowledgeDocuments.id, document.id));
    } catch {
      // The document remains non-retrievable unless it was marked completed.
    }

    throw error;
  }
}
