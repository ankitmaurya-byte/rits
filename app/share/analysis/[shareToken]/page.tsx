import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

import { api } from "@/convex/_generated/api";

export default async function SharedAnalysisPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  let report;

  try {
    report = await fetchQuery(api.researchOutputs.getPublicReport, { shareToken });
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-12 md:px-10">
      <div className="mx-auto max-w-4xl rounded-3xl border p-8 md:p-10" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--mute)" }}>Published Analysis</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>{report.title}</h1>
        {report.summary ? <p className="mt-4 text-base leading-7" style={{ color: "var(--charcoal)" }}>{report.summary}</p> : null}
        <div className="mt-8 rounded-2xl border p-6 whitespace-pre-wrap text-sm leading-7" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)", color: "var(--body)" }}>
          {report.content}
        </div>
      </div>
    </main>
  );
}
