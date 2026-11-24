
import "server-only";

import {
  and,
  asc,
  eq,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  knowledgeChunks,
  knowledgeDocuments,
} from "@/db/schema";

import { embedQuery } from "./embeddings";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const MAX_QUERY_LENGTH = 8_000;

export type RetrieveKnowledgeInput = {
  query: string;
  userId: string;
  organizationId: string | null;
  limit?: number;
};

export type RetrievedChunk = {
  documentId: string;
  documentName: string;
  content: string;
  chunkIndex: number;
  distance: number;
  similarity: number;
};

/**
 * Retrieves relevant knowledge from:
 *
 * 1. The authenticated user's personal documents.
 * 2. The explicitly authorized workspace's documents.
 *
 * Workspace membership must be verified by the calling API/service.
 */
export async function retrieveKnowledge(
  input: RetrieveKnowledgeInput
): Promise<RetrievedChunk[]> {
  const {
    query,
    userId,
    organizationId,
  } = input;

  if (!userId) {
    throw new Error("An authenticated user is required.");
  }

  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  if (normalizedQuery.length > MAX_QUERY_LENGTH) {
    throw new Error("The search query is too long.");
  }

  const requestedLimit = input.limit ?? DEFAULT_LIMIT;

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(requestedLimit))
  );

  const queryEmbedding = await embedQuery(normalizedQuery);

  if (
    queryEmbedding.length !== 384 ||
    !queryEmbedding.every(Number.isFinite)
  ) {
    throw new Error("Invalid query embedding.");
  }

  // pgvector cosine distance. Lower values indicate closer matches.
  const distance = sql<number>`
    (${knowledgeChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)
  `;

  // Personal documents are visible only to their uploader.
  // Workspace documents are visible only inside the verified workspace.
  const personalAccess = and(
    isNull(knowledgeDocuments.organizationId),
    eq(knowledgeDocuments.uploadedBy, userId),
    isNull(knowledgeChunks.organizationId)
  );

  const visibilityCondition = organizationId
    ? or(
        personalAccess,
        and(
          eq(knowledgeDocuments.organizationId, organizationId),
          eq(knowledgeChunks.organizationId, organizationId)
        )
      )
    : personalAccess;

  const rows = await db
    .select({
      documentId: knowledgeDocuments.id,
      documentName: knowledgeDocuments.name,
      content: knowledgeChunks.content,
      chunkIndex: knowledgeChunks.chunkIndex,
      distance,
    })
    .from(knowledgeChunks)
    .innerJoin(
      knowledgeDocuments,
      eq(
        knowledgeChunks.documentId,
        knowledgeDocuments.id
      )
    )
    .where(
      and(
        eq(knowledgeDocuments.status, "completed"),
        visibilityCondition
      )
    )
    .orderBy(asc(distance))
    .limit(limit);

  return rows.map((row) => {
    const numericDistance = Number(row.distance);

    return {
      documentId: row.documentId,
      documentName: row.documentName,
      content: row.content,
      chunkIndex: row.chunkIndex,
      distance: numericDistance,
      similarity: 1 - numericDistance,
    };
  });
}
