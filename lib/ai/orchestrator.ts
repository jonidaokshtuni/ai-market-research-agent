import { runMarketResearcher } from "./agents/market-researcher";
import { runReportGenerator } from "./agents/report-generator";

import type { GeneratedMarketReport } from "./agents/report-generator";

export type MarketReport = GeneratedMarketReport;

export type ResearchSource = {
  title: string;
  url: string;
};

export type ResearchResult = {
  reply: string;
  report: MarketReport | null;
  sources: ResearchSource[];
  toolsUsed: string[];
};

export async function runResearchAgent({
  messages,
  mode,
}: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  mode: "chat" | "report";
}): Promise<ResearchResult> {
  console.log("[Research] Starting agent. Mode:", mode);

  const conversation = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  const latestMessage = latestUserMessage?.content.trim() ?? "";

  if (
    /^(hi|hello|hey|good morning|good afternoon|good evening|how are you)[!.?]*$/i.test(
      latestMessage
    )
  ) {
    return {
      reply: "Hey! 👋 What market would you like to research today?",
      report: null,
      sources: [],
      toolsUsed: [],
    };
  }

  const researchTask = `
Research the following conversation and respond to the latest user request.

CONVERSATION:
${conversation}

LATEST USER REQUEST:
${
  latestUserMessage?.content ??
  "Conduct market research based on the conversation."
}
`;

  console.log("[Research] Starting market researcher...");

  const research = await runMarketResearcher({
    task: researchTask,
  });

  console.log("[Research] Market researcher completed.");
  console.log("[Research] Sources:", research.sources.length);
  console.log("[Research] Tools:", research.toolsUsed);

  const agent = research.result;

  if (mode === "report") {
    console.log("[Research] Starting report generator...");

    const report = await runReportGenerator({
      originalTask: researchTask,
      agents: [agent],
    });

    console.log("[Research] Report generator completed.");

    return {
      reply: report.summary,
      report,
      sources: research.sources,
      toolsUsed: research.toolsUsed,
    };
  }

  console.log("[Research] Formatting chat response...");

  const findings = agent.findings
    .map(
      (finding) =>
        `- **${finding.title}** (${finding.importance} importance): ${finding.description}`
    )
    .join("\n");

  const insights = agent.keyInsights
    .map((insight) => `- ${insight}`)
    .join("\n");

  const limitations = agent.limitations
    .map((limitation) => `- ${limitation}`)
    .join("\n");

  const reply = [
    `## Research Summary\n\n${agent.summary}`,
    findings ? `## Key Findings\n\n${findings}` : "",
    insights ? `## Key Insights\n\n${insights}` : "",
    limitations ? `## Limitations\n\n${limitations}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  console.log("[Research] Chat completed.");

  return {
    reply,
    report: null,
    sources: research.sources,
    toolsUsed: research.toolsUsed,
  };
}
