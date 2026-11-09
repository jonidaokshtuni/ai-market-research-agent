"use client";

import { useState, useEffect } from "react";

type Source = { title: string; url: string };

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "report">("chat");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();

        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          setSessions(data.sessions);
          setActiveId(data.sessions[0].id);
        } else {
          await createNewSession();
        }
      } catch (err) {
        console.error("Failed to load sessions from DB:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    loadSessions();
  }, []);

  const createNewSession = async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Research" }),
      });
      const data = await res.json();

      if (data.session) {
        setSessions((prev) => [data.session, ...prev]);
        setActiveId(data.session.id);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
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
      console.error("Failed to delete session:", err);
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

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    const titleUpdate = messages.length === 0 ? input.slice(0, 35) : undefined;

    updateActiveMessages(updatedMessages, titleUpdate);
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
      if (!res.ok) throw new Error(data.error || "Request failed");

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply || "",
        report: data.report,
        sources: data.sources,
        toolsUsed: data.toolsUsed,
      };

      updateActiveMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      updateActiveMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 bg-gray-900 text-white p-4 flex flex-col">
        <button
          onClick={createNewSession}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium mb-4"
        >
          + New Research
        </button>

        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
          Saved Sessions (PostgreSQL)
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {isInitializing ? (
            <div className="text-xs text-gray-400 px-2 py-2">
              Loading database...
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer ${
                  s.id === activeId
                    ? "bg-gray-700 font-medium"
                    : "hover:bg-gray-800 text-gray-300"
                }`}
              >
                <span className="truncate pr-2">{s.title}</span>
                <button
                  onClick={(e) => deleteSession(e, s.id)}
                  title="Delete session"
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 text-xs px-1"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto p-6">
        <header className="flex items-center justify-between border-b pb-4 mb-4">
          <div>
            <h1 className="text-xl font-bold">AI Market Research Agent</h1>
            <p className="text-xs text-gray-500">
              Gemini 3.5 Flash-Lite + Tavily Web Intelligence + Neon PostgreSQL
            </p>
          </div>

          <div className="flex bg-gray-200 p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`px-3 py-1.5 rounded-md ${
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
              className={`px-3 py-1.5 rounded-md ${
                mode === "report"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-600"
              }`}
            >
              SWOT Report
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2">
          {messages.length === 0 && !isInitializing && (
            <div className="text-center text-gray-400 mt-20 space-y-2">
              <p className="font-medium text-gray-600">
                Try asking the agent to research a company or URL:
              </p>
              <p className="text-sm">
                &ldquo;Analyze https://stripe.com and create a SWOT
                report&rdquo;
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl ${
                m.role === "user"
                  ? "bg-blue-600 text-white ml-auto max-w-[75%]"
                  : "bg-white border border-gray-200 shadow-sm mr-auto w-full"
              }`}
            >
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {m.toolsUsed.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full"
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
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base mb-1">
                      Executive Summary
                    </h3>
                    <p className="text-sm text-gray-700">{m.report.summary}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      Key Market Trends
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {m.report.keyTrends.map((trend, i) => (
                        <li key={i}>{trend}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-bold text-green-800 mb-1">
                        Strengths
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-green-900">
                        {m.report.swot.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="font-bold text-red-800 mb-1">
                        Weaknesses
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-red-900">
                        {m.report.swot.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="font-bold text-blue-800 mb-1">
                        Opportunities
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-blue-900">
                        {m.report.swot.opportunities.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="font-bold text-amber-800 mb-1">
                        Threats
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-amber-900">
                        {m.report.swot.threats.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-100 rounded-lg text-sm">
                    <span className="font-semibold">Strategic Takeaway: </span>
                    {m.report.recommendation}
                  </div>
                </div>
              )}

              {m.sources && m.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 mb-2">
                    Verified Sources ({m.sources.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-blue-700 px-2.5 py-1 rounded-md truncate max-w-xs"
                      >
                        {src.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="p-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-500 italic">
              Agent is searching live web sources &amp; compiling
              intelligence...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "report"
                ? "Enter a company name or URL to generate a full SWOT report..."
                : "Ask a market research question or paste a competitor URL..."
            }
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isInitializing}
          />
          <button
            type="submit"
            disabled={isLoading || isInitializing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {isLoading
              ? "Researching..."
              : mode === "report"
              ? "Generate Report"
              : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
