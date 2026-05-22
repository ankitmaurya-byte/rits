"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CircleDot,
  Filter,
  Layers3,
  MousePointer2,
  Sparkles,
  Swords,
} from "lucide-react";

type SizeMetric = "revenue" | "profit" | "marketCap" | "activeUsers" | "customers" | "fundingRaised";
type BorderMetric = "marketCap" | "revenue" | "profit" | "growthRate" | "competitionIntensity";
type MetricKey = SizeMetric | BorderMetric;
type Sector = "FoodTech" | "QuickCommerce" | "CommerceInfra" | "Payments" | "Productivity";

type Company = {
  name: string;
  sector: Sector;
  description: string;
  tags: string[];
  geography: string[];
  customerSegment: string;
  businessModel: string;
  productCategory: string;
  competitors: string[];
  anchor: { x: number; y: number };
  metrics: Record<MetricKey, number>;
};

const sectorStyles: Record<Sector, { fill: string; stroke: string; glow: string }> = {
  FoodTech: { fill: "rgba(255, 116, 92, 0.34)", stroke: "rgba(255, 161, 145, 0.94)", glow: "rgba(255, 116, 92, 0.18)" },
  QuickCommerce: { fill: "rgba(254, 194, 82, 0.30)", stroke: "rgba(255, 222, 143, 0.92)", glow: "rgba(254, 194, 82, 0.16)" },
  CommerceInfra: { fill: "rgba(94, 168, 255, 0.28)", stroke: "rgba(164, 208, 255, 0.92)", glow: "rgba(94, 168, 255, 0.14)" },
  Payments: { fill: "rgba(93, 240, 190, 0.28)", stroke: "rgba(164, 255, 223, 0.92)", glow: "rgba(93, 240, 190, 0.14)" },
  Productivity: { fill: "rgba(174, 124, 255, 0.28)", stroke: "rgba(214, 186, 255, 0.92)", glow: "rgba(174, 124, 255, 0.14)" },
};

const sizeMetricOptions: Array<{ value: SizeMetric; label: string }> = [
  { value: "revenue", label: "Revenue" },
  { value: "profit", label: "Profit" },
  { value: "marketCap", label: "Market cap" },
  { value: "activeUsers", label: "Active users" },
  { value: "customers", label: "Customers" },
  { value: "fundingRaised", label: "Funding raised" },
];

const borderMetricOptions: Array<{ value: BorderMetric; label: string }> = [
  { value: "marketCap", label: "Market cap" },
  { value: "revenue", label: "Revenue" },
  { value: "profit", label: "Profit" },
  { value: "growthRate", label: "Growth rate" },
  { value: "competitionIntensity", label: "Competition intensity" },
];

