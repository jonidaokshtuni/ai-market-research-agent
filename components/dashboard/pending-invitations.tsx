"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Check,
  Crown,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";

type Invitation = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  expiresAt: string;
  createdAt: string;
  workspaceName: string;
  inviterName: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function RoleBadge({ role }: { role: Invitation["role"] }) {
  const styles = {
    owner: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    admin: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
    member: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  };

  const Icon = role === "owner" ? Crown : role === "admin" ? Shield : Users;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles[role]}`}
    >
      <Icon size={12} />
      {role}
    </span>
  );
}

export default function PendingInvitations() {
  const router = useRouter();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadInvitations = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/organizations/invitations", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load invitations.");
      }

      setInvitations(data.invitations || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading invitations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function handleAction(
    invitationId: string,
    action: "accept" | "decline"
  ) {
    setProcessingId(invitationId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/organizations/invitations/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Unable to ${action} this invitation.`);
      }

      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId)
      );

      setSuccess(
        action === "accept"
          ? "You've successfully joined the workspace."
          : "The invitation has been declined."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Pending invitations
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Invitations sent to your account that are waiting for your response.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadInvitations(true)}
          disabled={loading || refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0c1322] px-5 py-16 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" />
          Loading invitations...
        </div>
      ) : invitations.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1322] px-5 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Mail size={21} className="text-slate-400" />
          </div>

          <h3 className="mt-4 font-semibold text-white">
            No pending invitations
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
            When someone invites you to join a workspace, the invitation will
            appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => {
            const isProcessing = processingId === invitation.id;

            return (
              <div
                key={invitation.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1322]"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
                      <Building2 size={20} className="text-indigo-400" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">
                        {invitation.workspaceName}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <RoleBadge role={invitation.role} />

                        <span className="text-xs text-slate-500">
                          Invited {formatDate(invitation.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CalendarClock size={14} />
                    Expires {formatDate(invitation.expiresAt)}
                  </div>
                </div>

                <div className="border-t border-white/[0.06] px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <UserRound size={14} className="text-slate-500" />
                        {invitation.inviterName || "Workspace administrator"}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail size={13} />
                        {invitation.email}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleAction(invitation.id, "decline")
                        }
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <X size={15} />
                        )}
                        Decline
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleAction(invitation.id, "accept")
                        }
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-400/20 bg-indigo-500/15 px-3.5 py-2 text-sm font-medium text-indigo-200 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Check size={15} />
                        )}
                        Accept invitation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
