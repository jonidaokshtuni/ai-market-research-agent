"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";
import {
  EMPTY_COMPETITOR_FORM,
  COMPETITOR_INDUSTRY_OPTIONS,
  COMPETITOR_SCORE_MIN,
  COMPETITOR_SCORE_MAX,
} from "./constants";
import type { Competitor, CompetitorFormValues } from "./types";

type CompetitorFormProps = {
  competitor?: Competitor | null;
  isSaving: boolean;
  onSubmit: (values: CompetitorFormValues) => Promise<void>;
  onCancel: () => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "mb-2 block text-sm font-medium text-slate-300";

function getInitialFormValues(
  competitor?: Competitor | null
): CompetitorFormValues {
  if (!competitor) {
    return { ...EMPTY_COMPETITOR_FORM };
  }

  return {
    name: competitor.name,
    website: competitor.website ?? "",
    industry: competitor.industry ?? "",
    description: competitor.description ?? "",
    products: competitor.products ?? "",
    pricing: competitor.pricing ?? "",
    strengths: competitor.strengths ?? "",
    weaknesses: competitor.weaknesses ?? "",
    marketStrength: competitor.marketStrength,
    innovationScore: competitor.innovationScore,
  };
}

export default function CompetitorForm({
  competitor,
  isSaving,
  onSubmit,
  onCancel,
}: CompetitorFormProps) {
  const [form, setForm] = useState<CompetitorFormValues>(() =>
    getInitialFormValues(competitor)
  );
  const [validationError, setValidationError] = useState("");

  const isEditing = Boolean(competitor);

  function updateField<K extends keyof CompetitorFormValues>(
    field: K,
    value: CompetitorFormValues[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    const name = form.name.trim();

    if (!name) {
      setValidationError("Company name is required.");
      return;
    }

    if (form.website.trim()) {
      try {
        const website = new URL(form.website.trim());

        if (!["http:", "https:"].includes(website.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setValidationError(
          "Enter a valid website URL beginning with https:// or http://."
        );
        return;
      }
    }

    await onSubmit({
      ...form,
      name,
      website: form.website.trim(),
      industry: form.industry.trim(),
      description: form.description.trim(),
      products: form.products.trim(),
      pricing: form.pricing.trim(),
      strengths: form.strengths.trim(),
      weaknesses: form.weaknesses.trim(),
    });
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 shadow-xl shadow-black/10"
      aria-labelledby="competitor-form-title"
    >
      <div className="border-b border-slate-800 bg-gradient-to-r from-blue-500/10 to-transparent px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
              Competitive intelligence
            </p>

            <h2
              id="competitor-form-title"
              className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl"
            >
              {isEditing ? "Edit competitor" : "Add a competitor"}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Record company information and competitive positioning.
            </p>
          </div>

          <span className="w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            {isEditing ? "Editing profile" : "New profile"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7 p-5 sm:p-7">
        <fieldset disabled={isSaving} className="space-y-7">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Company information
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Basic details about the company.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="competitor-name" className={labelClass}>
                  Company name <span className="text-red-400">*</span>
                </label>
                <input
                  id="competitor-name"
                  required
                  maxLength={150}
                  className={inputClass}
                  placeholder="e.g. Acme Inc."
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="competitor-website" className={labelClass}>
                  Website
                </label>
                <input
                  id="competitor-website"
                  type="url"
                  maxLength={2048}
                  className={inputClass}
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                />
              </div>

              <div>
                <label htmlFor="competitor-industry" className={labelClass}>
                  Industry
                </label>
                <select
                  id="competitor-industry"
                  className={inputClass}
                  value={form.industry}
                  onChange={(event) =>
                    updateField("industry", event.target.value)
                  }
                >
                  <option value="">Select an industry</option>
                  {COMPETITOR_INDUSTRY_OPTIONS.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="competitor-products" className={labelClass}>
                  Products and services
                </label>
                <input
                  id="competitor-products"
                  maxLength={5000}
                  className={inputClass}
                  placeholder="Main products or services"
                  value={form.products}
                  onChange={(event) =>
                    updateField("products", event.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <label htmlFor="competitor-description" className={labelClass}>
                Company description
              </label>
              <textarea
                id="competitor-description"
                rows={3}
                maxLength={5000}
                className={inputClass}
                placeholder="Describe the company, target market and positioning..."
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-7">
            <h3 className="text-sm font-semibold text-white">
              Commercial intelligence
            </h3>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              Document the company&apos;s commercial strategy.
            </p>

            <label htmlFor="competitor-pricing" className={labelClass}>
              Pricing strategy
            </label>
            <textarea
              id="competitor-pricing"
              rows={3}
              maxLength={3000}
              className={inputClass}
              placeholder="Pricing model, subscriptions, premium tiers..."
              value={form.pricing}
              onChange={(event) => updateField("pricing", event.target.value)}
            />
          </div>

          <div className="border-t border-slate-800 pt-7">
            <h3 className="text-sm font-semibold text-white">
              SWOT intelligence
            </h3>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              Record known competitive strengths and weaknesses.
            </p>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="competitor-strengths" className={labelClass}>
                  Strengths
                </label>
                <textarea
                  id="competitor-strengths"
                  rows={4}
                  maxLength={5000}
                  className={inputClass}
                  placeholder="Brand recognition, technology, distribution..."
                  value={form.strengths}
                  onChange={(event) =>
                    updateField("strengths", event.target.value)
                  }
                />
              </div>

              <div>
                <label htmlFor="competitor-weaknesses" className={labelClass}>
                  Weaknesses
                </label>
                <textarea
                  id="competitor-weaknesses"
                  rows={4}
                  maxLength={5000}
                  className={inputClass}
                  placeholder="Market gaps, limitations, customer complaints..."
                  value={form.weaknesses}
                  onChange={(event) =>
                    updateField("weaknesses", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-7">
            <h3 className="text-sm font-semibold text-white">
              Competitive scores
            </h3>
            <p className="mb-5 mt-1 text-xs text-slate-500">
              Scores are manually entered estimates, not verified market data.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="competitor-market-strength"
                    className={labelClass}
                  >
                    Market strength
                  </label>
                  <span className="text-sm font-semibold tabular-nums text-blue-400">
                    {form.marketStrength}/100
                  </span>
                </div>

                <input
                  id="competitor-market-strength"
                  type="range"
                  min={COMPETITOR_SCORE_MIN}
                  max={COMPETITOR_SCORE_MAX}
                  step={1}
                  className="w-full cursor-pointer accent-blue-500"
                  value={form.marketStrength}
                  onChange={(event) =>
                    updateField("marketStrength", Number(event.target.value))
                  }
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="competitor-innovation" className={labelClass}>
                    Innovation score
                  </label>
                  <span className="text-sm font-semibold tabular-nums text-violet-400">
                    {form.innovationScore}/100
                  </span>
                </div>

                <input
                  id="competitor-innovation"
                  type="range"
                  min={COMPETITOR_SCORE_MIN}
                  max={COMPETITOR_SCORE_MAX}
                  step={1}
                  className="w-full cursor-pointer accent-violet-500"
                  value={form.innovationScore}
                  onChange={(event) =>
                    updateField("innovationScore", Number(event.target.value))
                  }
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {validationError && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {validationError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Saving..."
              : isEditing
              ? "Save changes"
              : "Add competitor"}
          </button>
        </div>
      </form>
    </section>
  );
}
