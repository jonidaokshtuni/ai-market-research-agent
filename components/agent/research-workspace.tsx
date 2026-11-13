"use client";

import { useCallback, useEffect, useState } from "react";

type Source = {
  title?: string;
  url: string;
  snippet?: string;
};

type MarketReport = {
  summary?: string;
  keyTrends?: string[];
  swot?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  recommendation?: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  report?: MarketReport | null;
  sources?: Source[] | null;
  toolsUsed?: string[] | null;
};

type Session = {
  id: string;
  title: string;
  userId: string;
  createdAt?: string;
  messages?: Message[];
};

type Mode = "chat" | "report";

type WorkspaceRole = "owner" | "admin" | "member";

type ResearchWorkspaceProps = {
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  userId: string;
};

export default function ResearchWorkspace({
  workspaceId,
  workspaceRole,
  userId,
}: ResearchWorkspaceProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("chat");
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState("");

  const canDeleteSession = useCallback(
    (session: Session) =>
      workspaceRole === "owner" ||
      workspaceRole === "admin" ||
      session.userId === userId,
    [workspaceRole, userId]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSessions() {
      setSessions([]);
      setActiveId("");
      setMessages([]);
      setInput("");
      setError("");
      setLoadingSessions(true);

      try {
        const response = await fetch("/api/sessions", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load research sessions.");
        }

        const data: { sessions?: Session[] } = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        const loadedSessions = data.sessions ?? [];

        setSessions(loadedSessions);

        if (loadedSessions.length > 0) {
          setActiveId(loadedSessions[0].id);
          setMessages(loadedSessions[0].messages ?? []);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to load sessions:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load research sessions."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSessions(false);
        }
      }
    }

    void loadSessions();

    return () => {
      controller.abort();
    };
  }, [workspaceId]);

  async function createNewSession() {
    if (creatingSession || loading) return;

    try {
      setCreatingSession(true);
      setError("");

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "New Research" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not create a new research session."
        );
      }

      const newSession: Session = data.session ?? data;

      setSessions((previous) => [newSession, ...previous]);
      setActiveId(newSession.id);
      setMessages(newSession.messages ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create session."
      );
    } finally {
      setCreatingSession(false);
    }
  }

  function selectSession(session: Session) {
    if (loading || deletingId) return;

    setActiveId(session.id);
    setMessages(session.messages ?? []);
    setError("");
  }

  async function deleteSession(session: Session) {
    if (deletingId || loading || !canDeleteSession(session)) {
      return;
    }

    try {
      setDeletingId(session.id);
      setError("");

      const response = await fetch(
        `/api/sessions?id=${encodeURIComponent(session.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not delete this session.");
      }

      const remaining = sessions.filter((item) => item.id !== session.id);

      setSessions(remaining);

      if (activeId === session.id) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
          setMessages(remaining[0].messages ?? []);
        } else {
          setActiveId("");
          setMessages([]);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete session."
      );
    } finally {
      setDeletingId("");
    }
  }

  async function sendMessage() {
    const question = input.trim();
    const sessionId = activeId;

    if (!question || loading || !sessionId) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          mode,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Research could not be completed. Please try again."
        );
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
        report: data.report ?? null,
        sources: data.sources ?? [],
        toolsUsed: data.toolsUsed ?? [],
      };

      setMessages((previous) => [...previous, assistantMessage]);

      setSessions((previous) =>
        previous.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                title:
                  session.title === "New Research"
                    ? question.slice(0, 45)
                    : session.title,
                messages: [...updatedMessages, assistantMessage],
              }
            : session
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Research could not be completed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Workspace heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
              AI Research Workspace
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Research Agent
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Explore markets, analyze competitors, and generate research reports.
          </p>
        </div>

        <button
          type="button"
          onClick={createNewSession}
          disabled={creatingSession || loading || loadingSessions}
          className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creatingSession ? "Creating..." : "+ New research"}
        </button>
      </div>

      {/* Main workspace */}
      <div className="grid min-h-[650px] gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Research history */}
        <aside className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Research history
            </h2>
            <span className="text-xs text-slate-500">{sessions.length}</span>
          </div>

          {loadingSessions ? (
            <p className="text-sm text-slate-500">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Your research sessions will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 rounded-lg border p-2.5 transition ${
                    activeId === session.id
                      ? "border-indigo-500/40 bg-indigo-500/10"
                      : "border-transparent hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSession(session)}
                    disabled={loading || Boolean(deletingId)}
                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                  >
                    <p className="truncate text-sm text-slate-200">
                      {session.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {session.messages?.length ?? 0} messages
                    </p>
                  </button>

                  {canDeleteSession(session) && (
                    <button
                      type="button"
                      onClick={() => deleteSession(session)}
                      disabled={
                        loading || Boolean(deletingId) || creatingSession
                      }
                      aria-label={`Delete ${session.title}`}
                      title="Delete research session"
                      className="rounded p-1 text-slate-600 opacity-100 transition hover:bg-slate-700 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      {deletingId === session.id ? "..." : "×"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Chat panel */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          {/* Chat toolbar */}
          <div className="flex flex-col justify-between gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Market Intelligence
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Ask questions about markets, industries, and competitors.
              </p>
            </div>

            <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setMode("chat")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "chat"
                    ? "bg-indigo-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Quick chat
              </button>

              <button
                type="button"
                onClick={() => setMode("report")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "report"
                    ? "bg-indigo-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                SWOT report
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 && (
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-2xl text-indigo-300">
                  ✦
                </div>

                <h3 className="text-lg font-semibold text-white">
                  What would you like to research?
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Start with a market, company, competitor, or industry. Your AI
                  research agent will investigate and organize the findings.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "Analyze the electric vehicle market",
                    "Research my top competitors",
                    "Identify emerging industry trends",
                  ].map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:border-indigo-500/50 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id ?? `${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`w-full max-w-3xl rounded-xl p-4 ${
                    message.role === "user"
                      ? "border border-indigo-500/30 bg-indigo-500/10 sm:max-w-[85%]"
                      : "border border-slate-800 bg-slate-950/70"
                  }`}
                >
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {message.role === "user" ? "You" : "Research Agent"}
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {message.content}
                  </p>

                  {message.toolsUsed && message.toolsUsed.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.toolsUsed.map((tool, toolIndex) => (
                        <span
                          key={`${tool}-${toolIndex}`}
                          className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-400"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {message.report && (
                    <div className="mt-5 space-y-4">
                      {message.report.summary && (
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-white">
                            Executive summary
                          </h3>

                          <p className="text-sm leading-6 text-slate-300">
                            {message.report.summary}
                          </p>
                        </div>
                      )}

                      {message.report.keyTrends &&
                        message.report.keyTrends.length > 0 && (
                          <div>
                            <h3 className="mb-2 text-sm font-semibold text-white">
                              Key trends
                            </h3>

                            <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                              {message.report.keyTrends.map((trend, i) => (
                                <li key={i}>{trend}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {message.report.swot && (
                        <div>
                          <h3 className="mb-3 text-sm font-semibold text-white">
                            SWOT analysis
                          </h3>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {(
                              [
                                {
                                  title: "Strengths",
                                  items: message.report.swot.strengths,
                                  color: "border-emerald-500/30",
                                },
                                {
                                  title: "Weaknesses",
                                  items: message.report.swot.weaknesses,
                                  color: "border-red-500/30",
                                },
                                {
                                  title: "Opportunities",
                                  items: message.report.swot.opportunities,
                                  color: "border-blue-500/30",
                                },
                                {
                                  title: "Threats",
                                  items: message.report.swot.threats,
                                  color: "border-amber-500/30",
                                },
                              ] as const
                            ).map((section) => (
                              <div
                                key={section.title}
                                className={`rounded-lg border ${section.color} bg-slate-900 p-3`}
                              >
                                <h4 className="mb-2 text-xs font-semibold text-slate-200">
                                  {section.title}
                                </h4>

                                <ul className="list-inside list-disc space-y-1 text-xs leading-5 text-slate-400">
                                  {section.items?.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.report.recommendation && (
                        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
                          <h3 className="mb-2 text-sm font-semibold text-indigo-200">
                            Strategic recommendation
                          </h3>

                          <p className="text-sm leading-6 text-slate-300">
                            {message.report.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Sources
                      </h3>

                      <div className="space-y-2">
                        {message.sources.map((source, i) => (
                          <a
                            key={`${source.url}-${i}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg border border-slate-800 p-3 transition hover:border-indigo-500/40 hover:bg-slate-900"
                          >
                            <p className="text-sm font-medium text-indigo-300">
                              {source.title || source.url}
                            </p>

                            {source.snippet && (
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {source.snippet}
                              </p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                  Researching<span className="animate-pulse">...</span>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mx-4 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {/* Message input */}
          <div className="border-t border-slate-800 bg-slate-950/50 p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
              className="flex items-end gap-3"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask your research question..."
                rows={2}
                disabled={!activeId || loadingSessions || loading}
                className="max-h-36 min-h-[52px] flex-1 resize-y rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  loading || !input.trim() || !activeId || loadingSessions
                }
                className="rounded-lg bg-indigo-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "..." : "Send"}
              </button>
            </form>

            <p className="mt-2 text-xs text-slate-600">
              AI-generated research may contain inaccuracies. Verify important
              findings using the linked sources.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
