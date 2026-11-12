"use client";

import { useState, type FormEvent } from "react";
import { Send, Loader2, ShieldCheck, UserPlus } from "lucide-react";

import Modal from "@/components/ui/modal";
import type { ManageableWorkspace } from "@/lib/organizations/access";

type WorkspaceInvitationFormProps = {
  workspaces: ManageableWorkspace[];
};

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

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === organizationId
  );

  const canInviteAdmins = selectedWorkspace?.role === "owner";

  function openModal() {
    setError("");
    setMessage("");
    setIsOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!organizationId || !email.trim()) {
      setError("Please select a workspace and enter an email address.");
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
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to send the invitation.");
        return;
      }

      setMessage(data.message || "Invitation sent successfully.");
      setEmail("");
      setRole("member");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
              onChange={(event) => {
                setOrganizationId(event.target.value);
                setRole("member");
              }}
              required
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
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
              onChange={(event) =>
                setRole(event.target.value as "member" | "admin")
              }
              className="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
            <p
              role="status"
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400"
            >
              {message}
            </p>
          )}

          <div className="flex flex-col gap-4 border-t border-white/[0.08] pt-5">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={15} />
              Invitations expire after 7 days.
            </p>

            <button
              type="submit"
              disabled={loading || !organizationId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending invitation...
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
