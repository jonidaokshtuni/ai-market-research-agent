"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type RegistrationMode = "create" | "join" | "request";

type Workspace = {
  id: string;
  name: string;
};

type Invitation = {
  email: string;
  role: "admin" | "member";
  workspaceName: string;
  expiresAt: string;
};

type InvitationValidationState = {
  token: string;
  status: "success" | "error";
  invitation?: Invitation;
  error?: string;
};

type WorkspaceSearchState = {
  query: string;
  status: "loading" | "success" | "error";
  workspaces: Workspace[];
  error?: string;
};

type RegisterFormProps = {
  invitationToken?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  return fallback;
}

function parseInvitation(value: unknown): Invitation | null {
  if (!isRecord(value)) {
    return null;
  }

  const { email, role, workspaceName, expiresAt } = value;

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof workspaceName !== "string" ||
    !workspaceName.trim() ||
    (role !== "admin" && role !== "member") ||
    typeof expiresAt !== "string" ||
    !Number.isFinite(Date.parse(expiresAt))
  ) {
    return null;
  }

  return {
    email,
    role,
    workspaceName,
    expiresAt,
  };
}

function parseWorkspaces(value: unknown): Workspace[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const workspaces: Workspace[] = [];

  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.name !== "string" ||
      !item.name.trim()
    ) {
      return null;
    }

    workspaces.push({
      id: item.id,
      name: item.name,
    });
  }

  return workspaces;
}

