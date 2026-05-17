"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { Check, ChevronLeft, ChevronRight, FileUp, LayoutTemplate, Plus, Route, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import "@xyflow/react/dist/style.css";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore } from "@/store/workspace-store";

type NodeTone = "core" | "skill" | "optional";
type Scope = "private" | "workspace";
type SourceKind = "template" | "roadmap" | "draft";
type AddDirection = "top" | "right" | "bottom" | "left";

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
  sourceHandle?: string;
  targetHandle?: string;
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

type RoadmapFlowData = {
  label: string;
  description: string;
  topic: string;
  tone: NodeTone;
  onAddFrom: (nodeId: string, direction: AddDirection) => void;
};

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

function createEmptyDraft(): DraftRoadmap {
  return {
    title: "Untitled roadmap",
    topic: "General",
    topics: ["General"],
    nodes: [
      {
        id: "node-root",
        label: "Start here",
        description: "Define the first milestone or learning step.",
        topic: "General",
        x: 400,
        y: 120,
        width: 250,
        height: 96,
        tone: "core",
      },
    ],
    edges: [],
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

function toFlowNodes(draft: DraftRoadmap, onAddFrom: (nodeId: string, direction: AddDirection) => void): Array<Node<RoadmapFlowData>> {
  return draft.nodes.map((node) => ({
    id: node.id,
    type: "roadmap",
    position: { x: node.x, y: node.y },
    width: node.width,
    height: node.height,
    draggable: true,
      data: {
        label: node.label,
        description: node.description,
        topic: node.topic,
        tone: node.tone,
        onAddFrom,
      },
  }));
}

function toFlowEdges(draft: DraftRoadmap): Edge[] {
  const nodesById = new Map(draft.nodes.map((node) => [node.id, node]));

  return draft.edges.map((edge) => ({
    ...(inferEdgeHandles(nodesById.get(edge.from), nodesById.get(edge.to)) ?? {}),
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: "smoothstep",
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "rgba(59,158,255,0.92)" },
    style: {
      stroke: "rgba(59,158,255,0.92)",
      strokeWidth: 3,
      strokeDasharray: edge.dashed ? "6 8" : undefined,
    },
  }));
}

function inferEdgeHandles(fromNode?: BuilderNode, toNode?: BuilderNode) {
  if (!fromNode || !toNode) {
    return null;
  }

  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }

  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
}

function fromFlowNodes(nodes: Node<RoadmapFlowData>[], previous: BuilderNode[]): BuilderNode[] {
  return nodes.map((node) => {
    const match = previous.find((item) => item.id === node.id);
    return {
      id: node.id,
      label: node.data.label,
      description: node.data.description,
      topic: node.data.topic,
      x: node.position.x,
      y: node.position.y,
      width: match?.width ?? 220,
      height: match?.height ?? 84,
      tone: node.data.tone,
    };
  });
}

