import type {
  ChangeCategory,
  ChangeType,
  CompetitorChange,
  CompetitorComparison,
  CompetitorSnapshot,
  Impact,
  Importance,
  Pagination,
  SnapshotFinding,
  Source,
} from "./types";

const VALID_IMPORTANCE = new Set<Importance>(["high", "medium", "low"]);

const VALID_IMPACT = new Set<Impact>(["high", "medium", "low", "none"]);

const VALID_CHANGE_TYPES = new Set<ChangeType>([
  "new",
  "changed",
  "removed",
  "strategic_shift",
]);

const VALID_CATEGORIES = new Set<ChangeCategory>([
  "product",
  "pricing",
  "positioning",
  "strategy",
  "strength",
  "weakness",
  "market",
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function parseImportance(value: unknown): Importance {
  return VALID_IMPORTANCE.has(value as Importance)
    ? (value as Importance)
    : "medium";
}

function parseImpact(value: unknown): Impact {
  return VALID_IMPACT.has(value as Impact) ? (value as Impact) : "none";
}

export function parseSource(value: unknown): Source | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = asString(value.title).trim();
  const rawUrl = asString(value.url).trim();

  if (!title || !rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return {
      title,
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

function parseSources(value: unknown): Source[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(parseSource)
    .filter((source): source is Source => source !== null);
}

function parseSnapshotFinding(value: unknown): SnapshotFinding | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = asString(value.title).trim();

  if (!title) {
    return null;
  }

  return {
    title,
    description: asString(value.description),
    importance: parseImportance(value.importance),
    sources: parseSources(value.sources),
  };
}

export function parseSnapshot(value: unknown): CompetitorSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const createdAt = value.createdAt;

  if (!id || !isValidDate(createdAt)) {
    return null;
  }

  const findings = Array.isArray(value.findings)
    ? value.findings
        .map(parseSnapshotFinding)
        .filter((finding): finding is SnapshotFinding => finding !== null)
    : [];

  return {
    id,
    researchTask: asString(value.researchTask),
    summary: asString(value.summary),
    findings,
    keyInsights: asStringArray(value.keyInsights),
    limitations: asStringArray(value.limitations),
    sources: parseSources(value.sources),
    toolsUsed: asStringArray(value.toolsUsed),
    createdAt,
  };
}

function parseChange(value: unknown): CompetitorChange | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = asString(value.title).trim();

  if (!title) {
    return null;
  }

  const category = VALID_CATEGORIES.has(value.category as ChangeCategory)
    ? (value.category as ChangeCategory)
    : "market";

  const changeType = VALID_CHANGE_TYPES.has(value.changeType as ChangeType)
    ? (value.changeType as ChangeType)
    : "changed";

  return {
    category,
    changeType,
    title,
    description: asString(value.description),
    previousValue:
      typeof value.previousValue === "string" ? value.previousValue : null,
    currentValue:
      typeof value.currentValue === "string" ? value.currentValue : null,
    impact: parseImportance(value.impact),
    confidence: parseImportance(value.confidence),
    sources: parseSources(value.sources),
  };
}

export function parseComparison(value: unknown): CompetitorComparison | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const createdAt = value.createdAt;

  if (!id || !isValidDate(createdAt)) {
    return null;
  }

  const changes = Array.isArray(value.changes)
    ? value.changes
        .map(parseChange)
        .filter((change): change is CompetitorChange => change !== null)
    : [];

  return {
    id,
    previousSnapshotId: asString(value.previousSnapshotId),
    currentSnapshotId: asString(value.currentSnapshotId),
    summary: asString(value.summary),
    overallImpact: parseImpact(value.overallImpact),
    changes,
    limitations: asStringArray(value.limitations),
    sources: parseSources(value.sources),
    createdAt,
  };
}

export function parsePagination(value: unknown): Pagination {
  if (!isRecord(value)) {
    throw new Error("The server returned invalid pagination data.");
  }

  const { limit, offset, hasMore, nextOffset } = value;

  if (
    !Number.isSafeInteger(limit) ||
    (limit as number) < 1 ||
    !Number.isSafeInteger(offset) ||
    (offset as number) < 0 ||
    typeof hasMore !== "boolean" ||
    (nextOffset !== null &&
      (!Number.isSafeInteger(nextOffset) || (nextOffset as number) < 0))
  ) {
    throw new Error("The server returned invalid pagination data.");
  }

  if (
    hasMore &&
    (typeof nextOffset !== "number" || nextOffset <= (offset as number))
  ) {
    throw new Error("The server returned inconsistent pagination data.");
  }

  if (!hasMore && nextOffset !== null) {
    throw new Error("The server returned inconsistent pagination data.");
  }

  return {
    limit: limit as number,
    offset: offset as number,
    hasMore,
    nextOffset: nextOffset as number | null,
  };
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

export function getApiError(data: unknown, fallback: string): string {
  if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  return fallback;
}

export function parseSnapshotsResponse(data: unknown): {
  snapshots: CompetitorSnapshot[];
  pagination: Pagination;
} {
  if (!isRecord(data) || !Array.isArray(data.snapshots)) {
    throw new Error("The server returned invalid research history.");
  }

  return {
    snapshots: data.snapshots
      .map(parseSnapshot)
      .filter((snapshot): snapshot is CompetitorSnapshot => snapshot !== null),
    pagination: parsePagination(data.pagination),
  };
}

export function parseComparisonsResponse(data: unknown): {
  comparisons: CompetitorComparison[];
  pagination: Pagination;
} {
  if (!isRecord(data) || !Array.isArray(data.comparisons)) {
    throw new Error("The server returned invalid comparison history.");
  }

  return {
    comparisons: data.comparisons
      .map(parseComparison)
      .filter(
        (comparison): comparison is CompetitorComparison => comparison !== null
      ),
    pagination: parsePagination(data.pagination),
  };
}
