import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type HubAction = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type HubPanel = {
  title: string;
  description: string;
  eyebrow?: string;
  metric?: string;
  actions?: HubAction[];
};

export function HardcodedHubPage({
  title,
  accent,
  primaryActions,
  panels,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  primaryActions: HubAction[];
  panels: HubPanel[];
}) {
  return (
    <div className="page-container animate-fade-in-up relative">
      <div
        className="absolute right-0 top-0 h-[360px] w-[560px] pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${accent} 0%, transparent 70%)`,
          opacity: 0.18,
        }}
      />

      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>
              {title}
            </h2>
          </div>
          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            {primaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className="feature-card group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]"
                >
                  <div className="mt-0.5 rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: accent }}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{action.label}</p>
                      <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--charcoal)" }} />
                    </div>
                    <p className="text-xs leading-5" style={{ color: "var(--charcoal)" }}>{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 relative z-10">
        {panels.map((panel) => (
          <section key={panel.title} className="feature-card p-0 overflow-hidden">
            <div className="border-b px-7 py-6" style={{ borderColor: "var(--divider-soft)" }}>
              {panel.eyebrow ? (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>
                  {panel.eyebrow}
                </p>
              ) : null}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium" style={{ color: "var(--ink)" }}>{panel.title}</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>{panel.description}</p>
                </div>
                {panel.metric ? (
                  <div className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent, backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
                    {panel.metric}
                  </div>
                ) : null}
              </div>
            </div>
            {panel.actions?.length ? (
              <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                {panel.actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={`${action.href}-${action.label}`}
                      href={action.href}
                      className="group rounded-xl border p-4 transition-all hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-elevated)]"
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: accent }}>
                          <Icon size={15} />
                        </div>
                        <ArrowRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--charcoal)" }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{action.label}</p>
                      <p className="mt-1 text-xs leading-5" style={{ color: "var(--charcoal)" }}>{action.description}</p>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
