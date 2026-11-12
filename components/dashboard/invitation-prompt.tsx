"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Check,
  Loader2,
  Shield,
  Users,
  X,
} from "lucide-react";

import Modal from "@/components/ui/modal";

type Invitation = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  expiresAt: string;
  createdAt: string;
  workspaceName: string;
  inviterName: string | null;
};

type InvitationPromptProps = {
  userEmail: string;
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

function getDismissedKey(id: string) {
  return `dismissed-workspace-invitation-${id}`;
}

export default function InvitationPrompt({ userEmail }: InvitationPromptProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const invitationToken = searchParams.get("invite");

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearInvitationQuery = useCallback(() => {
    if (!invitationToken) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("invite");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [invitationToken, pathname, router, searchParams]);

  const loadInvitation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/organizations/invitations", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load invitations.");
      }

      const pendingInvitations: Invitation[] = data.invitations || [];

      if (invitationToken) {
        const validationResponse = await fetch(
          `/api/organizations/invitations/validate?token=${encodeURIComponent(
            invitationToken
          )}`,
          { cache: "no-store" }
        );

        if (validationResponse.ok) {
          const validationData = await validationResponse.json();
          const validatedInvitation = validationData.invitation;

          const emailMatches =
            validatedInvitation.email.toLowerCase() === userEmail.toLowerCase();

          if (emailMatches) {
            const matchingInvitation = pendingInvitations.find(
              (item) => item.id === validatedInvitation.id
            );

            if (
              matchingInvitation &&
              !sessionStorage.getItem(getDismissedKey(matchingInvitation.id))
            ) {
              setInvitation(matchingInvitation);
              setLoading(false);
              return;
            }
          }
        }
      }

      const nextInvitation = pendingInvitations.find(
        (item) => !sessionStorage.getItem(getDismissedKey(item.id))
      );

      setInvitation(nextInvitation || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your workspace invitations."
      );
    } finally {
      setLoading(false);
    }
  }, [invitationToken, userEmail]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvitation();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadInvitation]);

  function handleClose() {
    if (invitation) {
      sessionStorage.setItem(getDismissedKey(invitation.id), "true");
    }

    setInvitation(null);
    clearInvitationQuery();
  }

  async function handleAction(action: "accept" | "decline") {
    if (!invitation) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/invitations/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId: invitation.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Unable to ${action} this invitation.`);
      }

      setInvitation(null);
      clearInvitationQuery();

      await loadInvitation();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading || !invitation) {
    return null;
  }

  const RoleIcon = invitation.role === "admin" ? Shield : Users;

  return (
    <Modal
      isOpen={Boolean(invitation)}
      onClose={handleClose}
      title="You're invited!"
      description="You've received an invitation to join a workspace."
      size="md"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
              <Building2 className="h-5 w-5 text-indigo-400" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">
                {invitation.workspaceName}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Invited by{" "}
                {invitation.inviterName || "a workspace administrator"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Invitation email</span>
            <span className="truncate text-right text-slate-200">
              {invitation.email}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Your role</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium capitalize text-indigo-300">
              <RoleIcon size={12} />
              {invitation.role}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-400">
              <CalendarClock size={14} />
              Expires
            </span>
            <span className="text-slate-200">
              {formatDate(invitation.expiresAt)}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            <X size={15} />
            Later
          </button>

          <button
            type="button"
            onClick={() => void handleAction("decline")}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/[0.15] disabled:opacity-50"
          >
            {processing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <X size={15} />
            )}
            Decline
          </button>

          <button
            type="button"
            onClick={() => void handleAction("accept")}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-400/20 bg-indigo-500/15 px-4 py-2.5 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/25 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Accept invitation
          </button>
        </div>
      </div>
    </Modal>
  );
}
