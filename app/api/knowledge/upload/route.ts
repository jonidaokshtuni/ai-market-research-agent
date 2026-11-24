
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";
import { processUploadedDocument } from "@/lib/knowledge/knowledge-service";
import { DocumentValidationError } from "@/lib/knowledge/ingestion";

export const maxDuration = 60;

const MAX_REQUEST_SIZE = 4.5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // 1. Authenticate the user.
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // 2. Protect the cookie-authenticated endpoint against cross-origin uploads.
    const origin = request.headers.get("origin");

    if (origin) {
      let requestOrigin: string;

      try {
        requestOrigin = new URL(request.url).origin;

        if (new URL(origin).origin !== requestOrigin) {
          return Response.json(
            { error: "Invalid request origin." },
            { status: 403 }
          );
        }
      } catch {
        return Response.json(
          { error: "Invalid request origin." },
          { status: 403 }
        );
      }
    } else if (
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return Response.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 }
      );
    }

    // 3. Reject oversized requests before parsing multipart data.
    const contentLength = Number(
      request.headers.get("content-length") ?? "0"
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_REQUEST_SIZE
    ) {
      return Response.json(
        { error: "Upload request is too large." },
        { status: 413 }
      );
    }

    // 4. Parse the uploaded file.
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { error: "Invalid multipart upload." },
        { status: 400 }
      );
    }

    const uploadedFiles = formData.getAll("file");

    if (
      uploadedFiles.length !== 1 ||
      !(uploadedFiles[0] instanceof File)
    ) {
      return Response.json(
        { error: "Please provide exactly one file." },
        { status: 400 }
      );
    }

    const file = uploadedFiles[0];

    if (file.size === 0) {
      return Response.json(
        { error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    // 5. Resolve workspace access on the server.
    // Never trust an organization ID supplied by the browser.
    const workspace = await getActiveWorkspace(user.id);

    // 6. Extract, chunk, embed, and store the document.
    const result = await processUploadedDocument({
      file,
      userId: user.id,
      organizationId: workspace?.id ?? null,
    });

    return Response.json(
      {
        success: true,
        documentId: result.documentId,
        chunkCount: result.chunkCount,
        scope: workspace ? "workspace" : "personal",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("Knowledge upload failed:", error);

    return Response.json(
      { error: "Document upload and processing failed." },
      { status: 500 }
    );
  }
}
