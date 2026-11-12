import { redirect } from "next/navigation";
import { connection } from "next/server";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { organizationJoinRequests, organizations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/auth/logout-button";

export default async function PendingApprovalPage() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const requests = await db
    .select({
      id: organizationJoinRequests.id,
      status: organizationJoinRequests.status,
      createdAt: organizationJoinRequests.createdAt,
      workspaceName: organizations.name,
    })
    .from(organizationJoinRequests)
    .innerJoin(
      organizations,
      eq(organizationJoinRequests.organizationId, organizations.id)
    )
    .where(eq(organizationJoinRequests.userId, user.id))
    .orderBy(desc(organizationJoinRequests.createdAt))
    .limit(1);

  const request = requests[0];

  if (!request) {
    redirect("/register");
  }

  if (request.status === "approved") {
    redirect("/");
  }

  if (request.status === "rejected") {
    return (
      <div className="rounded-2xl border border-red-900 bg-gray-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">Request not approved</h1>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Your request to join{" "}
          <strong className="text-white">{request.workspaceName}</strong> was
          not approved. You can contact the workspace administrator or choose
          another workspace.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            Find another workspace
          </Link>

          <div className="flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-900 bg-gray-900 p-8 shadow-xl">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
        <span className="text-2xl">⏳</span>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-white">
        Awaiting workspace approval
      </h1>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        Your request to join{" "}
        <strong className="text-white">{request.workspaceName}</strong> has been
        submitted successfully.
      </p>

      <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800/70 p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500">
          Request status
        </p>
        <p className="mt-2 font-semibold text-amber-400">Pending approval</p>
        <p className="mt-2 text-xs text-gray-500">
          Submitted {request.createdAt.toLocaleString()}
        </p>
      </div>

      <p className="mt-6 text-sm leading-6 text-gray-400">
        A workspace owner or administrator must approve your request before you
        can access the research dashboard.
      </p>

      <div className="mt-6 flex justify-center">
        <LogoutButton />
      </div>
    </div>
  );
}
