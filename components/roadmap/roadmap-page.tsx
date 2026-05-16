"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Blocks,
  Check,
  FileUp,
  Grip,
  LayoutTemplate,
  Minus,
  Plus,
  Route,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore } from "@/store/workspace-store";

type NodeTone = "core" | "skill" | "optional";
type Scope = "private" | "workspace";
type SourceKind = "template" | "roadmap";

type BuilderNode = {
  id: string;
  label: string;
  description: string;
  topic: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: NodeTone;
};

type BuilderEdge = {
  id: string;
  from: string;
  to: string;
  dashed?: boolean;
};

type DraftRoadmap = {
  title: string;
  topic: string;
  topics: string[];
  nodes: BuilderNode[];
  edges: BuilderEdge[];
};

type RoadmapTemplate = {
  id: string;
  title: string;
  topic: string;
  topics: string[];
  nodes: BuilderNode[];
  edges: BuilderEdge[];
};

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 1100;

const templates: RoadmapTemplate[] = [
  {
    id: "product-launch",
    title: "Product Launch",
    topic: "Go-to-market",
    topics: ["Foundation", "Discovery", "Messaging", "Build", "Launch"],
    nodes: [
      { id: "n1", label: "Problem", description: "Define pain point", topic: "Foundation", x: 560, y: 40, width: 220, height: 84, tone: "core" },
      { id: "n2", label: "Audience", description: "Choose ICP", topic: "Foundation", x: 560, y: 180, width: 220, height: 84, tone: "core" },
      { id: "n3", label: "Research", description: "Interviews and market scans", topic: "Discovery", x: 210, y: 330, width: 230, height: 84, tone: "skill" },
      { id: "n4", label: "Positioning", description: "Core narrative", topic: "Messaging", x: 560, y: 330, width: 220, height: 84, tone: "core" },
      { id: "n5", label: "Offer", description: "Pricing and CTA", topic: "Messaging", x: 920, y: 330, width: 230, height: 84, tone: "skill" },
      { id: "n6", label: "Landing Page", description: "Ship the first page", topic: "Build", x: 560, y: 500, width: 220, height: 84, tone: "core" },
      { id: "n7", label: "Email Capture", description: "Waitlist and form", topic: "Build", x: 240, y: 670, width: 210, height: 84, tone: "optional" },
      { id: "n8", label: "Proof", description: "Testimonials and demos", topic: "Build", x: 560, y: 670, width: 220, height: 84, tone: "skill" },
      { id: "n9", label: "Distribution", description: "Channels and loops", topic: "Launch", x: 890, y: 670, width: 230, height: 84, tone: "skill" },
      { id: "n10", label: "Feedback Loop", description: "Measure and iterate", topic: "Launch", x: 560, y: 850, width: 220, height: 84, tone: "core" },
    ],
    edges: [
      { id: "e1", from: "n1", to: "n2" },
      { id: "e2", from: "n2", to: "n4" },
      { id: "e3", from: "n4", to: "n6" },
      { id: "e4", from: "n6", to: "n10" },
      { id: "e5", from: "n4", to: "n3", dashed: true },
      { id: "e6", from: "n4", to: "n5", dashed: true },
      { id: "e7", from: "n6", to: "n7", dashed: true },
      { id: "e8", from: "n6", to: "n8", dashed: true },
      { id: "e9", from: "n6", to: "n9", dashed: true },
    ],
  },
  {
    id: "frontend-learning",
    title: "Frontend Learning",
    topic: "Engineering",
    topics: ["Core", "Framework", "Quality"],
    nodes: [
      { id: "f1", label: "HTML", description: "Semantic markup", topic: "Core", x: 560, y: 40, width: 220, height: 84, tone: "core" },
      { id: "f2", label: "CSS", description: "Layout and systems", topic: "Core", x: 560, y: 180, width: 220, height: 84, tone: "core" },
      { id: "f3", label: "JavaScript", description: "Language fundamentals", topic: "Core", x: 560, y: 320, width: 220, height: 84, tone: "core" },
      { id: "f4", label: "Accessibility", description: "Inclusive UI", topic: "Quality", x: 220, y: 480, width: 220, height: 84, tone: "skill" },
      { id: "f5", label: "React", description: "Component systems", topic: "Framework", x: 560, y: 480, width: 220, height: 84, tone: "core" },
      { id: "f6", label: "Testing", description: "Confidence and coverage", topic: "Quality", x: 900, y: 480, width: 220, height: 84, tone: "skill" },
      { id: "f7", label: "Next.js", description: "Production app layer", topic: "Framework", x: 560, y: 650, width: 220, height: 84, tone: "core" },
      { id: "f8", label: "Performance", description: "Rendering and bundles", topic: "Quality", x: 560, y: 830, width: 220, height: 84, tone: "skill" },
    ],
    edges: [
      { id: "fe1", from: "f1", to: "f2" },
      { id: "fe2", from: "f2", to: "f3" },
      { id: "fe3", from: "f3", to: "f5" },
      { id: "fe4", from: "f5", to: "f7" },
      { id: "fe5", from: "f7", to: "f8" },
      { id: "fe6", from: "f5", to: "f4", dashed: true },
      { id: "fe7", from: "f5", to: "f6", dashed: true },
    ],
  },
  {
    id: "ai-product",
    title: "AI Product Builder",
    topic: "AI Systems",
    topics: ["Foundation", "Data", "System", "Quality"],
    nodes: [
      { id: "a1", label: "Use Case", description: "User job and outcome", topic: "Foundation", x: 560, y: 50, width: 220, height: 84, tone: "core" },
      { id: "a2", label: "Context Data", description: "Docs, links, and files", topic: "Data", x: 240, y: 230, width: 220, height: 84, tone: "skill" },
      { id: "a3", label: "Prompt Design", description: "Instructions and format", topic: "Foundation", x: 560, y: 230, width: 220, height: 84, tone: "core" },
      { id: "a4", label: "Evaluation", description: "Quality checks", topic: "Quality", x: 880, y: 230, width: 220, height: 84, tone: "skill" },
      { id: "a5", label: "Workflow", description: "Actions and tools", topic: "System", x: 560, y: 430, width: 220, height: 84, tone: "core" },
      { id: "a6", label: "UX Surface", description: "Chat, report, or builder", topic: "System", x: 560, y: 620, width: 220, height: 84, tone: "skill" },
      { id: "a7", label: "Observability", description: "Logs and feedback", topic: "Quality", x: 560, y: 820, width: 220, height: 84, tone: "optional" },
    ],
    edges: [
      { id: "ae1", from: "a1", to: "a3" },
      { id: "ae2", from: "a3", to: "a5" },
      { id: "ae3", from: "a5", to: "a6" },
      { id: "ae4", from: "a6", to: "a7" },
      { id: "ae5", from: "a3", to: "a2", dashed: true },
      { id: "ae6", from: "a3", to: "a4", dashed: true },
    ],
  },
];

