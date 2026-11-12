"use client";

import { useCallback, useEffect, useState } from "react";
import type { Competitor, CompetitorFormValues } from "./types";
import CompetitorForm from "./competitor-form";
import CompetitorList from "./competitor-list";
import CompetitorSkeleton from "./competitor-skeleton";
import Modal from "@/components/ui/modal";

type ApiError = {
  error?: string;
  message?: string;
};

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;

    return (
      data.error ||
      data.message ||
      `Request failed with status ${response.status}.`
    );
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

function parseCompetitorsResponse(data: unknown): Competitor[] {
  const result = Array.isArray(data)
    ? data
    : data &&
      typeof data === "object" &&
      "competitors" in data &&
      Array.isArray(data.competitors)
    ? data.competitors
    : null;

  if (!result) {
    throw new Error("The server returned an invalid competitors response.");
  }

  return result as Competitor[];
}

export default function CompetitorManager() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] =
    useState<Competitor | null>(null);

  const [competitorToDelete, setCompetitorToDelete] =
    useState<Competitor | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCompetitors = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/competitors", {
        method: "GET",
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data: unknown = await response.json();

      setCompetitors(parseCompetitorsResponse(data));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load competitors. Please try again."
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial data loading.
  useEffect(() => {
    const controller = new AbortController();

    async function fetchInitialCompetitors() {
      try {
        const response = await fetch("/api/competitors", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const data: unknown = await response.json();

        if (!controller.signal.aborted) {
          setCompetitors(parseCompetitorsResponse(data));
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load competitors. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchInitialCompetitors();

    return () => controller.abort();
  }, []);

  function openCreateForm() {
    setSelectedCompetitor(null);
    setIsFormOpen(true);
    setError("");
    setSuccess("");
  }

  function openEditForm(competitor: Competitor) {
    setSelectedCompetitor(competitor);
    setIsFormOpen(true);
    setError("");
    setSuccess("");
  }

  function closeForm() {
    if (isSaving) return;

    setIsFormOpen(false);
    setSelectedCompetitor(null);
  }

  async function handleSubmit(values: CompetitorFormValues) {
    setIsSaving(true);
    setError("");
    setSuccess("");

    const isEditing = Boolean(selectedCompetitor);

    try {
      const response = await fetch(
        isEditing
          ? `/api/competitors/${selectedCompetitor!.id}`
          : "/api/competitors",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await loadCompetitors();

      setIsFormOpen(false);
      setSelectedCompetitor(null);

      setSuccess(
        isEditing
          ? "Competitor updated successfully."
          : "Competitor added successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save competitor. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!competitorToDelete || deletingId) return;

    const competitor = competitorToDelete;

    setDeletingId(competitor.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/competitors/${competitor.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setCompetitors((current) =>
        current.filter((item) => item.id !== competitor.id)
      );

      setCompetitorToDelete(null);
      setSuccess(`${competitor.name} was deleted successfully.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete competitor. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-7">
      {/* Page actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Your competitors</h2>

          <p className="mt-1 text-sm text-slate-400">
            Manage and compare companies in your competitive landscape.
          </p>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Add competitor
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-300">{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-left text-sm font-medium text-red-300 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
        >
          <p className="text-sm text-emerald-300">{success}</p>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
            className="text-emerald-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Competitor form */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={closeForm}
          title={selectedCompetitor ? "Edit competitor" : "Add competitor"}
          description="Manage your competitor's information."
          size="lg"
        >
          <CompetitorForm
            key={selectedCompetitor?.id ?? "new"}
            competitor={selectedCompetitor}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {/* Competitor collection */}
      {isLoading ? (
        <CompetitorSkeleton count={6} />
      ) : (
        <CompetitorList
          competitors={competitors}
          onEdit={openEditForm}
          onDelete={setCompetitorToDelete}
          deletingId={deletingId}
        />
      )}

      {/* Delete confirmation dialog */}
      {competitorToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) {
              setCompetitorToDelete(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/10 text-xl text-red-400">
              !
            </div>

            <h2
              id="delete-dialog-title"
              className="mt-5 text-lg font-semibold text-white"
            >
              Delete competitor?
            </h2>

            <p
              id="delete-dialog-description"
              className="mt-2 text-sm leading-6 text-slate-400"
            >
              Are you sure you want to delete{" "}
              <strong className="text-white">{competitorToDelete.name}</strong>?
              This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setCompetitorToDelete(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId ? "Deleting..." : "Delete competitor"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
