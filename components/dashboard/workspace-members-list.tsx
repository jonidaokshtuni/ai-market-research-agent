import { Building2, Crown, Shield, Users } from "lucide-react";

import type {
  ManageableWorkspace,
  WorkspaceMember,
} from "@/lib/organizations/access";

type WorkspaceMembersListProps = {
  workspaces: ManageableWorkspace[];
  members: WorkspaceMember[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function RoleBadge({ role }: { role: WorkspaceMember["role"] }) {
  const styles = {
    owner: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    admin: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
    member: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  };

  const Icon = role === "owner" ? Crown : role === "admin" ? Shield : Users;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles[role]}`}
    >
      <Icon size={12} />
      {role}
    </span>
  );
}

export default function WorkspaceMembersList({
  workspaces,
  members,
}: WorkspaceMembersListProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Organization Members
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          People who currently have access to your organizations.
        </p>
      </div>

      {workspaces.map((workspace) => {
        const workspaceMembers = members.filter(
          (member) => member.organizationId === workspace.id
        );

        return (
          <div
            key={workspace.id}
            className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1322]"
          >
            <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
                  <Building2 size={19} className="text-indigo-400" />
                </div>

                <div>
                  <h3 className="font-semibold text-white">{workspace.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Your role: {workspace.role}
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
                {workspaceMembers.length}{" "}
                {workspaceMembers.length === 1 ? "member" : "members"}
              </span>
            </div>

            {workspaceMembers.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                No members found in this organization.
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_120px_130px] gap-4 border-b border-white/[0.06] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 md:grid">
                  <span>Member</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Joined</span>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {workspaceMembers.map((member) => {
                    const initials = (member.name || member.email)
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={`${member.organizationId}-${member.userId}`}
                        className="grid gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_120px_130px] md:items-center md:gap-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-slate-300">
                            {initials || <Users size={15} />}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {member.name || "Unnamed user"}
                            </p>
                            <p className="truncate text-xs text-slate-500 md:hidden">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <p className="hidden truncate text-sm text-slate-400 md:block">
                          {member.email}
                        </p>

                        <div>
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">
                            Role
                          </span>
                          <RoleBadge role={member.role} />
                        </div>

                        <div>
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">
                            Joined
                          </span>
                          <p className="text-xs text-slate-400">
                            {formatDate(member.joinedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