function cloneTemplate(template: RoadmapTemplate): DraftRoadmap {
  return {
    title: template.title,
    topic: template.topic,
    topics: [...template.topics],
    nodes: template.nodes.map((node) => ({ ...node })),
    edges: template.edges.map((edge) => ({ ...edge })),
  };
}

function nodeStyle(tone: NodeTone) {
  if (tone === "core") {
    return {
      backgroundColor: "rgba(17,255,153,0.12)",
      borderColor: "rgba(17,255,153,0.28)",
      color: "var(--ink)",
    };
  }

  if (tone === "skill") {
    return {
      backgroundColor: "var(--surface-card)",
      borderColor: "var(--hairline-strong)",
      color: "var(--ink)",
    };
  }

  return {
    backgroundColor: "var(--surface-deep)",
    borderColor: "var(--hairline)",
    color: "var(--body)",
  };
}

function RoadmapEditor({
  roadmapId,
  initialDraft,
  scope,
  workspaceId,
  onSaved,
  onDeleted,
}: {
  roadmapId: Id<"roadmaps"> | null;
  initialDraft: DraftRoadmap;
  scope: Scope;
  workspaceId: Id<"workspaces"> | null;
  onSaved: (roadmapId: Id<"roadmaps">) => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialDraft.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const edgeIdRef = useRef(1);

  const createRoadmap = useMutation(api.roadmaps.createRoadmap);
  const updateRoadmap = useMutation(api.roadmaps.updateRoadmap);
  const addTopic = useMutation(api.roadmaps.addTopic);
  const removeTopic = useMutation(api.roadmaps.removeTopic);
  const deleteRoadmap = useMutation(api.roadmaps.deleteRoadmap);

  const selectedNode = draft.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = draft.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const saveRoadmap = async () => {
    if (scope === "workspace" && !workspaceId) {
      toast.error("Select a workspace first.");
      return;
    }

    try {
      if (roadmapId) {
        await updateRoadmap({ roadmapId, ...draft });
        onSaved(roadmapId);
      } else {
        const createdId = await createRoadmap({
          scope,
          workspaceId: scope === "workspace" ? workspaceId ?? undefined : undefined,
          ...draft,
        });
        onSaved(createdId);
      }
      toast.success("Roadmap saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save roadmap.");
    }
  };

  const addNode = () => {
    const nodeId = `node-${draft.nodes.length + 1}-${Date.now()}`;
    const nextNode: BuilderNode = {
      id: nodeId,
      label: "New Step",
      description: "Describe what should be learned or built here.",
      topic: selectedNode?.topic ?? draft.topics[0] ?? "General",
      x: selectedNode ? selectedNode.x + 40 : 520,
      y: selectedNode ? selectedNode.y + 140 : 120,
      width: 220,
      height: 84,
      tone: "skill",
    };
    setDraft((current) => ({ ...current, nodes: [...current.nodes, nextNode] }));
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
      edges: current.edges.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId),
    }));
    setSelectedNodeId(null);
  };

  const updateNode = <K extends keyof BuilderNode>(key: K, value: BuilderNode[K]) => {
    if (!selectedNodeId) return;
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === selectedNodeId ? { ...node, [key]: value } : node)),
    }));
  };

  const addConnection = (targetId: string, dashed = false) => {
    if (!selectedNodeId || selectedNodeId === targetId) return;
    edgeIdRef.current += 1;
    const edgeId = `${selectedNodeId}-${targetId}-${edgeIdRef.current}`;
    setDraft((current) => ({
      ...current,
      edges: [...current.edges, { id: edgeId, from: selectedNodeId, to: targetId, dashed }],
    }));
    setSelectedEdgeId(edgeId);
  };

  const updateEdge = (patch: Partial<BuilderEdge>) => {
    if (!selectedEdgeId) return;
    setDraft((current) => ({
      ...current,
      edges: current.edges.map((edge) => (edge.id === selectedEdgeId ? { ...edge, ...patch } : edge)),
    }));
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setDraft((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== selectedEdgeId),
    }));
    setSelectedEdgeId(null);
  };

  const handleAddTopic = async () => {
    const topic = newTopic.trim();
    if (!topic) return;
    if (roadmapId) {
      try {
        await addTopic({ roadmapId, topic });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add topic.");
        return;
      }
    }
    setDraft((current) => ({ ...current, topics: Array.from(new Set([...current.topics, topic])) }));
    setNewTopic("");
  };

  const handleRemoveTopic = async (topic: string) => {
    if (draft.topics.length <= 1) {
      toast.error("At least one topic must remain.");
      return;
    }
    if (roadmapId) {
      try {
        await removeTopic({ roadmapId, topic });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove topic.");
        return;
      }
    }
    const fallbackTopic = draft.topics.find((item) => item !== topic) ?? "General";
    setDraft((current) => ({
      ...current,
      topics: current.topics.filter((item) => item !== topic),
      nodes: current.nodes.map((node) => (node.topic === topic ? { ...node, topic: fallbackTopic } : node)),
    }));
  };

  const handleDeleteRoadmap = async () => {
    if (!roadmapId) return;
    try {
      await deleteRoadmap({ roadmapId });
      toast.success("Roadmap deleted.");
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete roadmap.");
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((current) => Math.max(0.45, Math.min(1.8, current - event.deltaY * 0.001)));
  };

  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    setIsPanning(true);
    panState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current) {
      const canvasRect = event.currentTarget.getBoundingClientRect();
      const nextX = (event.clientX - canvasRect.left - dragState.current.offsetX - pan.x) / zoom;
      const nextY = (event.clientY - canvasRect.top - dragState.current.offsetY - pan.y) / zoom;
      setDraft((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === dragState.current!.id
            ? {
                ...node,
                x: Math.max(20, Math.min(CANVAS_WIDTH - node.width - 20, nextX)),
                y: Math.max(20, Math.min(CANVAS_HEIGHT - node.height - 20, nextY)),
              }
            : node
        ),
      }));
      return;
    }

    if (!panState.current) return;
    setPan({
      x: panState.current.originX + (event.clientX - panState.current.startX),
      y: panState.current.originY + (event.clientY - panState.current.startY),
    });
  };

  const endPointerInteraction = () => {
    dragState.current = null;
    panState.current = null;
    setIsPanning(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)_280px]">
      <aside className="feature-card order-2 self-start xl:order-1" style={{ padding: "18px" }}>
        <div className="mb-4 flex items-center gap-2">
          <Blocks size={15} style={{ color: "var(--accent-orange)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Topics</p>
        </div>
        <div className="mb-3 space-y-2">
          {draft.topics.map((topic) => (
            <div key={topic} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <span className="flex-1 text-sm font-medium" style={{ color: "var(--ink)" }}>{topic}</span>
              <button type="button" onClick={() => void handleRemoveTopic(topic)} className="rounded-md p-1 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="mb-3 flex gap-2">
          <input value={newTopic} onChange={(event) => setNewTopic(event.target.value)} className="input-field" placeholder="Add topic" />
          <button type="button" onClick={() => void handleAddTopic()} className="btn-outline"><Plus size={15} /></button>
        </div>
        <button type="button" onClick={addNode} className="btn-outline w-full"><Plus size={15} /> Add node</button>
      </aside>

      <section className="order-1 min-w-0 xl:order-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--body)" }}>
            <Route size={13} /> {draft.title}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--mute)" }}>
              {Math.round(zoom * 100)}%
            </div>
            <button type="button" onClick={() => setZoom((current) => Math.min(1.8, current + 0.1))} className="btn-outline"><Plus size={15} /> In</button>
            <button type="button" onClick={() => setZoom((current) => Math.max(0.45, current - 0.1))} className="btn-outline"><Minus size={15} /> Out</button>
            <button type="button" onClick={() => void saveRoadmap()} className="btn-primary"><Save size={15} /> Save</button>
          </div>
        </div>

        <div
          className="relative overflow-auto rounded-[20px] border"
          style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)", height: "clamp(420px, 68vh, 760px)", cursor: isPanning ? "grabbing" : "grab" }}
          onWheel={handleWheel}
          onPointerDown={beginPan}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerInteraction}
          onPointerLeave={endPointerInteraction}
        >
          <div
            className="relative"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "top left",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              backgroundColor: "var(--surface-deep)",
            }}
          >
            <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} fill="none">
              {draft.edges.map((edge) => {
                const from = draft.nodes.find((node) => node.id === edge.from);
                const to = draft.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.x + from.width / 2;
                const y1 = from.y + from.height;
                const x2 = to.x + to.width / 2;
                const y2 = to.y;
                const bendY = y1 + (y2 - y1) / 2;
                const path = `M ${x1} ${y1} L ${x1} ${bendY} L ${x2} ${bendY} L ${x2} ${y2}`;
                const active = selectedEdgeId === edge.id;
                return (
                  <g key={edge.id}>
                    <path d={path} stroke={active ? "rgba(17,255,153,1)" : "rgba(59,158,255,0.92)"} strokeWidth="3" strokeDasharray={edge.dashed ? "6 8" : undefined} strokeLinecap="round" strokeLinejoin="round" />
                    <path d={path} stroke="transparent" strokeWidth="16" fill="none" onClick={() => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }} style={{ cursor: "pointer" }} />
                  </g>
                );
              })}
            </svg>

            {draft.nodes.map((node) => {
              const active = selectedNodeId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                  }}
                  onPointerDown={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    dragState.current = {
                      id: node.id,
                      offsetX: event.clientX - rect.left,
                      offsetY: event.clientY - rect.top,
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  className="absolute rounded-[14px] border p-4 text-left transition-shadow"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    minHeight: node.height,
                    boxShadow: active ? "0 0 0 1px rgba(59,158,255,0.8)" : "none",
                    ...nodeStyle(node.tone),
                  }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{node.label}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>{node.topic}</p>
                    </div>
                    <Grip size={14} style={{ color: "var(--mute)" }} />
                  </div>
                  <p className="text-xs leading-6" style={{ color: node.tone === "optional" ? "var(--charcoal)" : "var(--body)" }}>{node.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="feature-card order-3 self-start xl:col-span-2 2xl:col-span-1" style={{ padding: "18px" }}>
        <div className="mb-4 flex items-center gap-2">
          <Grip size={16} style={{ color: "var(--accent-orange)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Inspector</p>
        </div>

        {selectedNode ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Roadmap title</label>
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Label</label>
              <input value={selectedNode.label} onChange={(event) => updateNode("label", event.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Description</label>
              <textarea value={selectedNode.description} onChange={(event) => updateNode("description", event.target.value)} rows={4} className="input-field resize-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Topic</label>
              <select value={selectedNode.topic} onChange={(event) => updateNode("topic", event.target.value)} className="input-field">
                {draft.topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {(["core", "skill", "optional"] as NodeTone[]).map((tone) => (
                  <button key={tone} type="button" onClick={() => updateNode("tone", tone)} className="rounded-xl border px-3 py-2 text-xs font-medium capitalize" style={{ backgroundColor: selectedNode.tone === tone ? "var(--surface-elevated)" : "var(--surface-card)", borderColor: selectedNode.tone === tone ? "var(--hairline-strong)" : "var(--hairline)", color: "var(--ink)" }}>
                    {selectedNode.tone === tone ? <Check size={12} className="inline mr-1" /> : null}
                    {tone}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Connect To</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {draft.nodes.filter((node) => node.id !== selectedNode.id).map((node) => (
                  <div key={node.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                    <span className="text-sm" style={{ color: "var(--ink)" }}>{node.label}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => addConnection(node.id, false)} className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: "var(--hairline)", color: "var(--body)" }}>Solid</button>
                      <button type="button" onClick={() => addConnection(node.id, true)} className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: "var(--hairline)", color: "var(--body)" }}>Dotted</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" onClick={deleteSelectedNode} className="btn-outline w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
              <Trash2 size={15} /> Delete node
            </button>
          </div>
        ) : selectedEdge ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Edge style</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateEdge({ dashed: false })} className="rounded-xl border px-3 py-2 text-xs font-medium" style={{ backgroundColor: !selectedEdge.dashed ? "var(--surface-elevated)" : "var(--surface-card)", borderColor: !selectedEdge.dashed ? "var(--hairline-strong)" : "var(--hairline)", color: "var(--ink)" }}>Solid</button>
                <button type="button" onClick={() => updateEdge({ dashed: true })} className="rounded-xl border px-3 py-2 text-xs font-medium" style={{ backgroundColor: selectedEdge.dashed ? "var(--surface-elevated)" : "var(--surface-card)", borderColor: selectedEdge.dashed ? "var(--hairline-strong)" : "var(--hairline)", color: "var(--ink)" }}>Dotted</button>
              </div>
            </div>
            <button type="button" onClick={deleteSelectedEdge} className="btn-outline w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
              <Trash2 size={15} /> Delete connection
            </button>
          </div>
        ) : (
          <div className="rounded-xl border p-5 text-center" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Select a node or edge</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>Edit roadmap details, topics, node content, or connections from this panel.</p>
          </div>
        )}

        {roadmapId ? (
          <button type="button" onClick={() => void handleDeleteRoadmap()} className="btn-outline w-full mt-4" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
            <Trash2 size={15} /> Delete roadmap
          </button>
        ) : null}
      </aside>
    </div>
  );
}

export function RoadmapPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [scope, setScope] = useState<Scope>(selectedWorkspaceId ? "workspace" : "private");
  const [activeSource, setActiveSource] = useState<{ kind: SourceKind; id: string } | null>(null);

  const roadmaps = (useQuery(
    api.roadmaps.listRoadmaps,
    user ? { scope, workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined } : "skip"
  ) ?? []) as Array<{
    _id: Id<"roadmaps">;
    title: string;
    topic: string;
    topics: string[];
    nodes: BuilderNode[];
    edges: BuilderEdge[];
  }>;

  const fallbackSource = activeSource ?? (roadmaps[0] ? { kind: "roadmap" as const, id: roadmaps[0]._id } : { kind: "template" as const, id: templates[0].id });
  const sourceRoadmap = fallbackSource.kind === "roadmap" ? roadmaps.find((item) => item._id === fallbackSource.id) ?? roadmaps[0] ?? null : null;
  const sourceTemplate = fallbackSource.kind === "template" ? templates.find((item) => item.id === fallbackSource.id) ?? templates[0] : null;
  const initialDraft = sourceRoadmap
    ? {
        title: sourceRoadmap.title,
        topic: sourceRoadmap.topic,
        topics: [...sourceRoadmap.topics],
        nodes: sourceRoadmap.nodes.map((node) => ({ ...node })),
        edges: sourceRoadmap.edges.map((edge) => ({ ...edge })),
      }
    : cloneTemplate(sourceTemplate ?? templates[0]);

  return (
    <div className="page-container animate-fade-in-up max-w-none relative">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--mute)" }}>Roadmap</p>
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl" style={{ color: "var(--ink)" }}>Minimal roadmap builder</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 sm:text-base" style={{ color: "var(--body)" }}>
            Build, connect, and save roadmap steps without the extra UI noise.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setScope((current) => (current === "private" ? "workspace" : "private"))} className="btn-outline">
            {scope === "private" ? "Private" : "Workspace"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <aside className="feature-card self-start" style={{ padding: "18px" }}>
          <div className="mb-4 flex items-center gap-2">
            <LayoutTemplate size={16} style={{ color: "var(--accent-blue)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Saved Roadmaps</p>
          </div>
          <div className="space-y-2">
            {roadmaps.length === 0 ? (
              <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--charcoal)" }}>
                No saved roadmaps yet in this scope.
              </div>
            ) : (
              roadmaps.map((roadmap) => (
                <button
                  key={roadmap._id}
                  type="button"
                  onClick={() => setActiveSource({ kind: "roadmap", id: roadmap._id })}
                  className="w-full rounded-xl border px-3 py-3 text-left transition-colors"
                  style={{
                    backgroundColor: fallbackSource.kind === "roadmap" && fallbackSource.id === roadmap._id ? "var(--surface-elevated)" : "var(--surface-card)",
                    borderColor: fallbackSource.kind === "roadmap" && fallbackSource.id === roadmap._id ? "var(--hairline-strong)" : "var(--hairline)",
                    color: "var(--ink)",
                  }}
                >
                  <p className="text-sm font-medium">{roadmap.title}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{roadmap.topic}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <aside className="feature-card self-start" style={{ padding: "18px" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
            <FileUp size={15} style={{ color: "var(--accent-green)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Templates</p>
            </div>
            <div className="rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>
              {scope}
            </div>
          </div>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setActiveSource({ kind: "template", id: template.id });
                  toast.success(`Loaded ${template.title} template.`);
                }}
                className="w-full rounded-xl border px-3 py-3 text-left transition-colors"
                style={{
                  backgroundColor: fallbackSource.kind === "template" && fallbackSource.id === template.id ? "var(--surface-elevated)" : "var(--surface-card)",
                  borderColor: fallbackSource.kind === "template" && fallbackSource.id === template.id ? "var(--hairline-strong)" : "var(--hairline)",
                  color: "var(--ink)",
                }}
              >
                <p className="text-sm font-medium">{template.title}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{template.topic}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <RoadmapEditor
        key={`${fallbackSource.kind}-${fallbackSource.id}`}
        roadmapId={sourceRoadmap?._id ?? null}
        initialDraft={initialDraft}
        scope={scope}
        workspaceId={selectedWorkspaceId}
        onSaved={(savedId) => setActiveSource({ kind: "roadmap", id: savedId })}
        onDeleted={() => setActiveSource(null)}
      />
    </div>
  );
}
