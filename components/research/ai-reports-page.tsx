"use client";

import { useMemo, useState } from "react";
import { EyeOff, Globe2, MapPin, Search, SlidersHorizontal, Target, X } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReportFilterState = {
  keywords: string[];
  location: string;
  remoteScope: "Worldwide" | "Country" | "City";
  experience: string;
  selectedKeywordsCount: number;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  equityMin: number;
  equityMax: number;
  skills: string[];
  markets: string[];
  sortBy: string;
  jobAlerts: boolean;
};

type ReportResult = {
  id: string;
  title: string;
  summary: string;
  location: string;
  remote: string;
  experience: string;
  salary: string;
  market: string;
  skills: string[];
};

const skillOptions = ["Software", "Developer", "AI", "Analytics", "Ops", "Growth", "Founders", "Product"];
const marketOptions = ["India", "US", "Europe", "Remote", "SaaS", "Fintech", "Developer Tools", "AI Agents"];

const mockResults: ReportResult[] = Array.from({ length: 20 }, (_, index) => ({
  id: `report-${index + 1}`,
  title: `${index % 2 === 0 ? "Developer" : "Software"} market analysis ${index + 1}`,
  summary: "A structured AI-generated report combining founder signals, market movement, product patterns, pricing context, and execution takeaways.",
  location: index % 3 === 0 ? "Mumbai" : index % 3 === 1 ? "Bangalore" : "Delhi",
  remote: index % 2 === 0 ? "Remote" : "Hybrid",
  experience: index % 2 === 0 ? "0-2 years" : "3-5 years",
  salary: index % 2 === 0 ? "$40k-$70k" : "$70k-$120k",
  market: index % 2 === 0 ? "Developer Tools" : "AI Agents",
  skills: index % 2 === 0 ? ["Software", "Developer", "AI"] : ["Product", "Growth", "Analytics"],
}));

const defaultFilters: ReportFilterState = {
  keywords: ["software", "developer"],
  location: "India • Remote",
  remoteScope: "Worldwide",
  experience: "0-2 years",
  selectedKeywordsCount: 9,
  salaryMin: "",
  salaryMax: "",
  currency: "All currencies",
  equityMin: 0,
  equityMax: 2,
  skills: ["Software", "Developer"],
  markets: ["India", "Remote"],
  sortBy: "Recommended",
  jobAlerts: true,
};

function FilterSummaryInputs({ filters }: { filters: ReportFilterState }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex h-14 items-center gap-3 rounded-xl border px-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <Search size={16} style={{ color: "var(--mute)" }} />
        <span className="text-sm" style={{ color: "var(--ink)" }}>
          &quot;{filters.keywords[0]}&quot; • &quot;{filters.keywords[1]}&quot;
        </span>
      </div>
      <div className="flex h-14 items-center gap-3 rounded-xl border px-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <MapPin size={16} style={{ color: "var(--mute)" }} />
        <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--ink)" }}>{filters.location}</span>
        <button type="button" className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--hairline-strong)", color: "var(--ink)" }}>
          {filters.remoteScope} ▼
        </button>
      </div>
    </div>
  );
}

function FilterChips({ filters, onClearAll }: { filters: ReportFilterState; onClearAll: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "rgba(59,158,255,0.24)", color: "var(--ink)", backgroundColor: "var(--surface-elevated)" }}>{filters.experience} <X size={12} className="inline ml-1" /></span>
      <span className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "rgba(59,158,255,0.24)", color: "var(--ink)", backgroundColor: "var(--surface-elevated)" }}>Keywords • {filters.selectedKeywordsCount} <X size={12} className="inline ml-1" /></span>
      <button type="button" onClick={onClearAll} className="text-xs font-medium" style={{ color: "var(--accent-blue)" }}>Clear All</button>
    </div>
  );
}

