import Link from "next/link";

import { integrationGroups, integrationOverviewCards } from "@/lib/integrations-catalog";

export default function IntegrationsPage() {
  return (
    <div className="page-container animate-fade-in-up relative">
      <div
        className="absolute right-0 top-0 h-[360px] w-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle at top right, var(--accent-orange) 0%, transparent 70%)",
          opacity: 0.14,
        }}
      />

      <div className="page-header border-b pb-8 mb-8 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--mute)" }}>
          Integrations
        </p>
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <h2 className="text-4xl font-medium tracking-tight mb-4" style={{ color: "var(--ink)" }}>
              Integrate with anything around your workflow
            </h2>
            <p className="text-base leading-7" style={{ color: "var(--body)" }}>
              Explore how Gmail, trading accounts, GitHub, Slack, docs, payments, calendars, CRMs, creator tools, and custom APIs will connect into Rits. Each card opens a dedicated detail route so you can see a realistic product-facing UI for that integration.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 relative z-10">
        {integrationOverviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="feature-card flex items-start gap-3 p-4"
            >
              <div className="mt-0.5 rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{card.title}</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--charcoal)" }}>{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 relative z-10">
        {integrationGroups.map((group) => (
          <section key={group.id} className="feature-card p-0 overflow-hidden">
            <div className="border-b px-6 py-5" style={{ borderColor: "var(--divider-soft)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>{group.metric}</p>
                  <h3 className="text-lg font-medium" style={{ color: "var(--ink)" }}>{group.title}</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>{group.description}</p>
                </div>
                <div className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent-orange)", backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
                  {group.metric}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={`/integrations/${item.id}`}
                    className="rounded-xl border p-4 text-left transition-all hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-elevated)]"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>
                        <Icon size={15} />
                      </div>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                        Coming soon
                      </span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.name}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--charcoal)" }}>{item.summary}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
