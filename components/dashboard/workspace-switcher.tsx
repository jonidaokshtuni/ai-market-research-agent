"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Loader2, Users } from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
};

type WorkspaceSwitcherProps = {
  workspaces: Workspace[];
  activeWorkspaceId: string;
};

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState("");
  const [error, setError] = useState("");

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
        cache: "no-store",
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

  if (!activeWorkspace) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setError("");
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current workspace: ${activeWorkspace.name}. Switch workspace`}
        className="group flex max-w-[min(18rem,48vw)] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-left shadow-sm transition duration-200 hover:border-indigo-400/30 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 transition group-hover:bg-indigo-500/15">
          <Building2 size={18} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Workspace
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-slate-100">
            {activeWorkspace.name}
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
          <div className="border-b border-white/[0.07] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-indigo-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Your workspaces
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Select a workspace to change your working environment.
            </p>
          </div>

          <div
            role="listbox"
            aria-label="Available workspaces"
            aria-busy={Boolean(switchingWorkspaceId)}
            className="max-h-80 overflow-y-auto p-2"
          >
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspaceId;
              const isSwitching = switchingWorkspaceId === workspace.id;

              return (
                <button
                  key={workspace.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={Boolean(switchingWorkspaceId) || isActive}
                  onClick={() => void handleWorkspaceSwitch(workspace.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors disabled:cursor-default ${
                    isActive
                      ? "border border-indigo-500/20 bg-indigo-500/[0.09]"
                      : "border border-transparent hover:bg-white/[0.055] disabled:opacity-60"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      isActive
                        ? "border-indigo-400/20 bg-indigo-500/15 text-indigo-300"
                        : "border-white/[0.07] bg-white/[0.035] text-slate-400"
                    }`}
                  >
                    <Building2 size={17} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100">
                      {workspace.name}
                    </span>
                    <span className="mt-1 block text-[11px] capitalize text-slate-500">
                      {workspace.role}
                    </span>
                  </span>

                  {isSwitching ? (
                    <Loader2
                      size={17}
                      className="shrink-0 animate-spin text-indigo-400"
                    />
                  ) : isActive ? (
                    <Check size={17} className="shrink-0 text-indigo-400" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="border-t border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs leading-5 text-red-300"
            >
              {error}
            </div>
          )}

          <div className="border-t border-white/[0.07] px-4 py-3">
            <p className="truncate text-[11px] text-slate-500">
              Active workspace:{" "}
              <span className="font-medium text-slate-300">
                {activeWorkspace.name}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