const companies: Company[] = [
  {
    name: "Swiggy",
    sector: "FoodTech",
    description: "Consumer delivery platform spanning restaurant ordering, dark stores, and last-mile logistics.",
    tags: ["food delivery", "quick commerce", "restaurant marketplace", "last mile"],
    geography: ["India"],
    customerSegment: "Urban consumers",
    businessModel: "Marketplace + logistics",
    productCategory: "Delivery network",
    competitors: ["Zomato", "Blinkit", "Instamart", "Zepto", "Domino's", "Uber Eats"],
    anchor: { x: 280, y: 310 },
    metrics: { revenue: 1450, profit: 110, marketCap: 9200, activeUsers: 38, customers: 29, fundingRaised: 3700, growthRate: 34, competitionIntensity: 88 },
  },
  {
    name: "Zomato",
    sector: "FoodTech",
    description: "Restaurant discovery and food delivery platform with strong adjacency into instant commerce.",
    tags: ["food delivery", "restaurant marketplace", "quick commerce", "consumer app"],
    geography: ["India"],
    customerSegment: "Urban consumers",
    businessModel: "Marketplace + ads + logistics",
    productCategory: "Delivery marketplace",
    competitors: ["Swiggy", "Blinkit", "Instamart", "Domino's", "Uber Eats"],
    anchor: { x: 365, y: 280 },
    metrics: { revenue: 1720, profit: 140, marketCap: 15100, activeUsers: 42, customers: 34, fundingRaised: 2200, growthRate: 29, competitionIntensity: 91 },
  },
  {
    name: "Blinkit",
    sector: "QuickCommerce",
    description: "Rapid-delivery grocery and daily-needs network operating through dense urban dark store coverage.",
    tags: ["quick commerce", "grocery", "dark stores", "last mile"],
    geography: ["India"],
    customerSegment: "Urban households",
    businessModel: "Inventory + logistics",
    productCategory: "Instant retail",
    competitors: ["Swiggy", "Zomato", "Instamart", "Zepto", "DoorDash"],
    anchor: { x: 448, y: 270 },
    metrics: { revenue: 890, profit: -60, marketCap: 6100, activeUsers: 17, customers: 15, fundingRaised: 1200, growthRate: 46, competitionIntensity: 85 },
  },
  {
    name: "Instamart",
    sector: "QuickCommerce",
    description: "Swiggy's instant commerce layer, overlapping heavily with food delivery demand and logistics supply.",
    tags: ["quick commerce", "grocery", "last mile", "dark stores"],
    geography: ["India"],
    customerSegment: "Urban households",
    businessModel: "Inventory + logistics",
    productCategory: "Instant retail",
    competitors: ["Swiggy", "Blinkit", "Zepto", "Zomato"],
    anchor: { x: 420, y: 355 },
    metrics: { revenue: 760, profit: -95, marketCap: 4500, activeUsers: 15, customers: 13, fundingRaised: 950, growthRate: 52, competitionIntensity: 83 },
  },
  {
    name: "Zepto",
    sector: "QuickCommerce",
    description: "Fast-moving quick-commerce operator with strong grocery overlap and an aggressive urban market capture strategy.",
    tags: ["quick commerce", "grocery", "dark stores", "instant retail"],
    geography: ["India"],
    customerSegment: "Young urban consumers",
    businessModel: "Inventory + logistics",
    productCategory: "Instant retail",
    competitors: ["Blinkit", "Instamart", "Swiggy", "Zomato"],
    anchor: { x: 530, y: 315 },
    metrics: { revenue: 640, profit: -140, marketCap: 3900, activeUsers: 14, customers: 11, fundingRaised: 1600, growthRate: 58, competitionIntensity: 80 },
  },
  {
    name: "Domino's",
    sector: "FoodTech",
    description: "Vertically integrated restaurant chain that competes for delivery demand while controlling supply and brand experience.",
    tags: ["food delivery", "restaurant chain", "quick service", "consumer app"],
    geography: ["India", "Global"],
    customerSegment: "Mass-market consumers",
    businessModel: "Retail + franchise",
    productCategory: "QSR delivery",
    competitors: ["Swiggy", "Zomato", "Uber Eats"],
    anchor: { x: 300, y: 215 },
    metrics: { revenue: 980, profit: 120, marketCap: 7200, activeUsers: 11, customers: 10, fundingRaised: 0, growthRate: 16, competitionIntensity: 62 },
  },
  {
    name: "Uber Eats",
    sector: "FoodTech",
    description: "Global delivery marketplace with strong overlap in logistics orchestration, restaurant supply, and consumer demand capture.",
    tags: ["food delivery", "marketplace", "last mile", "restaurant marketplace"],
    geography: ["Global"],
    customerSegment: "Urban consumers",
    businessModel: "Marketplace + logistics",
    productCategory: "Delivery marketplace",
    competitors: ["Swiggy", "Zomato", "DoorDash", "Domino's"],
    anchor: { x: 250, y: 385 },
    metrics: { revenue: 2100, profit: 190, marketCap: 18300, activeUsers: 49, customers: 40, fundingRaised: 1200, growthRate: 21, competitionIntensity: 74 },
  },
  {
    name: "DoorDash",
    sector: "FoodTech",
    description: "Large-scale delivery platform that increasingly overlaps with grocery and local commerce fulfillment.",
    tags: ["food delivery", "quick commerce", "last mile", "local commerce"],
    geography: ["US", "Global"],
    customerSegment: "Suburban and urban consumers",
    businessModel: "Marketplace + logistics",
    productCategory: "Delivery network",
    competitors: ["Uber Eats", "Swiggy", "Blinkit"],
    anchor: { x: 205, y: 260 },
    metrics: { revenue: 2450, profit: 150, marketCap: 30100, activeUsers: 37, customers: 30, fundingRaised: 2500, growthRate: 24, competitionIntensity: 71 },
  },
  {
    name: "Toast",
    sector: "CommerceInfra",
    description: "Restaurant operating system touching POS, ordering, fulfillment, and merchant workflow infrastructure.",
    tags: ["restaurant ops", "POS", "merchant software", "payments"],
    geography: ["US"],
    customerSegment: "Restaurants",
    businessModel: "SaaS + payments",
    productCategory: "Restaurant infrastructure",
    competitors: ["Shopify", "Stripe", "Swiggy", "Domino's"],
    anchor: { x: 655, y: 300 },
    metrics: { revenue: 1240, profit: -40, marketCap: 9400, activeUsers: 7, customers: 0.13, fundingRaised: 1700, growthRate: 27, competitionIntensity: 54 },
  },
  {
    name: "Shopify",
    sector: "CommerceInfra",
    description: "Merchant platform spanning storefronts, payments, fulfillment, and commerce operations.",
    tags: ["ecommerce", "merchant software", "payments", "checkout"],
    geography: ["Global"],
    customerSegment: "SMBs and brands",
    businessModel: "SaaS + fintech",
    productCategory: "Commerce platform",
    competitors: ["Toast", "Stripe"],
    anchor: { x: 760, y: 365 },
    metrics: { revenue: 7100, profit: 890, marketCap: 95200, activeUsers: 4.6, customers: 2.2, fundingRaised: 122, growthRate: 23, competitionIntensity: 41 },
  },
  {
    name: "Stripe",
    sector: "Payments",
    description: "Payments infrastructure layer overlapping with commerce tools, SaaS platforms, and transaction-driven businesses.",
    tags: ["payments", "developer infrastructure", "checkout", "merchant software"],
    geography: ["Global"],
    customerSegment: "Developers and businesses",
    businessModel: "Transaction infrastructure",
    productCategory: "Payments platform",
    competitors: ["Shopify", "Toast"],
    anchor: { x: 760, y: 235 },
    metrics: { revenue: 14200, profit: 1200, marketCap: 65000, activeUsers: 3.8, customers: 2.5, fundingRaised: 2200, growthRate: 19, competitionIntensity: 37 },
  },
  {
    name: "Notion",
    sector: "Productivity",
    description: "Work OS and knowledge layer with limited direct market overlap against food, logistics, or commerce operators.",
    tags: ["productivity", "docs", "knowledge base", "collaboration"],
    geography: ["Global"],
    customerSegment: "Teams and creators",
    businessModel: "SaaS",
    productCategory: "Work OS",
    competitors: [""],
    anchor: { x: 930, y: 165 },
    metrics: { revenue: 370, profit: 45, marketCap: 11000, activeUsers: 35, customers: 0.25, fundingRaised: 340, growthRate: 32, competitionIntensity: 14 },
  },
];

