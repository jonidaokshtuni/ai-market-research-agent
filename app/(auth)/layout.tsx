import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Branding */}
        <Link href="/" className="mb-8 block text-center">
          <span className="text-3xl font-bold tracking-tight">
            Market<span className="text-blue-500">Intel</span>
          </span>
          <span className="mt-2 block text-sm text-slate-400">
            AI Market Research Platform
          </span>
        </Link>

        {/* Clerk authentication */}
        {children}

        <p className="mt-8 text-center text-xs text-slate-500">
          © 2026 MarketIntel. All rights reserved.
        </p>
      </div>
    </main>
  );
}
