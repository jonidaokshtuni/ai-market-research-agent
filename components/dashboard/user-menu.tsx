"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  LogOut,
  Loader2,
  UserRound,
  Users,
} from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
};

type UserMenuProps = {
  name: string;
  email: string;
  workspaces: Workspace[];
  activeWorkspaceId: string;
};

export default function UserMenu(props: UserMenuProps) {
  const pathname = usePathname();

  return <UserMenuContent key={pathname} {...props} />;
}

function UserMenuContent({
  name,
  email,
  workspaces,
  activeWorkspaceId,
}: UserMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState("");
  const [error, setError] = useState("");

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId
  );

  const initials = (name || email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleWorkspaceSwitch(workspaceId: string) {
    if (switchingWorkspaceId || workspaceId === activeWorkspaceId) {
      return;
    }

    setSwitchingWorkspaceId(workspaceId);
    setError("");

    try {
      const response = await fetch("/api/organizations/active-workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ workspaceId }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to switch workspace.";

        throw new Error(message);
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to switch workspace."
      );
    } finally {
      setSwitchingWorkspaceId("");
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to sign out. Please try again.");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign out. Please try again."
      );
      setIsLoggingOut(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 pr-3 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-lg shadow-indigo-950/30">
          {initials || <UserRound size={17} />}
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-40 truncate text-sm font-semibold text-white">
            {name || "Account"}
          </p>
          <p className="max-w-40 truncate text-xs text-slate-400">{email}</p>
        </div>

        <ChevronDown
          size={16}
          className={`hidden text-slate-400 transition-transform duration-200 sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User account menu"
          className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40"
        >
          <div className="border-b border-white/[0.07] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                {initials || <UserRound size={18} />}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {name || "Account"}
                </p>
                <p className="truncate text-xs text-slate-400">{email}</p>
              </div>
            </div>
          </div>

          {workspaces.length > 0 && (
            <div className="border-b border-white/[0.07] p-3">
              <div className="mb-2 flex items-center gap-2 px-2">
                <Users size={14} className="text-indigo-400" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch workspace
                </p>
              </div>

              <div className="space-y-1">
                {workspaces.map((workspace) => {
                  const isActive = workspace.id === activeWorkspaceId;
                  const isSwitching = switchingWorkspaceId === workspace.id;

                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      role="menuitem"
                      disabled={Boolean(switchingWorkspaceId) || isActive}
                      onClick={() => handleWorkspaceSwitch(workspace.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-default disabled:opacity-70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {workspace.name}
                        </p>
                        <p className="mt-0.5 text-[11px] capitalize text-slate-500">
                          {workspace.role}
                        </p>
                      </div>

                      {isSwitching ? (
                        <Loader2
                          size={16}
                          className="shrink-0 animate-spin text-indigo-400"
                        />
                      ) : isActive ? (
                        <Check size={16} className="shrink-0 text-indigo-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {activeWorkspace && (
                <p className="mt-2 truncate px-2 text-[11px] text-slate-500">
                  Active: {activeWorkspace.name}
                </p>
              )}
            </div>
          )}

          <div className="p-2">
            {error && (
              <p className="px-3 py-2 text-xs text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut || Boolean(switchingWorkspaceId)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={17} />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
