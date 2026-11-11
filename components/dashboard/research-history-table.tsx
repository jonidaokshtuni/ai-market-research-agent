"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ResearchSession = {
  id: string;
  title: string;
  createdAt: Date;
  messageCount: number;
  reportCount: number;
  lastActivity: Date | null;
};

type Props = {
  data: ResearchSession[];
};

export default function ResearchHistoryTable({ data }: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const pageSize = 8;

  const filteredData = useMemo(() => {
    let result = [...data];

    if (search.trim()) {
      result = result.filter((session) =>
        session.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filter === "reports") {
      result = result.filter((session) => session.reportCount > 0);
    }

    if (filter === "no-reports") {
      result = result.filter((session) => session.reportCount === 0);
    }

    result.sort((a, b) => {
      if (sort === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      if (sort === "title") {
        return a.title.localeCompare(b.title);
      }

      return (
        new Date(b.lastActivity ?? b.createdAt).getTime() -
        new Date(a.lastActivity ?? a.createdAt).getTime()
      );
    });

    return result;
  }, [data, search, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function formatDate(date: Date | null) {
    if (!date) return "No activity";

    return new Date(date).toLocaleDateString("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Research History</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search and manage your previous research sessions.
          </p>
        </div>

        <span className="text-sm text-slate-400">
          {filteredData.length} sessions
        </span>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-800 p-5 md:flex-row">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search research sessions..."
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
        />

        <select
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="all">All sessions</option>
          <option value="reports">With reports</option>
          <option value="no-reports">Without reports</option>
        </select>

        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {paginatedData.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm text-slate-400">No research sessions found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Research session</th>
                  <th className="px-5 py-4 font-medium">Messages</th>
                  <th className="px-5 py-4 font-medium">Reports</th>
                  <th className="px-5 py-4 font-medium">Last activity</th>
                  <th className="px-5 py-4 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {paginatedData.map((session) => (
                  <tr
                    key={session.id}
                    onClick={() =>
                      router.push(`/dashboard/agent?sessionId=${session.id}`)
                    }
                    className="cursor-pointer transition hover:bg-slate-800/60"
                  >
                    <td className="max-w-[280px] px-5 py-4">
                      <p className="truncate font-medium text-white">
                        {session.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Created {formatDate(session.createdAt)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {session.messageCount}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                        {session.reportCount}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                      {formatDate(session.lastActivity)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(
                            `/dashboard/agent?sessionId=${session.id}`
                          );
                        }}
                        className="font-medium text-blue-400 hover:text-blue-300"
                      >
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
