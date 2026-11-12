"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RegistrationMode = "create" | "join" | "request";

type Workspace = {
  id: string;
  name: string;
};

type RegisterFormProps = {
  invitationToken?: string;
};

export default function RegisterForm({ invitationToken }: RegisterFormProps) {
  const router = useRouter();

  const [mode, setMode] = useState<RegistrationMode>(
    invitationToken ? "join" : "create"
  );

  const [inviteToken, setInviteToken] = useState(invitationToken ?? "");

  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Automatically detect invitation links.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");

    if (token) {
      setInviteToken(token);
      setMode("join");
    }
  }, []);

  // Search existing workspaces when the user chooses Join.
  useEffect(() => {
    if (mode !== "request" || workspaceQuery.trim().length < 2) {
      setWorkspaces([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      try {
        const response = await fetch(
          `/api/organizations/search?q=${encodeURIComponent(
            workspaceQuery.trim()
          )}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok) {
          setSearchError(data.error || "Workspace search failed.");
          setWorkspaces([]);
          return;
        }

        setWorkspaces(data.workspaces || []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setSearchError("Unable to search workspaces.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [mode, workspaceQuery]);

  function changeMode(nextMode: "create" | "request") {
    setMode(nextMode);
    setError("");
    setSearchError("");
    setSelectedWorkspace(null);
    setWorkspaceQuery("");
    setWorkspaces([]);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (mode === "join" && !inviteToken) {
      setError(
        "Please open the registration page using a valid invitation link."
      );
      return;
    }

    if (mode === "request" && !selectedWorkspace) {
      setError("Please search for and select a workspace first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          name,
          email,
          password,
          ...(mode === "create" ? { workspaceName } : {}),
          ...(mode === "join" ? { inviteToken } : {}),
          ...(mode === "request"
            ? { organizationId: selectedWorkspace?.id }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      if (mode === "request") {
        router.replace("/pending-approval");
      } else {
        router.replace("/");
      }

      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isInvitation = mode === "join";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <h1 className="text-3xl font-bold">Create your account</h1>

        <p className="mb-8 mt-2 text-gray-400">
          Start researching markets with AI.
        </p>

        {/* Exactly two registration options */}
        {!inviteToken && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => changeMode("create")}
              aria-pressed={mode === "create"}
              className={`rounded-lg border p-3 text-sm font-medium transition ${
                mode === "create"
                  ? "border-blue-500 bg-blue-600/15 text-blue-300"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              Create a workspace
            </button>

            <button
              type="button"
              onClick={() => changeMode("request")}
              aria-pressed={mode === "request" || isInvitation}
              className={`rounded-lg border p-3 text-sm font-medium transition ${
                mode === "request" || isInvitation
                  ? "border-blue-500 bg-blue-600/15 text-blue-300"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              Join a workspace
            </button>
          </div>
        )}

        {/* Invitation flow */}
        {isInvitation && (
          <div className="mb-6 rounded-lg border border-blue-900 bg-blue-950/40 p-4">
            <p className="text-sm font-medium text-blue-300">
              Workspace invitation
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Complete your registration using the email address that received
              this invitation. Your workspace access will be assigned
              automatically.
            </p>
          </div>
        )}

        {/* Workspace search and join request */}
        {mode === "request" && (
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
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

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
              workspaceQuery.trim().length >= 2 &&
              workspaces.length === 0 && (
                <p className="mt-3 text-xs text-gray-400">
                  No matching workspaces found.
                </p>
              )}

            {workspaces.length > 0 && !selectedWorkspace && (
              <div className="mt-3 space-y-2">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkspace(workspace);
                      setWorkspaceQuery(workspace.name);
                      setWorkspaces([]);
                      setError("");
                    }}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left text-sm text-gray-200 transition hover:border-blue-500 hover:bg-blue-950/40"
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
                  onClick={() => {
                    setSelectedWorkspace(null);
                    setWorkspaceQuery("");
                  }}
                  className="text-xs text-gray-400 hover:text-white"
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
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {mode === "create" && (
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-blue-500"
            />

            {isInvitation && (
              <p className="mt-2 text-xs text-gray-500">
                This must match the email address the invitation was sent to.
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
              (isInvitation && !inviteToken) ||
              (mode === "request" && !selectedWorkspace)
            }
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating your account..."
              : mode === "create"
              ? "Create account"
              : isInvitation
              ? "Create account and join"
              : "Create account and request access"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