function hashSeed(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function randomUnit(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function organicBlobPath(cx: number, cy: number, rx: number, ry: number, seedValue: string) {
  const seed = hashSeed(seedValue);
  const points = 14;
  const polar = Array.from({ length: points }, (_, index) => {
    const angle = (Math.PI * 2 * index) / points;
    const wobble = 0.82 + randomUnit(seed, index) * 0.34;
    return {
      x: cx + Math.cos(angle) * rx * wobble,
      y: cy + Math.sin(angle) * ry * wobble,
    };
  });

  return polar.reduce((path, point, index) => {
    const next = polar[(index + 1) % polar.length]!;
    const cx1 = point.x + (next.x - point.x) / 3;
    const cy1 = point.y + (next.y - point.y) / 3;
    const cx2 = point.x + (2 * (next.x - point.x)) / 3;
    const cy2 = point.y + (2 * (next.y - point.y)) / 3;
    return `${path} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }, `M ${polar[0]!.x.toFixed(1)} ${polar[0]!.y.toFixed(1)}`) + " Z";
}

function formatMetric(metric: MetricKey, value: number) {
  if (metric === "growthRate" || metric === "competitionIntensity") {
    return `${value}%`;
  }

  if (metric === "activeUsers" || metric === "customers") {
    return value >= 1 ? `${value.toFixed(value >= 10 ? 0 : 1)}M` : `${(value * 1000).toFixed(0)}K`;
  }

  if (metric === "fundingRaised") {
    return value === 0 ? "Bootstrapped" : `$${value.toFixed(0)}M`;
  }

  return `$${value.toFixed(0)}M`;
}

function labelForMetric(metric: MetricKey) {
  return [...sizeMetricOptions, ...borderMetricOptions].find((option) => option.value === metric)?.label ?? metric;
}

function sharedCount(left: Company, right: Company) {
  const sharedTags = left.tags.filter((tag) => right.tags.includes(tag)).length;
  const sharedGeo = left.geography.filter((geo) => right.geography.includes(geo)).length;
  return sharedTags + sharedGeo + (left.customerSegment === right.customerSegment ? 1 : 0) + (left.businessModel === right.businessModel ? 1 : 0) + (left.productCategory === right.productCategory ? 1 : 0) + (left.sector === right.sector ? 2 : 0) + (left.competitors.includes(right.name) || right.competitors.includes(left.name) ? 4 : 0);
}

export function CompetitorAnalysisPage() {
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>("revenue");
  const [borderMetric, setBorderMetric] = useState<BorderMetric>("marketCap");
  const [selectedSector, setSelectedSector] = useState<Sector | "All">("All");
  const [selectedCompanyName, setSelectedCompanyName] = useState("Swiggy");
  const [hoveredCompanyName, setHoveredCompanyName] = useState<string | null>(null);

  const visibleCompanies = useMemo(
    () => companies.filter((company) => selectedSector === "All" || company.sector === selectedSector),
    [selectedSector]
  );

  const bounds = useMemo(() => {
    const sizeValues = companies.map((company) => company.metrics[sizeMetric]);
    const borderValues = companies.map((company) => company.metrics[borderMetric]);
    return {
      sizeMin: Math.min(...sizeValues),
      sizeMax: Math.max(...sizeValues),
      borderMin: Math.min(...borderValues),
      borderMax: Math.max(...borderValues),
    };
  }, [borderMetric, sizeMetric]);

  const positionedCompanies = useMemo(() => {
    return companies.map((company) => {
      const neighbors = companies.filter((candidate) => candidate.name !== company.name && sharedCount(company, candidate) >= 5);
      const visibleNeighbors = neighbors.filter((candidate) => selectedSector === "All" || candidate.sector === selectedSector);
      const activeNeighbors = visibleNeighbors.length > 0 ? visibleNeighbors : neighbors;
      const avgX = activeNeighbors.length > 0 ? activeNeighbors.reduce((total, item) => total + item.anchor.x, 0) / activeNeighbors.length : company.anchor.x;
      const avgY = activeNeighbors.length > 0 ? activeNeighbors.reduce((total, item) => total + item.anchor.y, 0) / activeNeighbors.length : company.anchor.y;
      const sizeValue = company.metrics[sizeMetric];
      const borderValue = company.metrics[borderMetric];
      const sizeProgress = (sizeValue - bounds.sizeMin) / Math.max(1, bounds.sizeMax - bounds.sizeMin);
      const borderProgress = (borderValue - bounds.borderMin) / Math.max(1, bounds.borderMax - bounds.borderMin);
      const overlapBias = Math.min(0.42, activeNeighbors.length * 0.06);
      const cx = company.anchor.x * (1 - overlapBias) + avgX * overlapBias;
      const cy = company.anchor.y * (1 - overlapBias) + avgY * overlapBias;
      const rx = 58 + sizeProgress * 68;
      const ry = 42 + sizeProgress * 54;
      const opacity = company.metrics.profit <= 0 ? 0.48 : 0.65 + Math.min(company.metrics.profit / 1800, 0.16);
      const borderWidth = 1.8 + borderProgress * 5.6;
      const visible = visibleCompanies.some((item) => item.name === company.name);
      return {
        ...company,
        cx,
        cy,
        rx,
        ry,
        opacity,
        borderWidth,
        visible,
        path: organicBlobPath(cx, cy, rx, ry, company.name + sizeMetric + borderMetric),
        overlapNames: activeNeighbors.map((neighbor) => neighbor.name),
      };
    });
  }, [borderMetric, bounds.borderMax, bounds.borderMin, bounds.sizeMax, bounds.sizeMin, selectedSector, sizeMetric, visibleCompanies]);

  const selectedCompany = positionedCompanies.find((company) => company.name === selectedCompanyName) ?? positionedCompanies[0]!;
  const hoveredCompany = positionedCompanies.find((company) => company.name === hoveredCompanyName) ?? null;
  const sectorCounts = useMemo(() => {
    return companies.reduce<Record<string, number>>((accumulator, company) => {
      accumulator[company.sector] = (accumulator[company.sector] ?? 0) + 1;
      return accumulator;
    }, {});
  }, []);

  return (
    <div className="page-container animate-fade-in-up max-w-none relative">
      <div className="absolute inset-x-0 top-0 h-[420px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(94,168,255,0.14) 0%, transparent 58%), radial-gradient(ellipse at 65% 15%, rgba(255,116,92,0.12) 0%, transparent 48%)" }} />

      <div className="page-header mb-8 flex-col items-start gap-6 border-b pb-8 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="max-w-4xl">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>Competitor Market Map</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Companies", value: `${companies.length}` },
            { label: "Crowded core", value: "Food + QComm" },
            { label: "Isolated node", value: "Notion" },
            { label: "Metric mode", value: `${labelForMetric(sizeMetric)} / ${labelForMetric(borderMetric)}` },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{item.label}</p>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="feature-card" style={{ padding: "20px" }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers3 size={16} style={{ color: "var(--accent-blue)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Map Controls</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>Area = {labelForMetric(sizeMetric)}</span>
              <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>Border = {labelForMetric(borderMetric)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Blob size</span>
              <select value={sizeMetric} onChange={(event) => setSizeMetric(event.target.value as SizeMetric)} className="input-field">
                {sizeMetricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Border metric</span>
              <select value={borderMetric} onChange={(event) => setBorderMetric(event.target.value as BorderMetric)} className="input-field">
                {borderMetricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Sector filter</span>
              <select value={selectedSector} onChange={(event) => setSelectedSector(event.target.value as Sector | "All")} className="input-field">
                <option value="All">All sectors</option>
                {Object.keys(sectorStyles).map((sector) => <option key={sector} value={sector}>{sector}</option>)}
              </select>
            </label>
          </div>
        </section>

        <aside className="feature-card" style={{ padding: "20px" }}>
          <div className="mb-4 flex items-center gap-2">
            <Filter size={16} style={{ color: "var(--accent-orange)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Sector Legend</p>
          </div>
          <div className="space-y-2">
            {Object.entries(sectorStyles).map(([sector, colors]) => (
              <button
                key={sector}
                type="button"
                onClick={() => setSelectedSector((current) => current === sector ? "All" : (sector as Sector))}
                className="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors"
                style={{ borderColor: selectedSector === sector ? colors.stroke : "var(--hairline)", backgroundColor: selectedSector === sector ? "var(--surface-elevated)" : "var(--surface-card)" }}
              >
                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.stroke, boxShadow: `0 0 20px ${colors.glow}` }} />
                  {sector}
                </span>
                <span className="text-xs" style={{ color: "var(--mute)" }}>{sectorCounts[sector] ?? 0}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-[28px] border" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#05070b" }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.54)" }}>Market Map Canvas</p>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Overlaps are computed from shared tags, geography, business model, and declared competitor relationships.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}><MousePointer2 size={12} className="mr-1 inline" /> Hover for metrics</span>
              <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}><Building2 size={12} className="mr-1 inline" /> Click for details</span>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <svg viewBox="0 0 1080 640" className="block h-[640px] w-full" role="img" aria-label="Competitor market map">
              <defs>
                <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
              </defs>

              <rect x="0" y="0" width="1080" height="640" fill="#05070b" />
              <path d="M 0 120 C 280 30, 410 240, 610 150 S 960 90, 1080 170" stroke="rgba(255,255,255,0.04)" strokeWidth="1.2" fill="none" />
              <path d="M 90 520 C 280 400, 450 590, 660 470 S 940 450, 1060 560" stroke="rgba(255,255,255,0.04)" strokeWidth="1.2" fill="none" />

              {positionedCompanies.filter((company) => company.visible).map((company) => {
                const colors = sectorStyles[company.sector];
                const active = hoveredCompanyName === company.name || selectedCompanyName === company.name;
                return (
                  <g
                    key={company.name}
                    onMouseEnter={() => setHoveredCompanyName(company.name)}
                    onMouseLeave={() => setHoveredCompanyName(null)}
                    onClick={() => setSelectedCompanyName(company.name)}
                    style={{ cursor: "pointer", opacity: company.visible ? 1 : 0, transition: "opacity 220ms ease, transform 220ms ease" }}
                  >
                    <path d={company.path} fill={colors.glow} filter="url(#softBlur)" opacity={0.7} />
                    <path
                      d={company.path}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={active ? company.borderWidth + 1.2 : company.borderWidth}
                      opacity={company.opacity}
                      style={{ mixBlendMode: "screen" }}
                    />
                    <text x={company.cx} y={company.cy - 2} textAnchor="middle" style={{ fill: "#f7f8fb", fontSize: active ? 15 : 14, fontWeight: 600, letterSpacing: "-0.01em" }}>{company.name}</text>
                    <text x={company.cx} y={company.cy + 16} textAnchor="middle" style={{ fill: "rgba(255,255,255,0.68)", fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase" }}>{company.sector}</text>
                  </g>
                );
              })}
            </svg>

            {hoveredCompany ? (
              <div
                className="pointer-events-none absolute max-w-[240px] rounded-2xl border px-4 py-3 text-sm shadow-2xl"
                style={{
                  left: `clamp(16px, ${((hoveredCompany.cx + 24) / 1080) * 100}%, calc(100% - 256px))`,
                  top: `clamp(16px, ${((hoveredCompany.cy - 32) / 640) * 100}%, calc(100% - 140px))`,
                  borderColor: "rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(7,9,15,0.92)",
                  backdropFilter: "blur(16px)",
                  color: "#f7f8fb",
                }}
              >
                <p className="font-medium">{hoveredCompany.name}</p>
                <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.66)" }}>{hoveredCompany.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p style={{ color: "rgba(255,255,255,0.54)" }}>{labelForMetric(sizeMetric)}</p>
                    <p>{formatMetric(sizeMetric, hoveredCompany.metrics[sizeMetric])}</p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(255,255,255,0.54)" }}>{labelForMetric(borderMetric)}</p>
                    <p>{formatMetric(borderMetric, hoveredCompany.metrics[borderMetric])}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="feature-card self-start" style={{ padding: "22px" }}>
          <div className="mb-5 flex items-center gap-2">
            <Swords size={16} style={{ color: "var(--accent-orange)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Company Details</p>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>{selectedCompany.name}</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--charcoal)" }}>{selectedCompany.description}</p>
              </div>
              <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: sectorStyles[selectedCompany.sector].stroke, color: "var(--ink)", backgroundColor: "var(--surface-card)" }}>{selectedCompany.sector}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>{labelForMetric(sizeMetric)}</p>
                <p className="mt-2 font-medium" style={{ color: "var(--ink)" }}>{formatMetric(sizeMetric, selectedCompany.metrics[sizeMetric])}</p>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>{labelForMetric(borderMetric)}</p>
                <p className="mt-2 font-medium" style={{ color: "var(--ink)" }}>{formatMetric(borderMetric, selectedCompany.metrics[borderMetric])}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Overlap Drivers</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCompany.tags.map((tag) => (
                  <span key={tag} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--body)" }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={15} style={{ color: "var(--accent-blue)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Why It Overlaps</p>
            </div>
            <div className="space-y-3 text-sm" style={{ color: "var(--body)" }}>
              <p><span style={{ color: "var(--ink)", fontWeight: 600 }}>Customer segment:</span> {selectedCompany.customerSegment}</p>
              <p><span style={{ color: "var(--ink)", fontWeight: 600 }}>Business model:</span> {selectedCompany.businessModel}</p>
              <p><span style={{ color: "var(--ink)", fontWeight: 600 }}>Product category:</span> {selectedCompany.productCategory}</p>
              <p><span style={{ color: "var(--ink)", fontWeight: 600 }}>Geography:</span> {selectedCompany.geography.join(", ")}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <div className="mb-3 flex items-center gap-2">
              <CircleDot size={15} style={{ color: "var(--accent-green)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Closest Competitors</p>
            </div>
            <div className="space-y-2">
              {selectedCompany.overlapNames.slice(0, 5).map((name) => {
                const match = companies.find((company) => company.name === name);
                if (!match) return null;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedCompanyName(name)}
                    className="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors"
                    style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}
                  >
                    <span>
                      <span className="block text-sm font-medium" style={{ color: "var(--ink)" }}>{name}</span>
                      <span className="block mt-1 text-xs" style={{ color: "var(--mute)" }}>{match.sector}</span>
                    </span>
                    <span className="text-xs" style={{ color: "var(--body)" }}>{sharedCount(selectedCompany, match)} overlap pts</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
