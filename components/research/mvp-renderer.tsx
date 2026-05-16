export type MvpPayload = {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  problem: string;
  audience: string;
  features: Array<{ title: string; body: string }>;
  testimonials: Array<{ name: string; role: string; quote: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export function parseMvpPayload(payload: string): MvpPayload | null {
  try {
    return JSON.parse(payload) as MvpPayload;
  } catch {
    return null;
  }
}

export function MvpRenderer({ payload }: { payload: MvpPayload }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--canvas)", color: "var(--body)" }}>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <div className="mb-10 rounded-[20px] border p-8 md:p-12" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
          <div className="mb-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: "var(--hairline)", color: "var(--mute)", backgroundColor: "var(--surface-elevated)" }}>
            {payload.brand}
          </div>
          <h1 className="max-w-4xl text-4xl font-medium tracking-tight md:text-6xl" style={{ color: "var(--ink)" }}>
            {payload.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 md:text-lg" style={{ color: "var(--body)" }}>
            {payload.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn-primary">{payload.primaryCta}</button>
            <button type="button" className="btn-outline">{payload.secondaryCta}</button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="feature-card" style={{ padding: "28px" }}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Problem</p>
            <p className="text-sm leading-7" style={{ color: "var(--body)" }}>{payload.problem}</p>
          </section>
          <section className="feature-card" style={{ padding: "28px" }}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Audience</p>
            <p className="text-sm leading-7" style={{ color: "var(--body)" }}>{payload.audience}</p>
          </section>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>Core features</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {payload.features.map((feature) => (
              <article key={feature.title} className="feature-card" style={{ padding: "28px" }}>
                <h3 className="text-lg font-medium" style={{ color: "var(--ink)" }}>{feature.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: "var(--charcoal)" }}>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-medium" style={{ color: "var(--ink)" }}>Proof and social context</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {payload.testimonials.map((item) => (
              <article key={item.name} className="feature-card" style={{ padding: "28px" }}>
                <p className="text-sm leading-7" style={{ color: "var(--body)" }}>
                  “{item.quote}”
                </p>
                <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--divider-soft)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.name}</p>
                  <p className="text-xs" style={{ color: "var(--mute)" }}>{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="feature-card" style={{ padding: "28px" }}>
          <h2 className="mb-4 text-2xl font-medium" style={{ color: "var(--ink)" }}>FAQ</h2>
          <div className="space-y-4">
            {payload.faqs.map((item) => (
              <div key={item.question} className="rounded-xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.question}</p>
                <p className="mt-2 text-sm leading-7" style={{ color: "var(--charcoal)" }}>{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
