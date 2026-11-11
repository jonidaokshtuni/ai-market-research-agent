import type { CompetitorFormValues, CompetitorSortOption } from "./types";

export const EMPTY_COMPETITOR_FORM: CompetitorFormValues = {
  name: "",
  website: "",
  industry: "",
  description: "",
  products: "",
  pricing: "",
  strengths: "",
  weaknesses: "",
  marketStrength: 50,
  innovationScore: 50,
};

export const COMPETITOR_SORT_OPTIONS: {
  label: string;
  value: CompetitorSortOption;
}[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Company name", value: "name" },
  { label: "Market strength", value: "market-strength" },
  { label: "Innovation score", value: "innovation" },
];

export const COMPETITOR_INDUSTRY_OPTIONS = [
  "Technology",
  "SaaS",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Retail",
  "Manufacturing",
  "Education",
  "Other",
];

export const COMPETITOR_SCORE_MIN = 0;
export const COMPETITOR_SCORE_MAX = 100;

export const COMPETITOR_PAGE_SIZE = 12;
