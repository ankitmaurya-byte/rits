import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { IntegrationItem } from "@/lib/integrations-catalog";

export function IntegrationDetail({ integration }: { integration: IntegrationItem }) {
  const Icon = integration.icon;

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="mb-6">
        <Link href="/integrations" className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--accent-blue)" }}>
          <ArrowLeft size={14} /> Back to integrations
        </Link>
      </div>

      <div className="rounded-[24px] border p-6" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{integration.category}</p>
              <h1 className="mt-2 text-3xl font-medium" style={{ color: "var(--ink)" }}>{integration.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7" style={{ color: "var(--body)" }}>{integration.summary}</p>
            </div>
          </div>
          <div className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>
            {integration.status}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>What Rits would sync</p>
            <div className="mt-3 space-y-2">
              {integration.syncs.map((item) => <p key={item} className="text-sm" style={{ color: "var(--charcoal)" }}>{item}</p>)}
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Why it matters</p>
            <div className="mt-3 space-y-2">
              {integration.value.map((item) => <p key={item} className="text-sm" style={{ color: "var(--charcoal)" }}>{item}</p>)}
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Example workflows</p>
            <div className="mt-3 space-y-2">
              {integration.examples.map((item) => <p key={item} className="text-sm" style={{ color: "var(--charcoal)" }}>{item}</p>)}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: "rgba(255,128,31,0.18)", backgroundColor: "rgba(255,128,31,0.06)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Current state</p>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--charcoal)" }}>
            This integration has a real product-style detail page, but the connector itself is still coming soon. The final version will connect accounts, ingest external context, and make that data directly usable inside notes, todos, roadmaps, startup research, and Rits AI.
          </p>
        </div>
      </div>
    </div>
  );
}