function RangeSlider({ min, max, onMin, onMax }: { min: number; max: number; onMin: (value: number) => void; onMax: (value: number) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs" style={{ color: "var(--mute)" }}>
        <span>{min}%</span>
        <span>{max}%+</span>
      </div>
      <div className="relative h-8">
        <input type="range" min={0} max={2} step={0.1} value={min} onChange={(event) => onMin(Math.min(Number(event.target.value), max))} className="absolute inset-x-0 top-0 w-full" />
        <input type="range" min={0} max={2} step={0.1} value={max} onChange={(event) => onMax(Math.max(Number(event.target.value), min))} className="absolute inset-x-0 top-0 w-full" />
      </div>
    </div>
  );
}

function MultiSelectCard({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{title}</p>
      <input className="input-field mt-3" placeholder="Type to search" />
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onToggle(option)} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: selected.includes(option) ? "var(--hairline-strong)" : "var(--hairline)", backgroundColor: selected.includes(option) ? "var(--surface-elevated)" : "var(--surface-card)", color: "var(--ink)" }}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AiReportsPage() {
  const [filters, setFilters] = useState<ReportFilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<ReportFilterState>(defaultFilters);
  const [modalOpen, setModalOpen] = useState(false);

  const results = useMemo(() => {
    return mockResults.filter((result) => {
      const keywordQuery = filters.keywords.join(" ").toLowerCase();
      const queryWords = keywordQuery.split(" ").filter(Boolean);
      const haystack = `${result.title} ${result.summary} ${result.location} ${result.market} ${result.skills.join(" ")}`.toLowerCase();
      const matchesKeywords = queryWords.every((word) => haystack.includes(word));
      const matchesExperience = !filters.experience || result.experience === filters.experience;
      const matchesSkills = filters.skills.length === 0 || filters.skills.some((skill) => result.skills.includes(skill));
      const matchesMarkets = filters.markets.length === 0 || filters.markets.some((market) => result.market.includes(market) || result.location.includes(market) || result.remote.includes(market));
      return matchesKeywords && matchesExperience && matchesSkills && matchesMarkets;
    });
  }, [filters]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setModalOpen(false);
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="feature-card p-0 overflow-hidden" style={{ backgroundColor: "var(--surface-card)" }}>
        <div className="p-4 sm:p-5">
          <FilterSummaryInputs filters={filters} />
          <div className="mt-4">
            <FilterChips filters={filters} onClearAll={() => { setFilters(defaultFilters); setDraftFilters(defaultFilters); }} />
          </div>
        </div>
        <div className="border-t px-4 py-3 text-center" style={{ borderColor: "var(--hairline)" }}>
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
            <SlidersHorizontal size={15} /> Filters {modalOpen ? "▲" : "▼"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold" style={{ color: "var(--ink)" }}>{results.length} results</span>
          <span style={{ color: "var(--mute)" }}>Sort by:</span>
          <button type="button" className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>{filters.sortBy}</button>
        </div>
        <label className="flex items-center gap-3 text-sm" style={{ color: "var(--charcoal)" }}>
          <button type="button" onClick={() => setFilters((current) => ({ ...current, jobAlerts: !current.jobAlerts }))} className="relative h-6 w-11 rounded-full" style={{ backgroundColor: filters.jobAlerts ? "var(--accent-blue)" : "var(--surface-deep)" }}>
            <span className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all" style={{ left: filters.jobAlerts ? 22 : 4 }} />
          </button>
          Get job alerts for this search
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--charcoal)" }}>
        <EyeOff size={14} />
        <span>Hiding jobs that do not accept applications from your location: Mumbai.</span>
        <button type="button" style={{ color: "var(--accent-blue)" }}>Update location</button>
      </div>

      <div className="mt-6 space-y-3">
        {results.map((result) => (
          <article key={result.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-base font-medium" style={{ color: "var(--ink)" }}>{result.title}</p>
                <p className="mt-2 text-sm leading-7" style={{ color: "var(--charcoal)" }}>{result.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: "var(--mute)" }}>
                  <span>{result.location}</span>
                  <span>{result.remote}</span>
                  <span>{result.experience}</span>
                  <span>{result.salary}</span>
                </div>
              </div>
              <div className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}>
                {result.market}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[min(1200px,90vw)] h-[88vh] overflow-hidden p-0">
          <DialogHeader className="sticky top-0 z-10 border-b bg-[var(--surface-card)] px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
            <DialogTitle>Filters</DialogTitle>
            <div className="mt-4 space-y-4">
              <FilterSummaryInputs filters={draftFilters} />
              <FilterChips filters={draftFilters} onClearAll={() => setDraftFilters(defaultFilters)} />
            </div>
          </DialogHeader>

          <div className="h-[calc(88vh-142px)] overflow-y-auto px-5 py-5">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Globe2 size={16} style={{ color: "var(--accent-orange)" }} />
                <h3 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Compensation</h3>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Salary</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>Any salary</p>
                  <div className="mt-4 flex items-center gap-3">
                    <input value={draftFilters.salaryMin} onChange={(event) => setDraftFilters((current) => ({ ...current, salaryMin: event.target.value }))} className="input-field" placeholder="Minimum salary" />
                    <span style={{ color: "var(--mute)" }}>-</span>
                    <input value={draftFilters.salaryMax} onChange={(event) => setDraftFilters((current) => ({ ...current, salaryMax: event.target.value }))} className="input-field" placeholder="Maximum (optional)" />
                  </div>
                  <select value={draftFilters.currency} onChange={(event) => setDraftFilters((current) => ({ ...current, currency: event.target.value }))} className="input-field mt-4">
                    <option>All currencies</option>
                    <option>USD</option>
                    <option>INR</option>
                    <option>EUR</option>
                  </select>
                </div>

                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Equity</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>0% - 2%+</p>
                  <div className="mt-4">
                    <RangeSlider min={draftFilters.equityMin} max={draftFilters.equityMax} onMin={(value) => setDraftFilters((current) => ({ ...current, equityMin: value }))} onMax={(value) => setDraftFilters((current) => ({ ...current, equityMax: value }))} />
                  </div>
                </div>
              </div>
            </section>

            <div className="my-6 h-px" style={{ backgroundColor: "var(--hairline)" }} />

            <section>
              <div className="mb-4 flex items-center gap-2">
                <Target size={16} style={{ color: "var(--accent-blue)" }} />
                <h3 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Areas of Interest</h3>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <MultiSelectCard title="Skills" options={skillOptions} selected={draftFilters.skills} onToggle={(value) => setDraftFilters((current) => ({ ...current, skills: current.skills.includes(value) ? current.skills.filter((item) => item !== value) : [...current.skills, value] }))} />
                <MultiSelectCard title="Markets" options={marketOptions} selected={draftFilters.markets} onToggle={(value) => setDraftFilters((current) => ({ ...current, markets: current.markets.includes(value) ? current.markets.filter((item) => item !== value) : [...current.markets, value] }))} />
              </div>
            </section>

            <div className="my-6 h-px" style={{ backgroundColor: "var(--hairline)" }} />

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Role Details</p>
                <div className="mt-4 space-y-3">
                  <select value={draftFilters.experience} onChange={(event) => setDraftFilters((current) => ({ ...current, experience: event.target.value }))} className="input-field">
                    <option>0-2 years</option>
                    <option>3-5 years</option>
                    <option>5-8 years</option>
                  </select>
                  <select className="input-field"><option>Any job type</option><option>Full-time</option><option>Contract</option></select>
                  <select className="input-field"><option>Any work mode</option><option>Remote</option><option>Hybrid</option><option>Onsite</option></select>
                </div>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Company</p>
                <div className="mt-4 space-y-3">
                  <select className="input-field"><option>Any industry</option><option>SaaS</option><option>AI</option><option>Developer Tools</option></select>
                  <select className="input-field"><option>Any stage</option><option>Seed</option><option>Series A</option><option>Growth</option></select>
                  <select className="input-field"><option>Any funding</option><option>Bootstrapped</option><option>VC-backed</option></select>
                </div>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 flex items-center justify-between border-t bg-[var(--surface-card)] px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{results.length} results</span>
            <button type="button" onClick={applyFilters} className="btn-primary">View results</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
