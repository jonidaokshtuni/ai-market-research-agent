export type Importance = "high" | "medium" | "low";

export type Impact = Importance | "none";

export type ChangeType = "new" | "changed" | "removed" | "strategic_shift";

export type ChangeCategory =
  | "product"
  | "pricing"
  | "positioning"
  | "strategy"
  | "strength"
  | "weakness"
  | "market";

export type Source = {
  title: string;
  url: string;
};

export type SnapshotFinding = {
  title: string;
  description: string;
  importance: Importance;
  sources: Source[];
};

export type CompetitorSnapshot = {
  id: string;
  researchTask: string;
  summary: string;
  findings: SnapshotFinding[];
  keyInsights: string[];
  limitations: string[];
  sources: Source[];
  toolsUsed: string[];
  createdAt: string;
};

export type CompetitorChange = {
  category: ChangeCategory;
  changeType: ChangeType;
  title: string;
  description: string;
  previousValue: string | null;
  currentValue: string | null;
  impact: Importance;
  confidence: Importance;
  sources: Source[];
};

export type CompetitorComparison = {
  id: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  summary: string;
  overallImpact: Impact;
  changes: CompetitorChange[];
  limitations: string[];
  sources: Source[];
  createdAt: string;
};

export type Pagination = {
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
};

export type CompetitorResearchPanelProps = {
  competitorId: string;
  competitorName: string;
};
