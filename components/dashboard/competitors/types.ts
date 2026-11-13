export type Competitor = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  products: string | null;
  pricing: string | null;
  strengths: string | null;
  weaknesses: string | null;
  marketStrength: number;
  innovationScore: number;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
};

export type CompetitorFormValues = {
  name: string;
  website: string;
  industry: string;
  description: string;
  products: string;
  pricing: string;
  strengths: string;
  weaknesses: string;
  marketStrength: number;
  innovationScore: number;
};

export type CompetitorApiResponse = {
  competitors?: Competitor[];
  competitor?: Competitor;
  success?: boolean;
  error?: string;
};

export type CompetitorSortOption =
  | "newest"
  | "oldest"
  | "name"
  | "market-strength"
  | "innovation";

export type CompetitorFormMode = "create" | "edit";
