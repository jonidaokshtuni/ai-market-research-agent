"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  FileText,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: ChartNoAxesCombined,
  },
  { name: "Competitors", href: "/dashboard/competitors", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
];

export default function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-9 space-y-2">
      <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Workspace
      </p>

      {navigation.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/dashboard" && pathname === "/");

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              active
                ? "border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 shadow-lg shadow-indigo-950/20"
                : "border border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Icon
              size={18}
              className={
                active
                  ? "text-indigo-400"
                  : "text-slate-500 group-hover:text-slate-300"
              }
            />

            {item.name}

            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
