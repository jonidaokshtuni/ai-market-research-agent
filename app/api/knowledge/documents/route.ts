
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { knowledgeDocuments, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }

  return request.headers.get("sec-fetch-site") !== "cross-site";
}

// List documents belonging to the authenticated user's active workspace.
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return Response.json(
        { error: "No active workspace found." },
        { status: 403 }
      );
    }

    const documents = await db
      .select({
        id: knowledgeDocuments.id,
        name: knowledgeDocuments.name,
        originalName: knowledgeDocuments.originalName,
        mimeType: knowledgeDocuments.mimeType,
        status: knowledgeDocuments.status,
        error: knowledgeDocuments.error,
        createdAt: knowledgeDocuments.createdAt,
        uploadedBy: knowledgeDocuments.uploadedBy,
        uploadedByName: users.name,
      })
      .from(knowledgeDocuments)
      .leftJoin(users, eq(knowledgeDocuments.uploadedBy, users.id))
      .where(eq(knowledgeDocuments.organizationId, workspace.id))
      .orderBy(desc(knowledgeDocuments.createdAt));

    return Response.json({ documents });
  } catch (error) {
    console.error("Failed to load knowledge documents:", error);

    return Response.json(
      { error: "Unable to load knowledge documents." },
      { status: 500 }
    );
  }
}

// Delete a document and its chunks.
// Owners/admins can delete any workspace document.
// Members can delete only documents they uploaded.
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (!isSameOriginRequest(request)) {
      return Response.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 }
      );
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return Response.json(
        { error: "No active workspace found." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !UUID_PATTERN.test(id)) {
      return Response.json(
        { error: "A valid document ID is required." },
        { status: 400 }
      );
    }

    const canDeleteAnyDocument =
      workspace.role === "owner" || workspace.role === "admin";

    const conditions = [
      eq(knowledgeDocuments.id, id),
      eq(knowledgeDocuments.organizationId, workspace.id),
    ];

    if (!canDeleteAnyDocument) {
      conditions.push(eq(knowledgeDocuments.uploadedBy, user.id));
    }

    const [deletedDocument] = await db
      .delete(knowledgeDocuments)
      .where(and(...conditions))
      .returning({ id: knowledgeDocuments.id });

    if (!deletedDocument) {
      return Response.json(
        {
          error:
            "Document not found or you do not have permission to delete it.",
        },
        { status: 404 }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete knowledge document:", error);

    return Response.json(
      { error: "Unable to delete this document." },
      { status: 500 }
    );
  }
}
