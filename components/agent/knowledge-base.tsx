
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type WorkspaceRole = "owner" | "admin" | "member";

type DocumentStatus = "pending" | "processing" | "completed" | "failed";

type KnowledgeDocument = {
  id: string;
  originalName: string;
  mimeType: string;
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
  uploadedBy: string;
  uploadedByName: string | null;
};

type KnowledgeBaseProps = {
  userId: string;
  workspaceRole: WorkspaceRole;
};

type ApiResponse<T> = T & {
  error?: string;
};

type DocumentsResponse = {
  documents: KnowledgeDocument[];
};

type UploadResponse = {
  success: boolean;
  documentId: string;
  chunkCount: number;
  scope: "workspace" | "personal";
};

const MAX_FILE_SIZE = 4.2 * 1024 * 1024;

const ACCEPTED_FILE_EXTENSIONS = /\.(pdf|docx|txt)$/i;

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "border-slate-600 bg-slate-800 text-slate-300",
  },
  processing: {
    label: "Processing",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  completed: {
    label: "Completed",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "border-red-500/30 bg-red-500/10 text-red-300",
  },
};

async function parseApiResponse<T>(
  response: Response
): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getFileExtension(filename: string): string {
  const extension = filename.split(".").pop();

  return extension && extension !== filename
    ? extension.toUpperCase()
    : "FILE";
}

function getUploaderName(
  document: KnowledgeDocument,
  currentUserId: string
): string {
  if (document.uploadedBy === currentUserId) {
    return "You";
  }

  return document.uploadedByName || "Workspace member";
}

export default function KnowledgeBase({
  userId,
  workspaceRole,
}: KnowledgeBaseProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadInProgressRef = useRef(false);

  const canDeleteAnyDocument =
    workspaceRole === "owner" || workspaceRole === "admin";

  const canDeleteDocument = useCallback(
    (document: KnowledgeDocument) =>
      canDeleteAnyDocument || document.uploadedBy === userId,
    [canDeleteAnyDocument, userId]
  );

const loadDocuments = useCallback(
  async (signal?: AbortSignal, showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/knowledge/documents", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal,
      });

      const result = await parseApiResponse<DocumentsResponse>(response);

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load knowledge documents."
        );
      }

      setDocuments(Array.isArray(result.documents) ? result.documents : []);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading documents."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);

        if (showRefreshIndicator) {
          setRefreshing(false);
        }
      }
    }
  },
  []
);

useEffect(() => {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    void loadDocuments(controller.signal);
  }, 0);

  return () => {
    window.clearTimeout(timeoutId);
    controller.abort();
  };
}, [loadDocuments]);

// Automatically refresh documents while processing is in progress.
useEffect(() => {
  const hasProcessingDocuments = documents.some(
    (document) =>
      document.status === "pending" ||
      document.status === "processing"
  );

  if (!hasProcessingDocuments) {
    return;
  }

  const timeoutId = window.setTimeout(() => {
    void loadDocuments();
  }, 2000);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [documents, loadDocuments]);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_FILE_EXTENSIONS.test(file.name)) {
      return "Unsupported file format. Please upload a PDF, DOCX, or TXT file.";
    }

    if (file.size === 0) {
      return "The selected file is empty.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "The file exceeds the maximum allowed size of 4.2 MB.";
    }

    return null;
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    // Reset the input so the same file can be selected again.
    input.value = "";

    if (!file || uploadInProgressRef.current) {
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    uploadInProgressRef.current = true;

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      const data = await parseApiResponse<UploadResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Document upload failed.");
      }

      setSuccess(
        `${file.name} was uploaded and processed successfully. ` +
          `${data.chunkCount} searchable chunks created.`
      );

      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during upload."
      );
    } finally {
      uploadInProgressRef.current = false;
      setUploading(false);
    }
  }

  async function handleDelete(document: KnowledgeDocument) {
    if (!canDeleteDocument(document) || deletingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${document.originalName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(document.id);
      setError(null);
      setSuccess(null);

      const response = await fetch(
        `/api/knowledge/documents?id=${encodeURIComponent(document.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await parseApiResponse<{ deleted: boolean }>(response);

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete this document.");
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter(({ id }) => id !== document.id)
      );

      setSuccess(`"${document.originalName}" was successfully deleted.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while deleting the document."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      aria-labelledby="knowledge-base-heading"
      className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="text-lg text-indigo-300"
            >
              ✦
            </span>

            <h2
              id="knowledge-base-heading"
              className="text-base font-semibold text-white"
            >
              Knowledge Base
            </h2>

            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {documents.length}{" "}
              {documents.length === 1 ? "document" : "documents"}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            Manage the documents available to your workspace research agent.
          </p>
        </div>

        <div>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain"
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
            aria-label="Select a document to upload"
          />

          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {uploading ? "Uploading and processing..." : "+ Upload document"}
          </button>
        </div>
      </div>

      {/* Upload information */}
      <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-4 py-3">
        <p className="text-xs leading-5 text-slate-500">
          Supported formats: PDF, DOCX, and TXT. Maximum file size: 4.2 MB.
          Documents are extracted, chunked, and embedded for semantic retrieval.
        </p>
      </div>

      {/* Feedback */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      {/* Document list */}
      <div className="mt-4">
        {loading ? (
          <div
            className="py-6 text-center text-sm text-slate-500"
            aria-live="polite"
          >
            Loading workspace documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-300">
              Your knowledge base is empty
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Upload your first document to provide additional context to your
              research agent.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {documents.map((document) => {
              const status = STATUS_CONFIG[document.status];
              const canDelete = canDeleteDocument(document);
              const isDeleting = deletingId === document.id;

              return (
                <article
                  key={document.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold uppercase text-indigo-300">
                      {getFileExtension(document.originalName)}
                    </div>

                    <div className="min-w-0">
                      <h3
                        title={document.originalName}
                        className="truncate text-sm font-medium text-slate-200"
                      >
                        {document.originalName}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Uploaded by{" "}
                        {getUploaderName(document, userId)}
                        {" · "}
                        {formatDate(document.createdAt)}
                      </p>

                      {document.status === "failed" && document.error && (
                        <p className="mt-1 text-xs text-red-400">
                          {document.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${status.className}`}
                    >
                      {status.label}
                    </span>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(document)}
                        disabled={deletingId !== null}
                        aria-label={`Delete ${document.originalName}`}
                        className="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void loadDocuments(undefined, true)}
          disabled={loading || refreshing || uploading || deletingId !== null}
          className="text-xs text-slate-500 transition hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {refreshing ? "Refreshing..." : "Refresh documents"}
        </button>
      </div>
    </section>
  );
}