const RoadmapNode = memo(function RoadmapNode({ id, data, selected }: NodeProps<Node<RoadmapFlowData>>) {
  const toneStyle = nodeStyle(data.tone);
  const buttons: Array<{ direction: AddDirection; className: string }> = [
    { direction: "top", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
    { direction: "right", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
    { direction: "bottom", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" },
    { direction: "left", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
  ];

  return (
    <div
      className="relative rounded-[16px] border px-4 py-3 text-left shadow-sm"
      style={{
        minWidth: 220,
        maxWidth: 260,
        boxShadow: selected ? "0 0 0 1px rgba(59,158,255,0.85)" : "none",
        ...toneStyle,
      }}
    >
      <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="right" type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="bottom" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="left" type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="top" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="right" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="left" type="source" position={Position.Left} style={{ opacity: 0 }} />

      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{data.label}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>{data.topic}</p>
        </div>
      </div>
      <p className="text-xs leading-6" style={{ color: data.tone === "optional" ? "var(--charcoal)" : "var(--body)" }}>{data.description}</p>

      {buttons.map((item) => (
        <button
          key={item.direction}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            data.onAddFrom(id, item.direction);
          }}
          className={`absolute flex h-5 w-5 items-center justify-center rounded-full border ${item.className}`}
          style={{ borderColor: "rgba(59,158,255,0.9)", backgroundColor: "var(--surface-card)", color: "var(--accent-blue)", cursor: "pointer" }}
        >
          <Plus size={11} />
        </button>
      ))}
    </div>
  );
});

const nodeTypes = { roadmap: RoadmapNode };
const noopAddFrom = () => {};

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
  const [title, setTitle] = useState(initialDraft.title);
  const [topic, setTopic] = useState(initialDraft.topic);
  const [topics, setTopics] = useState(initialDraft.topics);
  const [newTopic, setNewTopic] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialDraft.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const nodeCounterRef = useRef(initialDraft.nodes.length + 1);
  const edgeCounterRef = useRef(initialDraft.edges.length + 1);
  const nodesRef = useRef<Array<Node<RoadmapFlowData>>>([]);
  const [nodes, setNodes] = useState<Array<Node<RoadmapFlowData>>>(() =>
    toFlowNodes(initialDraft, noopAddFrom)
  );
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(initialDraft));

  function addNodeFrom(sourceId: string, direction: AddDirection) {
    const sourceNode = nodesRef.current.find((node) => node.id === sourceId);
    if (!sourceNode) return;
    nodeCounterRef.current += 1;
    edgeCounterRef.current += 1;
    const nextId = `node-${nodeCounterRef.current}`;
    const offsets = {
      top: { x: 0, y: -180 },
      right: { x: 320, y: 0 },
      bottom: { x: 0, y: 180 },
      left: { x: -320, y: 0 },
    } as const;

    const oppositeHandle = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    } as const;

    const nextNode: Node<RoadmapFlowData> = {
      id: nextId,
      type: "roadmap",
      position: {
        x: sourceNode.position.x + offsets[direction].x,
        y: sourceNode.position.y + offsets[direction].y,
      },
      data: {
        label: "New Step",
        description: "Describe what should be learned or built here.",
        topic: sourceNode.data.topic,
        tone: "skill",
        onAddFrom: addNodeFrom,
      },
      width: 220,
      height: 84,
    };

    setNodes((current) => current.concat(nextNode));
    setEdges((current) => current.concat({
      id: `edge-${edgeCounterRef.current}`,
      source: sourceId,
      target: nextId,
      sourceHandle: direction,
      targetHandle: oppositeHandle[direction],
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "rgba(59,158,255,0.92)" },
      style: { stroke: "rgba(59,158,255,0.92)", strokeWidth: 3 },
    }));
    setSelectedNodeId(nextId);
    setSelectedEdgeId(null);
  }

  const createDraftFromFlow = () => {
    const builderNodes = fromFlowNodes(nodes, initialDraft.nodes);
    return {
      title: title.trim() || "Untitled roadmap",
      topic: topic.trim() || topics[0] || "General",
      topics: Array.from(new Set(topics.map((item) => item.trim()).filter(Boolean))).slice(0, 20),
      nodes: builderNodes,
      edges: edges.map((edge) => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
        dashed: typeof edge.style?.strokeDasharray === "string",
      })),
    } satisfies DraftRoadmap;
  };

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes((current) =>
      applyNodeChanges(changes, current).map((node) => ({
        ...node,
        data: {
          label: node.data.label as string,
          description: node.data.description as string,
          topic: node.data.topic as string,
          tone: node.data.tone as NodeTone,
          onAddFrom: addNodeFrom,
        },
      })) as Array<Node<RoadmapFlowData>>
    );
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  };

  const selectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  const selectEdge = (edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) setSelectedNodeId(null);
  };

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const updateSelectedNode = (patch: Partial<RoadmapFlowData>) => {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, ...patch, onAddFrom: addNodeFrom } } : node));
  };

  const updateRoadmap = useMutation(api.roadmaps.updateRoadmap);
  const createRoadmap = useMutation(api.roadmaps.createRoadmap);
  const deleteRoadmap = useMutation(api.roadmaps.deleteRoadmap);

  const handleSave = async () => {
    if (scope === "workspace" && !workspaceId) {
      toast.error("Select a workspace first.");
      return;
    }
    const draft = createDraftFromFlow();
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

  const addTopic = () => {
    const value = newTopic.trim();
    if (!value) return;
    setTopics((current) => Array.from(new Set([...current, value])));
    setNewTopic("");
  };

  const removeTopic = (value: string) => {
    if (topics.length <= 1) {
      toast.error("At least one topic must remain.");
      return;
    }
    const nextTopics = topics.filter((topicItem) => topicItem !== value);
    const fallback = nextTopics[0] ?? "General";
    setTopics(nextTopics);
    setNodes((current) => current.map((node) => node.data.topic === value ? { ...node, data: { ...node.data, topic: fallback, onAddFrom: addNodeFrom } } : node));
  };

  const addFreeNode = () => {
    nodeCounterRef.current += 1;
    const nextId = `node-${nodeCounterRef.current}`;
    const nextNode: Node<RoadmapFlowData> = {
      id: nextId,
      type: "roadmap",
      position: { x: 420, y: 220 },
      data: {
        label: "New Step",
        description: "Describe what should be learned or built here.",
        topic: topics[0] ?? "General",
        tone: "skill",
        onAddFrom: addNodeFrom,
      },
      width: 220,
      height: 84,
    };
    setNodes((current) => current.concat(nextNode));
    setSelectedNodeId(nextId);
    setSelectedEdgeId(null);
  };

  return (
    <div className="relative h-[calc(100vh-132px)] w-full overflow-hidden" style={{ backgroundColor: "var(--surface-deep)" }}>
      <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
        <button type="button" onClick={handleSave} className="btn-primary"><Save size={15} /> Save</button>
        <button type="button" onClick={() => setLeftOpen((current) => !current)} className="btn-outline">{leftOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />} Canvas tools</button>
        <button type="button" onClick={() => setRightOpen((current) => !current)} className="btn-outline">{rightOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />} Inspector</button>
      </div>

      {leftOpen ? (
        <div className="absolute left-4 top-16 z-20 w-[260px] rounded-[22px] border p-4 shadow-2xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(10,10,12,0.92)", backdropFilter: "blur(16px)" }}>
          <div className="mb-4 flex items-center gap-2">
            <LayoutTemplate size={15} style={{ color: "var(--accent-blue)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Canvas tools</p>
          </div>
          <div className="space-y-3">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder="Roadmap title" />
            <input value={topic} onChange={(event) => setTopic(event.target.value)} className="input-field" placeholder="Primary topic" />
            <div className="flex gap-2">
              <input value={newTopic} onChange={(event) => setNewTopic(event.target.value)} className="input-field" placeholder="Add topic" />
              <button type="button" onClick={addTopic} className="btn-outline"><Plus size={15} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map((topicItem) => (
                <span key={topicItem} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--body)" }}>
                  {topicItem}
                  <button type="button" onClick={() => removeTopic(topicItem)} style={{ color: "var(--mute)" }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <button type="button" onClick={addFreeNode} className="btn-outline w-full"><Plus size={15} /> Add node</button>
          </div>
        </div>
      ) : null}

      {rightOpen ? (
        <div className="absolute right-4 top-16 z-20 w-[300px] rounded-[22px] border p-4 shadow-2xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(10,10,12,0.92)", backdropFilter: "blur(16px)" }}>
          <div className="mb-4 flex items-center gap-2">
            <Route size={15} style={{ color: "var(--accent-orange)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Inspector</p>
          </div>

          {selectedNode ? (
            <div className="space-y-3">
              <input value={selectedNode.data.label} onChange={(event) => updateSelectedNode({ label: event.target.value })} className="input-field" placeholder="Node label" />
              <textarea value={selectedNode.data.description} onChange={(event) => updateSelectedNode({ description: event.target.value })} rows={4} className="input-field resize-none" placeholder="Node description" />
              <select value={selectedNode.data.topic} onChange={(event) => updateSelectedNode({ topic: event.target.value })} className="input-field">
                {topics.map((topicItem) => <option key={topicItem} value={topicItem}>{topicItem}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                {(["core", "skill", "optional"] as NodeTone[]).map((tone) => (
                  <button key={tone} type="button" onClick={() => updateSelectedNode({ tone })} className="rounded-xl border px-3 py-2 text-xs font-medium capitalize" style={{ backgroundColor: selectedNode.data.tone === tone ? "var(--surface-elevated)" : "var(--surface-card)", borderColor: selectedNode.data.tone === tone ? "var(--hairline-strong)" : "var(--hairline)", color: "var(--ink)" }}>
                    {selectedNode.data.tone === tone ? <Check size={12} className="mr-1 inline" /> : null}
                    {tone}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setNodes((current) => current.filter((node) => node.id !== selectedNode.id)); setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)); selectNode(null); }} className="btn-outline w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
                <Trash2 size={15} /> Delete node
              </button>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-3">
              <button type="button" onClick={() => setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? { ...edge, style: { ...edge.style, strokeDasharray: edge.style?.strokeDasharray ? undefined : "6 8" } } : edge))} className="btn-outline w-full">Toggle dotted edge</button>
              <button type="button" onClick={() => { setEdges((current) => current.filter((edge) => edge.id !== selectedEdge.id)); selectEdge(null); }} className="btn-outline w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
                <Trash2 size={15} /> Delete edge
              </button>
            </div>
          ) : (
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--charcoal)" }}>
              Select a node or edge inside the canvas to edit it.
            </div>
          )}

          {roadmapId ? (
            <button type="button" onClick={() => void handleDeleteRoadmap()} className="btn-outline mt-4 w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
              <Trash2 size={15} /> Delete roadmap
            </button>
          ) : null}
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_event, node) => selectNode(node.id)}
        onEdgeClick={(_event, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        fitView
        minZoom={0.45}
        maxZoom={1.8}
        zoomOnScroll
        panOnScroll={false}
        zoomOnPinch
        panOnDrag
        zoomOnDoubleClick={false}
        colorMode="dark"
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "rgba(59,158,255,0.92)" },
          style: { stroke: "rgba(59,158,255,0.92)", strokeWidth: 3 },
        }}
        style={{ backgroundColor: "#050507" }}
      >
        <Background color="rgba(255,255,255,0.08)" gap={28} />
        <MiniMap pannable zoomable style={{ backgroundColor: "#0a0a0c", border: "1px solid rgba(255,255,255,0.08)" }} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}

