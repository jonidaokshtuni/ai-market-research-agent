"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  FileText,
  ShieldCheck,
  Bot,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

type WorkspaceNavProps = {
  canManageMembers: boolean;
  variant?: "sidebar" | "mobile";
};

export default function WorkspaceNav({
  canManageMembers,
  variant = "sidebar",
}: WorkspaceNavProps) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  const navigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: ChartNoAxesCombined,
    },
    { name: "Competitors", href: "/dashboard/competitors", icon: Users },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    ...(canManageMembers
      ? [
          {
            name: "Members",
            href: "/dashboard/settings/members",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const aiActive =
    pathname === "/dashboard/agent" || pathname.startsWith("/dashboard/agent/");

  function isActive(href: string) {
    return href === "/"
      ? pathname === "/" || pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Workspace navigation"
      className={
        isMobile
          ? "flex items-center gap-2 overflow-x-auto px-4 py-3"
          : "flex h-full flex-col px-3 py-6"
      }
    >
      {!isMobile && (
        <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Workspace
        </p>
      )}

      <div className={isMobile ? "flex items-center gap-2" : "space-y-1.5"}>
        {navigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isMobile
                  ? `px-3 py-2.5 ${
                      active
                        ? "bg-indigo-500/15 text-indigo-300"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`
                  : `px-3.5 py-3 ${
                      active
                        ? "border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 shadow-sm shadow-indigo-950/20"
                        : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                    }`
              }`}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.2 : 1.8}
                className={`shrink-0 transition-colors ${
                  active
                    ? "text-indigo-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
              />

              <span>{item.name}</span>

              {!isMobile && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </div>

      <div
        className={
          isMobile
            ? "ml-auto shrink-0"
            : "mt-auto border-t border-white/[0.07] pt-5"
        }
      >
        {!isMobile && (
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Intelligence
          </p>
        )}

        <Link
          href="/dashboard/agent"
          aria-current={aiActive ? "page" : undefined}
          className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border transition-all duration-300 active:scale-[0.98] ${
            isMobile
              ? "border-indigo-500/30 bg-indigo-500/15 px-4 py-2.5 text-indigo-200 hover:bg-indigo-500/25"
              : "w-full border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.16] via-violet-500/[0.10] to-slate-900/80 p-4 shadow-lg shadow-indigo-950/10 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-indigo-950/30"
          } ${aiActive ? "ring-1 ring-indigo-400/30" : ""}`}
        >
          {!isMobile && (
            <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl transition-all duration-500 group-hover:bg-indigo-400/20" />
          )}

          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 text-indigo-300 transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-500/25">
            <Bot size={21} />
          </span>

          <span className="relative min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-white">
              AI Assistant
              <Sparkles size={13} className="text-violet-300" />
            </span>

            {!isMobile && (
              <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                Research smarter with AI
              </span>
            )}
          </span>

          {!isMobile && (
            <ArrowUpRight
              size={16}
              className="relative shrink-0 text-slate-500 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-300"
            />
          )}
        </Link>
      </div>
    </nav>
  );
}
