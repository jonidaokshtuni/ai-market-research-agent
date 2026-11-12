"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  role: "owner" | "admin";
};

type JoinRequest = {
  id: string;
  status: "pending";
  createdAt: string;
  requester: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function WorkspaceJoinRequests({
  workspaces,
}: {
  workspaces: Workspace[];
}) {
  const [organizationId, setOrganizationId] = useState(workspaces[0]?.id ?? "");
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<
    Record<string, "member" | "admin">
  >({});
  const [loading, setLoading] = useState(true);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === organizationId
  );

  const loadRequests = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/organizations/join-requests?organizationId=${encodeURIComponent(
          organizationId
        )}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load join requests.");
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function reviewRequest(
    requestId: string,
    action: "approve" | "reject"
  ) {
    setBusyRequestId(requestId);
    setError("");
    setMessage("");

    try {
      const role = selectedRoles[requestId] ?? "member";

      const response = await fetch("/api/organizations/join-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          action,
          ...(action === "approve" ? { role } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process the request.");
      }

      setMessage(
        action === "approve"
          ? `${
              data.request?.status === "approved"
                ? "Request approved"
                : "Request processed"
            }: ${role} access assigned.`
          : "Join request rejected."
      );

      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyRequestId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Review access requests and manage workspace admission.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRequests()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {workspaces.length > 1 && (
        <div className="max-w-md">
          <label
            htmlFor="workspace"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Workspace
          </label>

          <select
            id="workspace"
            value={organizationId}
            onChange={(event) => {
              setOrganizationId(event.target.value);
              setMessage("");
              setError("");
            }}
            className="w-full rounded-xl border border-white/10 bg-[#111b2d] px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedWorkspace && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
          <ShieldCheck size={20} className="text-indigo-400" />
          <div>
            <p className="text-sm font-semibold text-white">
              {selectedWorkspace.name}
            </p>
            <p className="text-xs capitalize text-slate-400">
              Your role: {selectedWorkspace.role}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1322]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">Pending requests</h2>
            <p className="mt-1 text-xs text-slate-500">
              People waiting to join this workspace
            </p>
          </div>

          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            {requests.length} pending
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Loading join requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
              <UserRound size={22} className="text-slate-400" />
            </div>
            <h3 className="mt-4 font-semibold text-white">
              No pending requests
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              New workspace access requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {requests.map((request) => {
              const selectedRole = selectedRoles[request.id] ?? "member";
              const isBusy = busyRequestId === request.id;

              return (
                <div key={request.id} className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {request.requester.name || "Unnamed user"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {request.requester.email}
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        Requested {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                      Pending
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="w-full sm:max-w-xs">
                      <label
                        htmlFor={`role-${request.id}`}
                        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Assign role if approved
                      </label>

                      <select
                        id={`role-${request.id}`}
                        value={selectedRole}
                        disabled={isBusy}
                        onChange={(event) =>
                          setSelectedRoles((current) => ({
                            ...current,
                            [request.id]: event.target.value as
                              | "member"
                              | "admin",
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#111b2d] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void reviewRequest(request.id, "reject")}
                        disabled={isBusy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50 sm:flex-none"
                      >
                        <X size={15} />
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void reviewRequest(request.id, "approve")
                        }
                        disabled={isBusy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 sm:flex-none"
                      >
                        <Check size={15} />
                        {isBusy ? "Processing..." : "Approve"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
