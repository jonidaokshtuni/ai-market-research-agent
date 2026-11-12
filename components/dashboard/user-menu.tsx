"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

type UserMenuProps = {
  name: string;
  email: string;
};

export default function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const initials = (name || email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  // Reset transient menu state whenever navigation changes.
  useEffect(() => {
    setIsOpen(false);
    setIsLoggingOut(false);
    setError("");
  }, [pathname]);

  // Close the menu when clicking outside or pressing Escape.
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

      // Clear the menu state before navigating away.
      setIsOpen(false);
      setIsLoggingOut(false);

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign out. Please try again."
      );
    } finally {
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
          className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40"
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
              disabled={isLoggingOut}
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