export function RoadmapPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [scope, setScope] = useState<Scope>(selectedWorkspaceId ? "workspace" : "private");
  const [activeSource, setActiveSource] = useState<{ kind: SourceKind; id: string }>({ kind: "draft", id: "new" });
  const [savedMenuOpen, setSavedMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const draftCounterRef = useRef(1);

  const nextDraftSource = () => {
    draftCounterRef.current += 1;
    return { kind: "draft" as const, id: `draft-${draftCounterRef.current}` };
  };

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

  const resolvedSource = activeSource.kind === "roadmap" && !roadmaps.some((item) => item._id === activeSource.id)
    ? { kind: "draft" as const, id: "new" }
    : activeSource;
  const sourceRoadmap = resolvedSource.kind === "roadmap" ? roadmaps.find((item) => item._id === resolvedSource.id) ?? null : null;
  const sourceTemplate = resolvedSource.kind === "template" ? templates.find((item) => item.id === resolvedSource.id) ?? templates[0] : null;
  const initialDraft = sourceRoadmap
    ? {
        title: sourceRoadmap.title,
        topic: sourceRoadmap.topic,
        topics: [...sourceRoadmap.topics],
        nodes: sourceRoadmap.nodes.map((node) => ({ ...node })),
        edges: sourceRoadmap.edges.map((edge) => ({ ...edge })),
      }
    : resolvedSource.kind === "template"
      ? cloneTemplate(sourceTemplate ?? templates[0])
      : createEmptyDraft();

  return (
    <div className="animate-fade-in-up" style={{ padding: 0, maxWidth: "none" }}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--mute)" }}>Roadmap</p>
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl" style={{ color: "var(--ink)" }}>React Flow roadmap builder</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setActiveSource(nextDraftSource())} className="btn-primary"><Plus size={15} /> New roadmap</button>
          <div className="relative">
            <button type="button" onClick={() => setTemplateMenuOpen((current) => !current)} className="btn-outline"><FileUp size={15} /> Import template</button>
            {templateMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-[280px] rounded-2xl border p-2 shadow-2xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                {templates.map((template) => (
                  <button key={template.id} type="button" onClick={() => { setActiveSource({ kind: "template", id: template.id }); setTemplateMenuOpen(false); }} className="w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]">
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{template.title}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{template.topic}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setSavedMenuOpen((current) => !current)} className="btn-outline"><LayoutTemplate size={15} /> Open saved roadmap</button>
            {savedMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-[280px] rounded-2xl border p-2 shadow-2xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                {roadmaps.length === 0 ? (
                  <div className="rounded-xl px-3 py-3 text-sm" style={{ color: "var(--charcoal)" }}>No saved roadmaps yet.</div>
                ) : roadmaps.map((roadmap) => (
                  <button key={roadmap._id} type="button" onClick={() => { setActiveSource({ kind: "roadmap", id: roadmap._id }); setSavedMenuOpen(false); }} className="w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]">
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{roadmap.title}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{roadmap.topic}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => setScope((current) => current === "private" ? "workspace" : "private")} className="btn-outline">
            {scope === "private" ? "Private" : "Workspace"}
          </button>
        </div>
      </div>

      <RoadmapEditor
        key={`${resolvedSource.kind}-${resolvedSource.id}-${scope}`}
        roadmapId={sourceRoadmap?._id ?? null}
        initialDraft={initialDraft}
        scope={scope}
        workspaceId={selectedWorkspaceId}
        onSaved={(savedId) => setActiveSource({ kind: "roadmap", id: savedId })}
        onDeleted={() => setActiveSource(nextDraftSource())}
      />
    </div>
  );
}
