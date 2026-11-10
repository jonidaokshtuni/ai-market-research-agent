"use client";

import { useState, useEffect } from "react";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";

type Source = {
  title: string;
  url: string;
};

type MarketReport = {
  summary: string;
  keyTrends: string[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendation: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  report?: MarketReport | null;
  sources?: Source[] | null;
  toolsUsed?: string[] | null;
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
};

export default function MarketResearchDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "report">("chat");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setSessions([]);
      setActiveId("");
      setIsInitializing(false);
      return;
    }

    const loadSessions = async () => {
      setIsInitializing(true);

      try {
        const res = await fetch("/api/sessions");

        if (!res.ok) {
          throw new Error("Could not load sessions.");
        }

        const data = await res.json();

        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          setSessions(data.sessions);
          setActiveId(data.sessions[0].id);
        } else {
          await createNewSession();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Loading failed.");
      } finally {
        setIsInitializing(false);
      }
    };

    loadSessions();
  }, [isLoaded, isSignedIn]);

  const createNewSession = async () => {
    try {
      setError("");

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Research" }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Session creation failed.");
      if (data.session) {
        setSessions((prev) => [data.session, ...prev]);
        setActiveId(data.session.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed.");
    }
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    try {
      const res = await fetch(`/api/sessions?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Could not delete session.");

      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);

      if (activeId === id) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
        } else {
          await createNewSession();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed.");
    }
  };

  const activeSession = sessions.find((s) => s.id === activeId);
  const messages = activeSession?.messages || [];

  const updateActiveMessages = (newMessages: Message[], newTitle?: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              title: newTitle || s.title,
              messages: newMessages,
            }
          : s
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading || !activeId) return;

    setError("");

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    const updatedMessages = [...messages, userMessage];

    updateActiveMessages(
      updatedMessages,
      messages.length === 0 ? input.slice(0, 35) : undefined
    );

    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content || JSON.stringify(m.report),
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode,
          sessionId: activeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Research request failed.");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply || "",
        report: data.report,
        sources: data.sources,
        toolsUsed: data.toolsUsed,
      };

      updateActiveMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";

      updateActiveMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `Error: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading your research workspace...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <h1 className="text-2xl font-bold">AI Market Research Agent</h1>
        <p className="text-gray-500">
          Please sign in to access your workspace.
        </p>
        <a
          href="/sign-in"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 shrink-0 bg-gray-900 text-white p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-6">AI Market Research</h2>

        <button
          onClick={createNewSession}
          className="w-full bg-blue-600 hover:bg-blue-500 py-3 px-3 rounded-lg text-sm font-medium mb-6"
        >
          + New Research
        </button>

        <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">
          Saved Sessions
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`group flex items-center justify-between px-3 py-3 rounded-lg text-sm cursor-pointer ${
                s.id === activeId
                  ? "bg-gray-700 font-medium"
                  : "hover:bg-gray-800 text-gray-300"
              }`}
            >
              <span className="truncate pr-2">{s.title}</span>

              <button
                onClick={(e) => deleteSession(e, s.id)}
                title="Delete session"
                className="text-gray-400 hover:text-red-400 px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <UserButton />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.fullName || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="w-full text-left text-sm text-gray-300 hover:text-white py-2"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col max-w-5xl mx-auto p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Research Workspace</h1>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered market intelligence and competitor analysis
            </p>
          </div>

          <div className="flex bg-gray-200 p-1 rounded-lg text-sm">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`px-4 py-2 rounded-md ${
                mode === "chat"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-600"
              }`}
            >
              Quick Chat
            </button>

            <button
              type="button"
              onClick={() => setMode("report")}
              className={`px-4 py-2 rounded-md ${
                mode === "report"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-600"
              }`}
            >
              SWOT Report
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 mb-5">
          {messages.length === 0 && (
            <div className="text-center mt-24 space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">
                What would you like to research?
              </h2>

              <p className="text-gray-500">
                Analyze companies, competitors, industries and market trends.
              </p>

              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {[
                  "Analyze Apple's competitive position",
                  "Create a SWOT analysis of Tesla",
                  "What are the latest AI market trends?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-sm border border-gray-200 bg-white hover:bg-gray-100 rounded-lg px-4 py-3"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-xl ${
                m.role === "user"
                  ? "bg-blue-600 text-white ml-auto max-w-[85%]"
                  : "bg-white border border-gray-200 shadow-sm mr-auto w-full"
              }`}
            >
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {m.toolsUsed.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {m.content && (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </p>
              )}

              {m.report && (
                <div className="space-y-5 mt-4">
                  <section>
                    <h3 className="font-bold text-lg mb-2">
                      Executive Summary
                    </h3>
                    <p className="text-sm text-gray-700">{m.report.summary}</p>
                  </section>

                  <section>
                    <h3 className="font-bold mb-2">Key Market Trends</h3>
                    <ul className="list-disc pl-5 text-sm space-y-2">
                      {m.report.keyTrends.map((trend, i) => (
                        <li key={i}>{trend}</li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold mb-3">SWOT Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {(
                        [
                          ["Strengths", m.report.swot.strengths, "green"],
                          ["Weaknesses", m.report.swot.weaknesses, "red"],
                          [
                            "Opportunities",
                            m.report.swot.opportunities,
                            "blue",
                          ],
                          ["Threats", m.report.swot.threats, "amber"],
                        ] as const
                      ).map(([title, items, color]) => (
                        <div
                          key={title}
                          className={`p-4 rounded-lg border bg-${color}-50 border-${color}-200`}
                        >
                          <h4 className={`font-bold mb-2 text-${color}-800`}>
                            {title}
                          </h4>
                          <ul className="list-disc pl-4 space-y-1">
                            {items.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-gray-100 rounded-lg p-4">
                    <h3 className="font-bold mb-2">Strategic Recommendation</h3>
                    <p className="text-sm">{m.report.recommendation}</p>
                  </section>
                </div>
              )}

              {m.sources && m.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">
                    Research Sources ({m.sources.length})
                  </h4>

                  <div className="space-y-2">
                    {m.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        {src.title} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="bg-white border rounded-xl p-5 text-sm text-gray-500">
              Researching market data and compiling intelligence...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "report"
                ? "Enter a company or industry for SWOT analysis..."
                : "Ask a market research question..."
            }
            className="flex-1 min-w-0 border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || !activeId}
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim() || !activeId}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {isLoading
              ? "Researching..."
              : mode === "report"
              ? "Generate"
              : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
