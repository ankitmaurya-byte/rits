import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

import { api } from "@/convex/_generated/api";

type SharedRoadmapNode = {
  id: string;
  label: string;
  description: string;
  topic: string;
  x: number;
  y: number;
  tone: "core" | "skill" | "optional";
};

type SharedRoadmapEdge = {
  id: string;
  from: string;
  to: string;
  dashed?: boolean;
};

function toneLabel(tone: SharedRoadmapNode["tone"]) {
  if (tone === "core") return "Core";
  if (tone === "optional") return "Optional";
  return "Skill";
}

export default async function SharedRoadmapPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  let roadmap;

  try {
    roadmap = await fetchQuery(api.roadmaps.getPublicRoadmap, { shareToken });
  } catch {
    notFound();
  }

  const nodes = [...(roadmap.nodes as SharedRoadmapNode[])].sort((left, right) => {
    if (Math.abs(left.y - right.y) > 24) return left.y - right.y;
    return left.x - right.x;
  });
  const edges = roadmap.edges as SharedRoadmapEdge[];
  const nodeLabelById = new Map(nodes.map((node) => [node.id, node.label]));

  return (
    <main className="min-h-screen px-5 py-8 md:px-10" style={{ backgroundColor: "var(--surface-deep)" }}>
      <div className="mx-auto max-w-5xl">
        <div className="border-b pb-5" style={{ borderColor: "var(--hairline-strong)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>
            Shared roadmap
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl" style={{ color: "var(--ink)" }}>
            {roadmap.title}
          </h1>
          <p className="mt-3 text-sm md:text-base" style={{ color: "var(--charcoal)" }}>
            {roadmap.topic}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {roadmap.topics.map((topic) => (
              <span key={topic} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--body)" }}>
                {topic}
              </span>
            ))}
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {nodes.map((node, index) => (
            <article key={node.id} className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium" style={{ color: "var(--mute)" }}>Step {index + 1}</span>
                <span className="rounded-full border px-2 py-1 text-[11px]" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                  {toneLabel(node.tone)}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-medium" style={{ color: "var(--ink)" }}>{node.label}</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>{node.description}</p>
              <p className="mt-4 text-xs font-medium" style={{ color: "var(--mute)" }}>{node.topic}</p>
            </article>
          ))}
        </section>

        {edges.length > 0 ? (
          <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <h2 className="text-sm font-medium" style={{ color: "var(--ink)" }}>Connections</h2>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {edges.map((edge) => (
                <div key={edge.id} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)", color: "var(--body)" }}>
                  {nodeLabelById.get(edge.from) ?? edge.from} {"->"} {nodeLabelById.get(edge.to) ?? edge.to}
                  {edge.dashed ? <span style={{ color: "var(--mute)" }}> optional</span> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