export default function RegisterForm({ invitationToken }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteToken =
    searchParams.get("invite")?.trim() || invitationToken?.trim() || "";

  const isInvitation = Boolean(inviteToken);

  const [mode, setMode] = useState<RegistrationMode>(
    isInvitation ? "join" : "create"
  );

  const effectiveMode: RegistrationMode = isInvitation ? "join" : mode;

  const [invitationState, setInvitationState] =
    useState<InvitationValidationState | null>(null);

  const currentInvitation =
    invitationState?.token === inviteToken ? invitationState : null;

  const invitation =
    currentInvitation?.status === "success"
      ? currentInvitation.invitation ?? null
      : null;

  const validatingInvitation = isInvitation && currentInvitation === null;

  const invitationError =
    currentInvitation?.status === "error"
      ? currentInvitation.error ?? "Unable to verify this invitation."
      : "";

  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );

  const [searchState, setSearchState] = useState<WorkspaceSearchState | null>(
    null
  );

  const currentSearch =
    searchState?.query === workspaceQuery ? searchState : null;

  const searching = currentSearch?.status === "loading";
  const searchError =
    currentSearch?.status === "error"
      ? currentSearch.error ?? "Workspace search failed."
      : "";

  const workspaces =
    currentSearch?.status === "success" ? currentSearch.workspaces : [];

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submittingRef = useRef(false);

  // Validate the invitation associated with the current URL token.
  useEffect(() => {
    if (!inviteToken) {
      return;
    }

    const controller = new AbortController();

    async function validateInvitation() {
      try {
        const response = await fetch(
          `/api/organizations/invitations/validate?token=${encodeURIComponent(
            inviteToken
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data: unknown = await response.json().catch(() => null);

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          setInvitationState({
            token: inviteToken,
            status: "error",
            error: getErrorMessage(
              data,
              "This invitation is invalid or expired."
            ),
          });
          return;
        }

        const parsedInvitation = isRecord(data)
          ? parseInvitation(data.invitation)
          : null;

        if (!parsedInvitation) {
          setInvitationState({
            token: inviteToken,
            status: "error",
            error: "Unable to verify this invitation.",
          });
          return;
        }

        setInvitationState({
          token: inviteToken,
          status: "success",
          invitation: parsedInvitation,
        });

        setEmail(parsedInvitation.email);
      } catch (err) {
        if (
          !controller.signal.aborted &&
          !(err instanceof Error && err.name === "AbortError")
        ) {
          setInvitationState({
            token: inviteToken,
            status: "error",
            error: "Unable to verify this invitation. Please try again.",
          });
        }
      }
    }

    void validateInvitation();

    return () => controller.abort();
  }, [inviteToken]);

  // Search workspaces with debouncing and cancellation.
  useEffect(() => {
    const query = workspaceQuery.trim();

    if (effectiveMode !== "request" || selectedWorkspace || query.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setSearchState({
        query,
        status: "loading",
        workspaces: [],
      });

      try {
        const response = await fetch(
          `/api/organizations/search?q=${encodeURIComponent(query)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data: unknown = await response.json().catch(() => null);

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          setSearchState({
            query,
            status: "error",
            workspaces: [],
            error: getErrorMessage(data, "Workspace search failed."),
          });
          return;
        }

        const parsedWorkspaces = isRecord(data)
          ? parseWorkspaces(data.workspaces)
          : null;

        if (!parsedWorkspaces) {
          setSearchState({
            query,
            status: "error",
            workspaces: [],
            error: "The workspace search returned an invalid response.",
          });
          return;
        }

        setSearchState({
          query,
          status: "success",
          workspaces: parsedWorkspaces,
        });
      } catch (err) {
        if (
          !controller.signal.aborted &&
          !(err instanceof Error && err.name === "AbortError")
        ) {
          setSearchState({
            query,
            status: "error",
            workspaces: [],
            error: "Unable to search workspaces.",
          });
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [effectiveMode, workspaceQuery, selectedWorkspace]);

  function changeMode(nextMode: "create" | "request") {
    if (loading) {
      return;
    }

    setMode(nextMode);
    setError("");
    setSelectedWorkspace(null);
    setWorkspaceQuery("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submittingRef.current) {
      return;
    }

    setError("");

    if (effectiveMode === "join" && !inviteToken) {
      setError(
        "Please open the registration page using a valid invitation link."
      );
      return;
    }

    if (effectiveMode === "join" && (!invitation || validatingInvitation)) {
      setError("Please wait until your invitation has been verified.");
      return;
    }

    if (effectiveMode === "request" && !selectedWorkspace) {
      setError("Please search for and select a workspace first.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: effectiveMode,
          name,
          email: effectiveMode === "join" ? invitation?.email : email,
          password,
          ...(effectiveMode === "create" ? { workspaceName } : {}),
          ...(effectiveMode === "join" ? { inviteToken } : {}),
          ...(effectiveMode === "request"
            ? { organizationId: selectedWorkspace?.id }
            : {}),
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = getErrorMessage(data, "Registration failed.");

        if (
          effectiveMode === "join" &&
          response.status === 409 &&
          /already exists|already registered|sign in/i.test(message)
        ) {
          router.push(`/login?invite=${encodeURIComponent(inviteToken)}`);
          return;
        }

        setError(message);
        return;
      }

      if (effectiveMode === "request") {
        router.replace("/pending-approval");
      } else {
        router.replace("/");
      }

      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <h1 className="text-3xl font-bold">Create your account</h1>

        <p className="mb-8 mt-2 text-gray-400">
          Start researching markets with AI.
        </p>

        {!isInvitation && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => changeMode("create")}
              disabled={loading}
              aria-pressed={effectiveMode === "create"}
              className={`rounded-lg border p-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                effectiveMode === "create"
                  ? "border-blue-500 bg-blue-600/15 text-blue-300"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              Create a workspace
            </button>

            <button
              type="button"
              onClick={() => changeMode("request")}
              disabled={loading}
              aria-pressed={effectiveMode === "request"}
              className={`rounded-lg border p-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                effectiveMode === "request"
                  ? "border-blue-500 bg-blue-600/15 text-blue-300"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              Join a workspace
            </button>
          </div>
        )}

        {isInvitation && (
          <div className="mb-6 rounded-lg border border-blue-900 bg-blue-950/40 p-4">
            <p className="text-sm font-medium text-blue-300">
              Workspace invitation
            </p>

            {validatingInvitation ? (
              <p className="mt-2 text-sm text-gray-400">
                Verifying your invitation...
              </p>
            ) : invitationError ? (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {invitationError}
              </p>
            ) : invitation ? (
              <>
                <p className="mt-2 text-sm text-gray-300">
                  You&apos;ve been invited to join{" "}
                  <strong>{invitation.workspaceName}</strong>.
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Your assigned role:{" "}
                  {invitation.role === "admin" ? "Administrator" : "Member"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Invitation expires on{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </p>
              </>
            ) : null}
          </div>
        )}

        {effectiveMode === "request" && (
          <div className="mb-6 rounded-lg border border-blue-900 bg-blue-950/40 p-4">
            <p className="text-sm font-medium text-blue-300">
              Join an existing workspace
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Search for your company or workspace. An owner or administrator
              must approve your request before you can access it.
            </p>

            <div className="mt-4">
              <label
                htmlFor="workspaceSearch"
                className="mb-2 block text-sm text-gray-200"
              >
                Workspace name
              </label>

              <input
                id="workspaceSearch"
                type="search"
                value={workspaceQuery}
                onChange={(e) => {
                  setWorkspaceQuery(e.target.value);
                  setSelectedWorkspace(null);
                }}
                placeholder="Search workspace name..."
                maxLength={80}
                autoComplete="off"
                disabled={loading}
                aria-busy={searching}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div aria-live="polite" aria-atomic="true">
              {searching && (
                <p className="mt-3 text-xs text-gray-400">
                  Searching workspaces...
                </p>
              )}

              {searchError && (
                <p role="alert" className="mt-3 text-xs text-red-400">
                  {searchError}
                </p>
              )}

              {!searching &&
                !searchError &&
                !selectedWorkspace &&
                workspaceQuery.trim().length >= 2 &&
                currentSearch?.status === "success" &&
                workspaces.length === 0 && (
                  <p className="mt-3 text-xs text-gray-400">
                    No matching workspaces found.
                  </p>
                )}
            </div>

            {workspaces.length > 0 && !selectedWorkspace && (
              <div className="mt-3 space-y-2">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setSelectedWorkspace(workspace);
                      setWorkspaceQuery(workspace.name);
                      setError("");
                    }}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left text-sm text-gray-200 transition hover:border-blue-500 hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {workspace.name}
                  </button>
                ))}
              </div>
            )}

            {selectedWorkspace && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-800 bg-emerald-950/30 px-4 py-3">
                <div>
                  <p className="text-xs text-emerald-400">Selected workspace</p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {selectedWorkspace.name}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSelectedWorkspace(null);
                    setWorkspaceQuery("");
                  }}
                  className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm">
              Full name
            </label>

            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {effectiveMode === "create" && (
            <div>
              <label htmlFor="workspaceName" className="mb-2 block text-sm">
                Company or workspace name
              </label>

              <input
                id="workspaceName"
                type="text"
                required
                maxLength={100}
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Consulting"
                disabled={loading}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-gray-500">
                Your workspace is where your research, competitors and company
                documents will be organized.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm">
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={isInvitation ? invitation?.email ?? "" : email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isInvitation}
              disabled={loading}
              placeholder="you@example.com"
              className={`w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-blue-500 ${
                isInvitation ? "cursor-not-allowed opacity-75" : ""
              }`}
            />

            {isInvitation && invitation && (
              <p className="mt-2 text-xs text-gray-500">
                This email address is locked because the invitation was sent to
                this address.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm">
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={loading}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (effectiveMode === "join" &&
                (!inviteToken || !invitation || validatingInvitation)) ||
              (effectiveMode === "request" && !selectedWorkspace)
            }
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating your account..."
              : effectiveMode === "create"
              ? "Create account"
              : effectiveMode === "join"
              ? "Create account and join"
              : "Create account and request access"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href={
              isInvitation && inviteToken
                ? `/login?invite=${encodeURIComponent(inviteToken)}`
                : "/login"
            }
            className="text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
