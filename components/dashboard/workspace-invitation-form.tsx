"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Send,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import Modal from "@/components/ui/modal";
import type { ManageableWorkspace } from "@/lib/organizations/access";

type WorkspaceInvitationFormProps = {
  workspaces: ManageableWorkspace[];
};

type InvitationResponse = {
  message?: string;
  error?: string;
  invitationUrl?: string;
};

type InvitationCheckResponse = {
  activeInvitation?: {
    expiresAt: string;
  } | null;
  error?: string;
};

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function WorkspaceInvitationForm({
  workspaces,
}: WorkspaceInvitationFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState(workspaces[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const [isCheckingInvitation, setIsCheckingInvitation] = useState(false);
  const [activeInvitationExpiresAt, setActiveInvitationExpiresAt] = useState<
    string | null
  >(null);
  const [invitationCheckError, setInvitationCheckError] = useState("");

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === organizationId
  );

  const canInviteAdmins = selectedWorkspace?.role === "owner";

  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = isValidEmail(normalizedEmail);

  useEffect(() => {
    if (!organizationId || !emailIsValid) {
      return;
    }

    const controller = new AbortController();

    async function checkActiveInvitation() {
      try {
        const params = new URLSearchParams({
          organizationId,
          email: normalizedEmail,
        });

        const response = await fetch(
          `/api/organizations/invitations?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = (await response.json()) as InvitationCheckResponse;

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to check existing invitations."
          );
        }

        setActiveInvitationExpiresAt(data.activeInvitation?.expiresAt ?? null);
        setInvitationCheckError("");
      } catch (checkError) {
        if (controller.signal.aborted) return;

        setActiveInvitationExpiresAt(null);
        setInvitationCheckError(
          checkError instanceof Error
            ? checkError.message
            : "Unable to check existing invitations."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingInvitation(false);
        }
      }
    }

    void checkActiveInvitation();

    return () => {
      controller.abort();
    };
  }, [organizationId, normalizedEmail, emailIsValid]);

  function resetFeedback() {
    setError("");
    setMessage("");
    setInvitationUrl("");
    setCopied(false);
    setCopyError("");
  }

  function resetInvitationCheck() {
    setActiveInvitationExpiresAt(null);
    setInvitationCheckError("");
  }

  function openModal() {
    resetFeedback();
    setIsOpen(true);
  }

  function closeModal() {
    if (loading) return;

    setIsOpen(false);
    resetFeedback();
    resetInvitationCheck();
    setEmail("");
    setRole("member");
    setIsCheckingInvitation(false);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    resetInvitationCheck();
    setIsCheckingInvitation(
      Boolean(organizationId && isValidEmail(value.trim().toLowerCase()))
    );
  }

  function handleWorkspaceChange(value: string) {
    setOrganizationId(value);
    setRole("member");
    resetInvitationCheck();
    setIsCheckingInvitation(Boolean(value && isValidEmail(normalizedEmail)));
  }

  async function handleCopyInvitationLink() {
    if (!invitationUrl) return;

    setCopyError("");
    setCopied(false);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
    } catch {
      setCopyError(
        "Unable to copy automatically. Please select and copy the invitation link manually."
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    resetFeedback();

    if (!organizationId || !emailIsValid) {
      setError("Please select a workspace and enter a valid email address.");
      return;
    }

    if (isCheckingInvitation) {
      setError("Please wait while we check existing invitations.");
      return;
    }

    if (activeInvitationExpiresAt) {
      setError(
        "An active invitation already exists for this email address in this workspace."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/organizations/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          email: normalizedEmail,
          role,
        }),
      });

      let data: InvitationResponse;

      try {
        data = (await response.json()) as InvitationResponse;
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok) {
        setError(data.error || "Unable to send the invitation email.");
        return;
      }

      if (typeof data.invitationUrl !== "string" || !data.invitationUrl) {
        setError(
          "The invitation email was processed, but the invitation link was not returned."
        );
        return;
      }

      setMessage(
        data.message || `Invitation email sent to ${normalizedEmail}.`
      );
      setInvitationUrl(data.invitationUrl);
      setEmail("");
      setRole("member");
      resetInvitationCheck();
      setIsCheckingInvitation(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const submitDisabled =
    loading ||
    !organizationId ||
    isCheckingInvitation ||
    Boolean(activeInvitationExpiresAt) ||
    Boolean(invitationCheckError);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <UserPlus size={17} />
        Invite member
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Invite new members"
        description="Send an email invitation to someone who should join your workspace."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="invitation-workspace"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Workspace
            </label>

            <select
              id="invitation-workspace"
              value={organizationId}
              onChange={(event) => handleWorkspaceChange(event.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="invitation-email"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Email address
            </label>

            <input
              id="invitation-email"
              type="email"
              autoComplete="off"
              required
              maxLength={254}
              value={email}
              disabled={loading}
              onChange={(event) => handleEmailChange(event.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />

            {isCheckingInvitation && (
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={13} className="animate-spin" />
                Checking existing invitations...
              </p>
            )}

            {activeInvitationExpiresAt && (
              <p
                role="status"
                className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>
                  An active invitation already exists for this email in this
                  workspace. You can invite this person again after{" "}
                  {new Date(activeInvitationExpiresAt).toLocaleString()}.
                </span>
              </p>
            )}

            {invitationCheckError && (
              <p
                role="alert"
                className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400"
              >
                {invitationCheckError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="invitation-role"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Workspace role
            </label>

            <select
              id="invitation-role"
              value={role}
              disabled={loading}
              onChange={(event) =>
                setRole(event.target.value as "member" | "admin")
              }
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            >
              <option value="member">Member</option>
              {canInviteAdmins && <option value="admin">Admin</option>}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              {canInviteAdmins
                ? "Admins can manage workspace members and settings."
                : "As a workspace admin, you can invite new members but cannot assign admin privileges."}
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          {message && (
            <div
              role="status"
              className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3"
            >
              <p className="flex items-center gap-2 text-sm text-emerald-400">
                <Check size={16} className="shrink-0" />
                {message}
              </p>

              {invitationUrl && (
                <div className="space-y-2">
                  <label
                    htmlFor="invitation-url"
                    className="block text-xs font-medium text-slate-400"
                  >
                    Invitation link
                  </label>

                  <input
                    id="invitation-url"
                    type="text"
                    readOnly
                    value={invitationUrl}
                    onFocus={(event) => event.target.select()}
                    className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={handleCopyInvitationLink}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy invitation link
                      </>
                    )}
                  </button>

                  {copyError && (
                    <p className="text-xs text-amber-400">{copyError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 border-t border-white/[0.08] pt-5">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={15} />
              Invitations expire after 7 days.
            </p>

            <button
              type="submit"
              disabled={submitDisabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending invitation...
                </>
              ) : isCheckingInvitation ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Checking invitation...
                </>
              ) : activeInvitationExpiresAt ? (
                <>
                  <AlertCircle size={16} />
                  Invitation already active
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send invitation
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
