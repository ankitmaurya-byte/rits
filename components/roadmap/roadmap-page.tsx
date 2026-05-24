"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Background,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, FileUp, Globe2, History, LayoutTemplate, Loader2, Maximize, Minus, Plus, Route, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import "@xyflow/react/dist/style.css";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type NodeTone = "core" | "skill" | "optional";
type SourceKind = "template" | "roadmap" | "draft";
type AddDirection = "top" | "right" | "bottom" | "left";
type CanvasPoint = { x: number; y: number };
type PointerPosition = { clientX: number; clientY: number };

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
  aiMessages?: RoadmapAiMessage[];
  history?: RoadmapHistoryEntry[];
};

type RoadmapTemplate = {
  id: string;
  title: string;
  topic: string;
  topics: string[];
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  aiMessages?: RoadmapAiMessage[];
  history?: RoadmapHistoryEntry[];
};

type RoadmapFlowData = {
  label: string;
  description: string;
  topic: string;
  tone: NodeTone;
  onAddFrom: (nodeId: string, direction: AddDirection) => void;
  onStartConnection: (nodeId: string, direction: AddDirection, position: PointerPosition) => void;
};

type RoadmapAiMessage = {
  role: "user" | "assistant";
  content: string;
  scope: "roadmap" | "selection";
};

type RoadmapAiPatch = {
  summary?: string;
  title?: string;
  topic?: string;
  topics?: string[];
  nodes?: Array<{
    id: string;
    label?: string;
    description?: string;
    topic?: string;
    tone?: NodeTone;
    x?: number;
    y?: number;
  }>;
  edges?: Array<{
    id: string;
    from: string;
    to: string;
    dashed?: boolean;
  }>;
};

type RoadmapHistoryEntry = {
  id: string;
  label: string;
  createdAt: number;
  draft: DraftRoadmap;
};

type EdgeHandleSide = "top" | "right" | "bottom" | "left";

type EdgeHandlePair = {
  sourceHandle: EdgeHandleSide;
  targetHandle: EdgeHandleSide;
};

type PendingConnection = {
  sourceNodeId: string;
  sourceHandle: EdgeHandleSide;
  cursor: CanvasPoint;
  targetNodeId: string | null;
};

const edgeHandleSides: EdgeHandleSide[] = ["top", "right", "bottom", "left"];

const oppositeHandle: Record<EdgeHandleSide, EdgeHandleSide> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

const addNodeClickDelayMs = 320;

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

function cloneDraft(draft: DraftRoadmap): DraftRoadmap {
  return {
    title: draft.title,
    topic: draft.topic,
    topics: [...draft.topics],
    nodes: draft.nodes.map((node) => ({ ...node })),
    edges: draft.edges.map((edge) => ({ ...edge })),
  };
}

function draftSignature(draft: DraftRoadmap) {
  return JSON.stringify(draft);
}

function counterSeed(values: string[], prefix: string, fallback: number) {
  const maxNumber = values.reduce((maxValue, value) => {
    if (!value.startsWith(prefix)) return maxValue;
    const parsed = Number.parseInt(value.slice(prefix.length), 10);
    return Number.isFinite(parsed) ? Math.max(maxValue, parsed) : maxValue;
  }, 0);
  return Math.max(maxNumber, fallback);
}

function formatHistoryTime(value: number) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createUniqueRoadmapTitle(existingTitles: string[]) {
  const baseTitle = "Untitled roadmap";
  const usedTitles = new Set(existingTitles.map((title) => title.trim().toLowerCase()));

  if (!usedTitles.has(baseTitle.toLowerCase())) {
    return baseTitle;
  }

  let index = 1;
  while (usedTitles.has(`${baseTitle} ${index}`.toLowerCase())) {
    index += 1;
  }

  return `${baseTitle} ${index}`;
}

function createInitialHistoryEntry(draft: DraftRoadmap): RoadmapHistoryEntry {
  return {
    id: `initial-${Date.now()}`,
    label: "Created roadmap",
    createdAt: Date.now(),
    draft: cloneDraft(draft),
  };
}

function persistedRoadmapSignature(draft: DraftRoadmap, aiMessages: RoadmapAiMessage[], history: RoadmapHistoryEntry[]) {
  return JSON.stringify({
    ...draft,
    aiMessages,
    history: history.slice(0, 50),
  });
}

function createEmptyDraft(title = "Untitled roadmap"): DraftRoadmap {
  return {
    title,
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
      backgroundColor: "#082115", // Opaque dark green
      borderColor: "rgba(17,255,153,0.28)",
      color: "var(--ink)",
    };
  }

  if (tone === "skill") {
    return {
      backgroundColor: "#111114", // Opaque dark card
      borderColor: "var(--hairline-strong)",
      color: "var(--ink)",
    };
  }

  return {
    backgroundColor: "#070709", // Opaque deeper background
    borderColor: "var(--hairline)",
    color: "var(--body)",
  };
}

function toFlowNodes(
  draft: DraftRoadmap,
  onAddFrom: (nodeId: string, direction: AddDirection) => void,
  onStartConnection: (nodeId: string, direction: AddDirection, position: PointerPosition) => void,
): Array<Node<RoadmapFlowData>> {
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
      onStartConnection,
    },
  }));
}

function toFlowEdges(draft: DraftRoadmap): Edge[] {
  return draft.edges.map((edge) => ({
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

function flowNodeSize(node: Node<RoadmapFlowData>) {
  return {
    width: node.measured?.width ?? node.width ?? 220,
    height: node.measured?.height ?? node.height ?? 84,
  };
}

function flowNodeAnchors(node: Node<RoadmapFlowData>) {
  const size = flowNodeSize(node);
  const left = node.position.x;
  const right = node.position.x + size.width;
  const top = node.position.y;
  const bottom = node.position.y + size.height;
  const centerX = left + size.width / 2;
  const centerY = top + size.height / 2;

  return {
    top: { x: centerX, y: top },
    right: { x: right, y: centerY },
    bottom: { x: centerX, y: bottom },
    left: { x: left, y: centerY },
  } satisfies Record<EdgeHandleSide, { x: number; y: number }>;
}

function inferFlowEdgeHandles(source?: Node<RoadmapFlowData>, target?: Node<RoadmapFlowData>) {
  if (!source || !target) return null;

  const sourceAnchors = flowNodeAnchors(source);
  const targetAnchors = flowNodeAnchors(target);
  const candidates = [
    { sourceHandle: "right", targetHandle: "left" },
    { sourceHandle: "left", targetHandle: "right" },
    { sourceHandle: "bottom", targetHandle: "top" },
    { sourceHandle: "top", targetHandle: "bottom" },
  ] satisfies EdgeHandlePair[];

  return candidates.reduce((best, candidate) => {
    const sourcePoint = sourceAnchors[candidate.sourceHandle];
    const targetPoint = targetAnchors[candidate.targetHandle];
    const score = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);
    return score < best.score ? { handles: candidate, score } : best;
  }, { handles: candidates[0], score: Number.POSITIVE_INFINITY }).handles;
}

function closestTargetHandle(source: Node<RoadmapFlowData>, target: Node<RoadmapFlowData>, sourceHandle: EdgeHandleSide) {
  const sourcePoint = flowNodeAnchors(source)[sourceHandle];
  const targetAnchors = flowNodeAnchors(target);

  return edgeHandleSides.reduce((best, side) => {
    const targetPoint = targetAnchors[side];
    const score = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);
    return score < best.score ? { side, score } : best;
  }, { side: oppositeHandle[sourceHandle], score: Number.POSITIVE_INFINITY }).side;
}

function flowPointToCanvasPoint(point: CanvasPoint, viewport: Viewport): CanvasPoint {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}

function clientPointToCanvasPoint(position: PointerPosition, bounds: DOMRect): CanvasPoint {
  return {
    x: position.clientX - bounds.left,
    y: position.clientY - bounds.top,
  };
}

function clientPointToFlowPoint(position: PointerPosition, bounds: DOMRect, viewport: Viewport): CanvasPoint {
  const canvasPoint = clientPointToCanvasPoint(position, bounds);

  return {
    x: (canvasPoint.x - viewport.x) / viewport.zoom,
    y: (canvasPoint.y - viewport.y) / viewport.zoom,
  };
}

function findNodeAtFlowPoint(nodes: Array<Node<RoadmapFlowData>>, point: CanvasPoint, excludedNodeId?: string) {
  return [...nodes].reverse().find((node) => {
    if (node.id === excludedNodeId) return false;
    const size = flowNodeSize(node);
    return (
      point.x >= node.position.x &&
      point.x <= node.position.x + size.width &&
      point.y >= node.position.y &&
      point.y <= node.position.y + size.height
    );
  }) ?? null;
}

function connectionControlPoint(point: CanvasPoint, side: EdgeHandleSide, distance: number): CanvasPoint {
  if (side === "top") return { x: point.x, y: point.y - distance };
  if (side === "right") return { x: point.x + distance, y: point.y };
  if (side === "bottom") return { x: point.x, y: point.y + distance };
  return { x: point.x - distance, y: point.y };
}

function connectionPath(start: CanvasPoint, end: CanvasPoint, sourceHandle: EdgeHandleSide, targetHandle: EdgeHandleSide) {
  const distance = Math.max(80, Math.min(180, Math.hypot(end.x - start.x, end.y - start.y) / 2));
  const sourceControl = connectionControlPoint(start, sourceHandle, distance);
  const targetControl = connectionControlPoint(end, targetHandle, distance);

  return `M ${start.x} ${start.y} C ${sourceControl.x} ${sourceControl.y}, ${targetControl.x} ${targetControl.y}, ${end.x} ${end.y}`;
}

function routeEdgesByNodePosition(edges: Edge[], nodes: Array<Node<RoadmapFlowData>>) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const handles = inferFlowEdgeHandles(nodesById.get(edge.source), nodesById.get(edge.target));
    if (!handles) return edge;

    if (edge.sourceHandle === handles.sourceHandle && edge.targetHandle === handles.targetHandle) {
      return edge;
    }

    return {
      ...edge,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    };
  });
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

function stripCodeFences(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    return match[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.substring(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function shallowEqualIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function formatRoadmapForAi(draft: DraftRoadmap) {
  const nodesById = new Map(draft.nodes.map((node) => [node.id, node.label]));
  const edgeLines = draft.edges.length
    ? draft.edges.map((edge) => `${nodesById.get(edge.from) ?? edge.from} -> ${nodesById.get(edge.to) ?? edge.to}${edge.dashed ? " (dashed)" : ""}`).join("\n")
    : "No edges yet.";

  return [
    `Roadmap title: ${draft.title}`,
    `Primary topic: ${draft.topic}`,
    `Topics: ${draft.topics.join(", ")}`,
    "",
    "Nodes:",
    draft.nodes
      .map((node, index) => `${index + 1}. ${node.label} (${node.id})\ntopic: ${node.topic}\ntone: ${node.tone}\ndescription: ${node.description}\nposition: x=${Math.round(node.x)}, y=${Math.round(node.y)}`)
      .join("\n\n"),
    "",
    "Edges:",
    edgeLines,
  ].join("\n");
}

const RoadmapNode = memo(function RoadmapNode({ id, data, selected }: NodeProps<Node<RoadmapFlowData>>) {
  const toneStyle = nodeStyle(data.tone);
  const addTimerRef = useRef<number | null>(null);
  const buttons: Array<{ direction: AddDirection; className: string }> = [
    { direction: "top", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
    { direction: "right", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
    { direction: "bottom", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" },
    { direction: "left", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
  ];

  useEffect(() => {
    return () => {
      if (addTimerRef.current) {
        window.clearTimeout(addTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="group relative rounded-md border px-4 py-3 text-left shadow-sm"
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

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{data.label}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>{data.topic}</p>
        </div>
      </div>

      {buttons.map((item) => (
        <button
          key={item.direction}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (addTimerRef.current) {
              window.clearTimeout(addTimerRef.current);
            }
            addTimerRef.current = window.setTimeout(() => {
              data.onAddFrom(id, item.direction);
              addTimerRef.current = null;
            }, addNodeClickDelayMs);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (addTimerRef.current) {
              window.clearTimeout(addTimerRef.current);
              addTimerRef.current = null;
            }
            data.onStartConnection(id, item.direction, { clientX: event.clientX, clientY: event.clientY });
          }}
          className={`absolute flex h-5 w-5 items-center justify-center rounded-full border opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto ${item.className}`}
          style={{ borderColor: "rgba(59,158,255,0.9)", backgroundColor: "var(--surface-card)", color: "var(--accent-blue)", cursor: "pointer" }}
          title="Click to add. Double-click to connect."
        >
          <Plus size={11} />
        </button>
      ))}
    </div>
  );
});

const nodeTypes = { roadmap: RoadmapNode };

function RoadmapEditor({
  roadmapId,
  initialDraft,
  published = false,
  canPersist,
  onDeleted,
  onSaved,
  headerActions,
}: {
  roadmapId: Id<"roadmaps"> | null;
  initialDraft: DraftRoadmap;
  published?: boolean;
  canPersist: boolean;
  onDeleted: () => void;
  onSaved: (id: Id<"roadmaps">, draft?: DraftRoadmap) => void;
  headerActions?: React.ReactNode;
}) {
  const [title, setTitle] = useState(initialDraft.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [topic, setTopic] = useState(initialDraft.topic);
  const [topics, setTopics] = useState(initialDraft.topics);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialDraft.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [canvasToolExpanded, setCanvasToolExpanded] = useState(true);
  const [inspectorExpanded, setInspectorExpanded] = useState(true);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(() => initialDraft.nodes[0]?.id ? [initialDraft.nodes[0].id] : []);
  const [isCtrlSelecting, setIsCtrlSelecting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessages, setAiMessages] = useState<RoadmapAiMessage[]>(initialDraft.aiMessages ?? []);
  const [aiLoading, setAiLoading] = useState<null | "roadmap-improve">(null);
  const [savedRoadmapId, setSavedRoadmapId] = useState<Id<"roadmaps"> | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [flowViewport, setFlowViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [history, setHistory] = useState<RoadmapHistoryEntry[]>(() => 
    initialDraft.history && initialDraft.history.length > 0 
      ? initialDraft.history 
      : [{
          id: "initial",
          label: "Opened roadmap",
          createdAt: Date.now(),
          draft: cloneDraft(initialDraft),
        }]
  );
  const [localPublished, setLocalPublished] = useState(published);
  const [activeTipPopup, setActiveTipPopup] = useState<number>(() =>
    typeof window !== "undefined" && !localStorage.getItem("roadmap_tips_seen") ? 1 : 0
  );

  const closeTipPopup = (id: number) => {
    if (id === 1) {
      setActiveTipPopup(2);
    } else {
      setActiveTipPopup(0);
      localStorage.setItem("roadmap_tips_seen", "true");
    }
  };

  const nodeCounterRef = useRef(initialDraft.nodes.length + 1);
  const edgeCounterRef = useRef(initialDraft.edges.length + 1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Array<Node<RoadmapFlowData>>>([]);
  const edgesRef = useRef<Edge[]>([]);
  const pendingConnectionRef = useRef<PendingConnection | null>(null);
  const connectNodesRef = useRef<(sourceNodeId: string, targetNodeId: string) => void>(() => {});
  const flowViewportRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 });
  const lastSavedSignatureRef = useRef(persistedRoadmapSignature(initialDraft, initialDraft.aiMessages ?? [], initialDraft.history ?? []));
  const lastHistorySignatureRef = useRef(draftSignature(initialDraft));
  const pendingHistoryLabelRef = useRef<string | null>(null);
  const skipNextHistoryRef = useRef(false);
  const historyReadyRef = useRef(false);
  const autoSaveReadyRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const [nodes, setNodes] = useState<Array<Node<RoadmapFlowData>>>(() =>
    toFlowNodes(initialDraft, addNodeFrom, startConnection)
  );
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(initialDraft));
  const routedEdges = useMemo(() => {
    const seen = new Set<string>();
    const deduplicated = edges.filter((edge) => {
      if (seen.has(edge.id)) return false;
      seen.add(edge.id);
      return true;
    });
    return routeEdgesByNodePosition(deduplicated, nodes);
  }, [edges, nodes]);
  const currentRoadmapId = savedRoadmapId ?? roadmapId;
  const createRoadmap = useMutation(api.roadmaps.createRoadmap);
  const updateRoadmap = useMutation(api.roadmaps.updateRoadmap);
  const hasPendingConnection = pendingConnection !== null;

  function recordHistoryLabel(label: string) {
    pendingHistoryLabelRef.current = label;
  }

  function getCanvasPoint(position: PointerPosition) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    return bounds ? clientPointToCanvasPoint(position, bounds) : { x: 0, y: 0 };
  }

  function findNodeAtClientPosition(position: PointerPosition, excludedNodeId?: string) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;

    const flowPoint = clientPointToFlowPoint(position, bounds, flowViewportRef.current);
    return findNodeAtFlowPoint(nodesRef.current, flowPoint, excludedNodeId);
  }

  function handleViewportChange(nextViewport: Viewport) {
    flowViewportRef.current = nextViewport;
    setFlowViewport(nextViewport);
  }

  function startConnection(sourceNodeId: string, sourceHandle: EdgeHandleSide, position: PointerPosition) {
    const targetNode = findNodeAtClientPosition(position, sourceNodeId);
    setPendingConnection({
      sourceNodeId,
      sourceHandle,
      cursor: getCanvasPoint(position),
      targetNodeId: targetNode?.id ?? null,
    });
  }

  function connectNodes(sourceNodeId: string, targetNodeId: string) {
    if (sourceNodeId === targetNodeId) return;

    const sourceNode = nodesRef.current.find((node) => node.id === sourceNodeId);
    const targetNode = nodesRef.current.find((node) => node.id === targetNodeId);
    if (!sourceNode || !targetNode) return;

    if (edgesRef.current.some((edge) => edge.source === sourceNodeId && edge.target === targetNodeId)) {
      toast.error("Those nodes are already connected.");
      return;
    }

    const handles = inferFlowEdgeHandles(sourceNode, targetNode) ?? { sourceHandle: "right", targetHandle: "left" };

    recordHistoryLabel("Connected nodes");
    edgeCounterRef.current += 1;
    const nextEdgeId = `edge-${edgeCounterRef.current}`;
    setEdges((current) => current.concat({
      id: nextEdgeId,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "rgba(59,158,255,0.92)" },
      style: { stroke: "rgba(59,158,255,0.92)", strokeWidth: 3 },
    }));
    selectEdge(nextEdgeId);
  }

  function addNodeFrom(sourceId: string, direction: AddDirection) {
    const sourceNode = nodesRef.current.find((node) => node.id === sourceId);
    if (!sourceNode) return;
    recordHistoryLabel("Added linked node");
    nodeCounterRef.current += 1;
    edgeCounterRef.current += 1;
    const nextId = `node-${nodeCounterRef.current}`;
    const offsets = {
      top: { x: 0, y: -180 },
      right: { x: 320, y: 0 },
      bottom: { x: 0, y: 180 },
      left: { x: -320, y: 0 },
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
        onStartConnection: startConnection,
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
    setSelectedNodeIds([nextId]);
    setSelectedNodeId(nextId);
    setSelectedEdgeId(null);
  }

  const createDraftFromFlow = useCallback(() => {
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
  }, [edges, initialDraft.nodes, nodes, title, topic, topics]);

  const restoreHistoryEntry = (entry: RoadmapHistoryEntry) => {
    const draft = cloneDraft(entry.draft);
    const nextNodes = toFlowNodes(draft, addNodeFrom, startConnection);
    const nextEdges = toFlowEdges(draft);
    const firstNodeId = draft.nodes[0]?.id ?? null;

    skipNextHistoryRef.current = true;
    pendingHistoryLabelRef.current = null;
    nodeCounterRef.current = counterSeed(draft.nodes.map((node) => node.id), "node-", draft.nodes.length + 1);
    edgeCounterRef.current = counterSeed(draft.edges.map((edge) => edge.id), "edge-", draft.edges.length + 1);
    setTitle(draft.title);
    setTopic(draft.topic);
    setTopics(draft.topics);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeIds(firstNodeId ? [firstNodeId] : []);
    setSelectedNodeId(firstNodeId);
    setSelectedEdgeId(null);
    setHistoryOpen(false);
  };

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    pendingConnectionRef.current = pendingConnection;
  }, [pendingConnection]);

  useEffect(() => {
    connectNodesRef.current = connectNodes;
  });

  useEffect(() => {
    const handleKeyChange = (event: KeyboardEvent) => {
      setIsCtrlSelecting(event.ctrlKey);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey) {
        setIsCtrlSelecting(false);
      }
    };

    const handleWindowBlur = () => setIsCtrlSelecting(false);

    window.addEventListener("keydown", handleKeyChange);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyChange);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (!hasPendingConnection) return;

    const handlePointerMove = (event: PointerEvent) => {
      const currentConnection = pendingConnectionRef.current;
      if (!currentConnection) return;

      const position = { clientX: event.clientX, clientY: event.clientY };
      const targetNode = findNodeAtClientPosition(position, currentConnection.sourceNodeId);
      setPendingConnection((current) => current
        ? {
            ...current,
            cursor: getCanvasPoint(position),
            targetNodeId: targetNode?.id ?? null,
          }
        : current);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const currentConnection = pendingConnectionRef.current;
      if (!currentConnection) return;

      const position = { clientX: event.clientX, clientY: event.clientY };
      const targetNode = findNodeAtClientPosition(position, currentConnection.sourceNodeId);
      setPendingConnection(null);
      if (targetNode) {
        connectNodesRef.current(currentConnection.sourceNodeId, targetNode.id);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingConnection(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasPendingConnection]);

  useEffect(() => {
    const draft = createDraftFromFlow();
    const signature = draftSignature(draft);

    if (!historyReadyRef.current) {
      historyReadyRef.current = true;
      lastHistorySignatureRef.current = signature;
      return;
    }

    if (signature === lastHistorySignatureRef.current) return;

    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false;
      lastHistorySignatureRef.current = signature;
      return;
    }

    const timer = window.setTimeout(() => {
      const label = pendingHistoryLabelRef.current ?? "Edited roadmap";
      pendingHistoryLabelRef.current = null;
      setHistory((current) => [
        {
          id: `history-${Date.now()}`,
          label,
          createdAt: Date.now(),
          draft: cloneDraft(draft),
        },
        ...current,
      ].slice(0, 50));
      lastHistorySignatureRef.current = signature;
    }, 600);

    return () => window.clearTimeout(timer);
  }, [createDraftFromFlow]);

  useEffect(() => {
    const draft = createDraftFromFlow();
    const historyToSave = history.slice(0, 50);
    const signature = persistedRoadmapSignature(draft, aiMessages, historyToSave);

    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      lastSavedSignatureRef.current = signature;
      return;
    }

    if (!canPersist || signature === lastSavedSignatureRef.current) return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          if (currentRoadmapId) {
            await updateRoadmap({ roadmapId: currentRoadmapId, ...draft, aiMessages, history: historyToSave });
          } else {
            const createdId = await createRoadmap({ ...draft, aiMessages, history: historyToSave });
            setSavedRoadmapId(createdId);
            onSaved(createdId, { ...draft, aiMessages, history: historyToSave });
          }
          lastSavedSignatureRef.current = signature;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to autosave roadmap.");
        }
      })();
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [aiMessages, canPersist, createDraftFromFlow, createRoadmap, currentRoadmapId, history, onSaved, updateRoadmap]);

  const syncSelectionState = (nextNodes: Array<Node<RoadmapFlowData>>, nextEdges: Edge[]) => {
    const nextSelectedNodeIds = nextNodes.filter((node) => node.selected).map((node) => node.id);
    const nextSelectedEdgeId = nextEdges.find((edge) => edge.selected)?.id ?? null;

    setSelectedNodeIds((current) => shallowEqualIds(current, nextSelectedNodeIds) ? current : nextSelectedNodeIds);

    if (nextSelectedNodeIds.length > 0) {
      const nextSelectedNodeId = nextSelectedNodeIds[nextSelectedNodeIds.length - 1] ?? null;
      setSelectedNodeId((current) => current === nextSelectedNodeId ? current : nextSelectedNodeId);
      setSelectedEdgeId((current) => current === null ? current : null);
      return;
    }

    if (nextSelectedEdgeId) {
      setSelectedEdgeId((current) => current === nextSelectedEdgeId ? current : nextSelectedEdgeId);
      setSelectedNodeId((current) => current === null ? current : null);
      return;
    }

    setSelectedNodeId((current) => current === null ? current : null);
    setSelectedEdgeId((current) => current === null ? current : null);
  };

  const onNodesChange = (changes: NodeChange[]) => {
    if (changes.some((change) => change.type === "position")) {
      recordHistoryLabel("Moved node");
    } else if (changes.some((change) => change.type === "remove")) {
      recordHistoryLabel("Deleted node");
    }

    setNodes((current) => {
      const nextNodes = applyNodeChanges(changes, current).map((node) => ({
        ...node,
        data: {
          label: node.data.label as string,
          description: node.data.description as string,
          topic: node.data.topic as string,
          tone: node.data.tone as NodeTone,
          onAddFrom: addNodeFrom,
          onStartConnection: startConnection,
        },
      })) as Array<Node<RoadmapFlowData>>;

      syncSelectionState(nextNodes, edges);
      return nextNodes;
    });
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    if (changes.some((change) => change.type === "remove")) {
      recordHistoryLabel("Deleted edge");
    }

    setEdges((current) => {
      const nextEdges = applyEdgeChanges(changes, current);
      syncSelectionState(nodesRef.current, nextEdges);
      return nextEdges;
    });
  };

  const selectNode = (nodeId: string | null) => {
    setSelectedNodeIds(nodeId ? [nodeId] : []);
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  const selectEdge = (edgeId: string | null) => {
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    if (edgeId) setSelectedNodeId(null);
  };

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const updateSelectedNode = (patch: Partial<RoadmapFlowData>) => {
    if (!selectedNodeId) return;
    recordHistoryLabel("Edited node");
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, ...patch, onAddFrom: addNodeFrom, onStartConnection: startConnection } } : node));
  };

  const requestRoadmapAi = async (prompt: string, context: string) => {
    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        context,
        contextType: "roadmap",
      }),
    });

    const data = (await response.json()) as { result?: string; error?: string };
    if (!response.ok || data.error || !data.result) {
      throw new Error(data.error ?? "Canvas tool request failed.");
    }

    return data.result;
  };

  const pushAiMessage = (message: RoadmapAiMessage) => {
    setAiMessages((current) => [...current, message]);
  };



  const applyAiPatch = async (patch: RoadmapAiPatch, scopeMode: "roadmap" | "selection") => {
    recordHistoryLabel(scopeMode === "selection" ? "Improved selected nodes" : "Improved roadmap");
    const nextTopics = Array.from(
      new Set(
        [
          ...topics,
          ...(patch.topics ?? []),
          ...(patch.nodes?.map((node) => node.topic).filter((value): value is string => Boolean(value)) ?? []),
        ].map((value) => value.trim()).filter(Boolean),
      ),
    );

    if (scopeMode === "roadmap") {
      if (patch.title?.trim()) setTitle(patch.title.trim());
      if (patch.topic?.trim()) setTopic(patch.topic.trim());
      if (nextTopics.length > 0) setTopics(nextTopics);
    } else if (nextTopics.length > 0) {
      setTopics(nextTopics);
    }

    if (!patch.nodes?.length) return;

    const patchNodes = patch.nodes;
    const patchEdges = patch.edges ?? [];

    for (let i = 0; i < patchNodes.length; i++) {
      const nodePatch = patchNodes[i];

      setNodes((current) => {
        const nextNodes = [...current];
        const existingIndex = nextNodes.findIndex((n) => n.id === nodePatch.id);
        if (existingIndex >= 0) {
          const node = nextNodes[existingIndex];
          nextNodes[existingIndex] = {
            ...node,
            position: {
              x: nodePatch.x ?? node.position.x,
              y: nodePatch.y ?? node.position.y,
            },
            data: {
              ...node.data,
              label: nodePatch.label?.trim() || node.data.label,
              description: nodePatch.description?.trim() || node.data.description,
              topic: nodePatch.topic?.trim() || node.data.topic,
              tone: nodePatch.tone ?? node.data.tone,
              onAddFrom: addNodeFrom,
              onStartConnection: startConnection,
            },
          };
        } else {
          nextNodes.push({
            id: nodePatch.id,
            type: "roadmap",
            position: { x: nodePatch.x ?? 400, y: nodePatch.y ?? 400 },
            data: {
              label: nodePatch.label?.trim() || "New Step",
              description: nodePatch.description?.trim() || "",
              topic: nodePatch.topic?.trim() || topics[0] || "General",
              tone: nodePatch.tone ?? "skill",
              onAddFrom: addNodeFrom,
              onStartConnection: startConnection,
            },
            width: 220,
            height: 84,
          });
        }
        return nextNodes;
      });

      if (patchEdges.length > 0) {
        setEdges((current) => {
          const nextEdges = [...current];
          const relatedEdges = patchEdges.filter((e) => e.from === nodePatch.id || e.to === nodePatch.id);
          
          relatedEdges.forEach((edgePatch) => {
            const existing = nextEdges.find((e) => e.source === edgePatch.from && e.target === edgePatch.to);
            if (!existing) {
              let edgeId = edgePatch.id;
              if (!edgeId || nextEdges.some((e) => e.id === edgeId)) {
                edgeId = `edge-ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              }
              nextEdges.push({
                id: edgeId,
                source: edgePatch.from,
                target: edgePatch.to,
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "rgba(59,158,255,0.92)" },
                style: { stroke: "rgba(59,158,255,0.92)", strokeWidth: 3, strokeDasharray: edgePatch.dashed ? "6 8" : undefined },
              });
            }
          });
          return nextEdges;
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const handlePromptAi = async () => {
    const currentPrompt = aiPrompt.trim();
    if (!currentPrompt) return;

    const isSelectionActive = selectedNodeIds.length > 0;
    const fullDraft = createDraftFromFlow();
    let draftContext = fullDraft;

    if (isSelectionActive) {
      draftContext = {
        ...fullDraft,
        nodes: fullDraft.nodes.filter((n) => selectedNodeIds.includes(n.id)),
        edges: fullDraft.edges.filter((edge) => selectedNodeIds.includes(edge.from) || selectedNodeIds.includes(edge.to)),
      };
    }

    const context = formatRoadmapForAi(draftContext);

    const prompt = [
      `User request: ${currentPrompt}`,
      ``,
      isSelectionActive 
        ? "CRITICAL INSTRUCTION: The user has selected specific nodes. You MUST focus entirely on expanding or modifying ONLY these selected nodes. Generate new child branches connected to these nodes."
        : "INSTRUCTION: You are generating or modifying the user's roadmap.",
      ``,
      "RESPONSE FORMAT:",
      "1. If the user is just chatting or asking a question that does NOT require modifying the roadmap, return EXACTLY this JSON format:",
      `{ "reply": "Your conversational response here" }`,
      ``,
      "2. If the user asks to generate, expand, or modify the roadmap, return EXACTLY this JSON patch format:",
      "```json",
      "{",
      "  \"summary\": \"Brief summary of your changes\",",
      "  \"title\": \"Roadmap title\",",
      "  \"topic\": \"Main topic\",",
      "  \"topics\": [\"topic1\"],",
      "  \"nodes\": [{\"id\": \"unique-id\", \"label\": \"...\", \"description\": \"...\", \"topic\": \"...\", \"tone\": \"skill\", \"x\": 100, \"y\": 200}],",
      "  \"edges\": [{\"id\": \"edge-1\", \"from\": \"source-id\", \"to\": \"target-id\", \"dashed\": false}]",
      "}",
      "```",
      ``,
      "RULES FOR ROADMAP GENERATION:",
      "- Create in-depth, complex branching trees. Do NOT just make a straight line.",
      "- YOU MUST provide `x` and `y` coordinates for every new node. Nodes are 250px wide and 100px tall. Space them out by at least 300px horizontally and 150px vertically to prevent overlap.",
      "- NEVER return an empty nodes array if asked to expand or generate. You MUST generate the nodes.",
      "- Generate completely unique IDs for every new node and edge."
    ].join("\n");

    pushAiMessage({ role: "user", content: currentPrompt, scope: "roadmap" });
    setAiPrompt("");
    setAiLoading("roadmap-improve");

    try {
      const result = await requestRoadmapAi(prompt, context);
      const parsed = JSON.parse(stripCodeFences(result)) as RoadmapAiPatch & { reply?: string };

      if (parsed.reply) {
        pushAiMessage({
          role: "assistant",
          content: parsed.reply,
          scope: "roadmap",
        });
      } else {
        await applyAiPatch(parsed, isSelectionActive ? "selection" : "roadmap");
        pushAiMessage({
          role: "assistant",
          content: parsed.summary?.trim() || "Roadmap improved.",
          scope: "roadmap",
        });
        toast.success("Roadmap improved.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to improve roadmap.");
    } finally {
      setAiLoading(null);
    }
  };

  const deleteRoadmap = useMutation(api.roadmaps.deleteRoadmap);
  const createShareLink = useMutation(api.roadmaps.createShareLink);
  const setPublished = useMutation(api.roadmaps.setPublished);

  const handleCopyShareLink = async () => {
    if (!currentRoadmapId) {
      toast.error("Open a saved roadmap before sharing.");
      return;
    }

    try {
      const shareToken = await createShareLink({ roadmapId: currentRoadmapId });
      await navigator.clipboard.writeText(`${window.location.origin}/share/roadmap/${shareToken}`);
      toast.success("Roadmap share link copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy share link.");
    }
  };

  const handleTogglePublished = async () => {
    if (!currentRoadmapId) {
      toast.error("Open a saved roadmap before publishing.");
      return;
    }

    try {
      await setPublished({ roadmapId: currentRoadmapId, published: !localPublished });
      setLocalPublished((current) => !current);
      toast.success(localPublished ? "Roadmap removed from public feed." : "Roadmap published to public feed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update roadmap publishing.");
    }
  };

  const handleDeleteRoadmap = async () => {
    if (!currentRoadmapId) return;
    try {
      await deleteRoadmap({ roadmapId: currentRoadmapId });
      toast.success("Roadmap deleted.");
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete roadmap.");
    }
  };

  const addFreeNode = () => {
    recordHistoryLabel("Added node");
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
        onStartConnection: startConnection,
      },
      width: 220,
      height: 84,
    };
    setNodes((current) => current.concat(nextNode));
    setSelectedNodeIds([nextId]);
    setSelectedNodeId(nextId);
    setSelectedEdgeId(null);
  };

  const pendingConnectionPreview = useMemo(() => {
    if (!pendingConnection) return null;

    const sourceNode = nodes.find((node) => node.id === pendingConnection.sourceNodeId);
    if (!sourceNode) return null;

    const targetNode = pendingConnection.targetNodeId
      ? nodes.find((node) => node.id === pendingConnection.targetNodeId) ?? null
      : null;
    const sourcePoint = flowPointToCanvasPoint(flowNodeAnchors(sourceNode)[pendingConnection.sourceHandle], flowViewport);
    const targetHandle = targetNode
      ? closestTargetHandle(sourceNode, targetNode, pendingConnection.sourceHandle)
      : oppositeHandle[pendingConnection.sourceHandle];
    const targetPoint = targetNode
      ? flowPointToCanvasPoint(flowNodeAnchors(targetNode)[targetHandle], flowViewport)
      : pendingConnection.cursor;

    return {
      activeTarget: Boolean(targetNode),
      path: connectionPath(sourcePoint, targetPoint, pendingConnection.sourceHandle, targetHandle),
      targetPoint,
    };
  }, [flowViewport, nodes, pendingConnection]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] w-full">
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
        <div>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>My roadmap</p>
          {isEditingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditingTitle(false);
              }}
              className="w-[300px] bg-transparent text-xl font-medium tracking-tight outline-none sm:text-2xl"
              style={{ color: "var(--ink)" }}
              placeholder="Roadmap title"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="cursor-pointer text-xl font-medium tracking-tight transition-opacity hover:opacity-80 sm:text-2xl"
              style={{ color: "var(--ink)" }}
            >
              {title || "Untitled roadmap"}
            </h1>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {headerActions}
        </div>
      </div>
      <div ref={canvasRef} className="relative flex-1 w-full overflow-hidden" style={{ backgroundColor: "var(--surface-deep)" }}>
      {leftSidebarOpen ? (
        <aside className={`absolute left-4 top-4 z-20 flex w-[340px] flex-col overflow-hidden rounded-[22px] border shadow-2xl ${canvasToolExpanded ? "bottom-4" : ""}`} style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(10,10,12,0.92)", backdropFilter: "blur(16px)" }}>
          <div className="flex cursor-pointer items-center justify-between gap-3 border-b px-4 py-3" onClick={() => setCanvasToolExpanded((current) => !current)} style={{ borderColor: "var(--hairline)" }}>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left">
              <Sparkles size={15} style={{ color: "var(--accent-orange)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Canvas tool</p>
              {canvasToolExpanded ? <ChevronDown size={15} className="ml-auto" style={{ color: "var(--mute)" }} /> : <ChevronRight size={15} className="ml-auto" style={{ color: "var(--mute)" }} />}
            </div>
          </div>

          {canvasToolExpanded ? (
          <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
            <div className="space-y-3">
              <button type="button" onClick={addFreeNode} className="btn-primary w-full"><Plus size={15} /> Add node</button>
              <div className="relative">
                <button type="button" onClick={() => setHistoryOpen((current) => !current)} className="btn-outline w-full">
                  <History size={15} /> History
                  <span className="ml-auto text-xs" style={{ color: "var(--mute)" }}>{history.length}</span>
                </button>
                {historyOpen ? (
                  <div className="mt-2 max-h-[260px] space-y-2 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                    {history.map((entry) => (
                      <button key={entry.id} type="button" onClick={() => restoreHistoryEntry(entry)} className="w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
                        <span className="block truncate text-xs font-medium">{entry.label}</span>
                        <span className="mt-1 block text-[11px]" style={{ color: "var(--mute)" }}>{formatHistoryTime(entry.createdAt)} · {entry.draft.nodes.length} nodes</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
              {aiMessages.length > 0 || aiLoading === "roadmap-improve" ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Chat</span>
                    <button type="button" onClick={() => setAiMessages([])} className="text-[10px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-80" style={{ color: "var(--accent-orange)" }}>New chat</button>
                  </div>
                  <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {aiMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className="rounded-xl border px-3 py-2 text-xs leading-6"
                      style={{
                        borderColor: message.role === "assistant" ? "rgba(255,128,31,0.2)" : "var(--hairline)",
                        backgroundColor: message.role === "assistant" ? "rgba(255,128,31,0.06)" : "var(--surface-deep)",
                        color: message.role === "assistant" ? "var(--body)" : "var(--ink)",
                      }}
                    >
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>
                        {message.role === "assistant" ? "Rits AI" : "You"}
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  ))}
                  {aiLoading === "roadmap-improve" ? (
                    <div className="rounded-xl border px-3 py-2 text-xs leading-6" style={{ borderColor: "rgba(255,128,31,0.2)", backgroundColor: "rgba(255,128,31,0.06)", color: "var(--body)" }}>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Rits AI</div>
                      <div className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" style={{ color: "var(--accent-orange)" }} />
                        <span className="animate-pulse">Thinking...</span>
                      </div>
                    </div>
                  ) : null}
                  </div>
                </div>
              ) : null}
              <div className="relative">
                <textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (aiPrompt.trim() && aiLoading === null) void handlePromptAi();
                    }
                  }}
                  rows={1}
                  className="input-field min-h-[36px] resize-none py-2 pl-3 pr-10 text-sm"
                  placeholder="Chat with Rits AI..."
                  style={{ borderRadius: "18px" }}
                />
                <button
                  type="button"
                  onClick={() => void handlePromptAi()}
                  disabled={aiLoading !== null || !aiPrompt.trim()}
                  className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--canvas)] transition-transform active:scale-95 disabled:opacity-50"
                  aria-label="Send message"
                >
                  {aiLoading === "roadmap-improve" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                </button>
              </div>
            </div>
          </div>
          ) : null}
        </aside>
      ) : (
        <button type="button" onClick={() => setLeftSidebarOpen(true)} className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-2xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(10,10,12,0.92)", color: "var(--ink)", backdropFilter: "blur(16px)" }} aria-label="Expand canvas tool sidebar">
          <ChevronRight size={15} />
          Tools
        </button>
      )}

      {rightSidebarOpen ? (
        <div className={`absolute right-4 top-4 z-20 flex w-[320px] flex-col overflow-hidden rounded-[22px] border shadow-2xl ${inspectorExpanded ? "bottom-4" : ""}`} style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(10,10,12,0.92)", backdropFilter: "blur(16px)" }}>
          <div className="flex cursor-pointer items-center justify-between gap-3 border-b px-4 py-3" onClick={() => setInspectorExpanded((current) => !current)} style={{ borderColor: "var(--hairline)" }}>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left">
              <Route size={15} style={{ color: "var(--accent-orange)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Inspector</p>
              {inspectorExpanded ? <ChevronDown size={15} className="ml-auto" style={{ color: "var(--mute)" }} /> : <ChevronRight size={15} className="ml-auto" style={{ color: "var(--mute)" }} />}
            </div>
          </div>

          {inspectorExpanded ? (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {selectedNode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input value={selectedNode.data.label} onChange={(event) => updateSelectedNode({ label: event.target.value })} className="input-field" placeholder="Node label" />
                <div className="relative">
                  <select value={selectedNode.data.topic} onChange={(event) => updateSelectedNode({ topic: event.target.value })} className="input-field appearance-none pr-8">
                    {topics.map((topicItem) => <option key={topicItem} value={topicItem}>{topicItem}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
                </div>
              </div>
              <textarea value={selectedNode.data.description} onChange={(event) => updateSelectedNode({ description: event.target.value })} rows={4} className="input-field resize-none" placeholder="Node description" />
              <div className="grid grid-cols-3 gap-2">
                {(["core", "skill", "optional"] as NodeTone[]).map((tone) => (
                  <button key={tone} type="button" onClick={() => updateSelectedNode({ tone })} className="rounded-xl border px-3 py-2 text-xs font-medium capitalize" style={{ backgroundColor: selectedNode.data.tone === tone ? "var(--surface-elevated)" : "var(--surface-card)", borderColor: selectedNode.data.tone === tone ? "var(--hairline-strong)" : "var(--hairline)", color: "var(--ink)" }}>
                    {selectedNode.data.tone === tone ? <Check size={12} className="mr-1 inline" /> : null}
                    {tone}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { recordHistoryLabel("Deleted node"); setNodes((current) => current.filter((node) => node.id !== selectedNode.id)); setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)); selectNode(null); }} className="btn-outline w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
                <Trash2 size={15} /> Delete node
              </button>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-3">
              <button type="button" onClick={() => { recordHistoryLabel("Changed edge"); setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? { ...edge, style: { ...edge.style, strokeDasharray: edge.style?.strokeDasharray ? undefined : "6 8" } } : edge)); }} className="btn-outline w-full">Toggle dotted edge</button>
              <button type="button" onClick={() => { recordHistoryLabel("Deleted edge"); setEdges((current) => current.filter((edge) => edge.id !== selectedEdge.id)); selectEdge(null); }} className="btn-outline w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
                <Trash2 size={15} /> Delete edge
              </button>
            </div>
          ) : (
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--charcoal)" }}>
              Select a node or edge inside the canvas to edit it.
            </div>
          )}

          {currentRoadmapId ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void handleCopyShareLink()} className="btn-outline w-full">
                  <Copy size={15} /> Copy link
                </button>
                <button type="button" onClick={() => void handleTogglePublished()} className="btn-outline w-full">
                  <Globe2 size={15} /> {localPublished ? "Unpublish" : "Publish"}
                </button>
              </div>
              <button type="button" onClick={() => void handleDeleteRoadmap()} className="btn-outline mt-4 w-full" style={{ color: "var(--accent-red)", borderColor: "rgba(255,32,71,0.34)" }}>
                <Trash2 size={15} /> Delete roadmap
              </button>
            </>
          ) : null}
          </div>
          ) : null}
        </div>
      ) : (
        <button type="button" onClick={() => setRightSidebarOpen(true)} className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-2xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(10,10,12,0.92)", color: "var(--ink)", backdropFilter: "blur(16px)" }} aria-label="Expand inspector sidebar">
          <ChevronLeft size={15} />
          Inspector
        </button>
      )}

      <ReactFlow
        nodes={nodes}
        edges={routedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(instance) => handleViewportChange(instance.getViewport())}
        onNodeClick={(_event, node) => selectNode(node.id)}
        onEdgeClick={(_event, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          if (pendingConnection) {
            setPendingConnection(null);
            return;
          }
          setSelectedNodeIds([]);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        onViewportChange={handleViewportChange}
        fitView
        minZoom={0.45}
        maxZoom={1.8}
        zoomOnScroll
        panOnScroll={false}
        zoomOnPinch
        panOnDrag={!isCtrlSelecting}
        selectionOnDrag={isCtrlSelecting}
        multiSelectionKeyCode="Control"
        zoomOnDoubleClick={false}
        colorMode="dark"
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "rgba(59,158,255,0.92)" },
          style: { stroke: "rgba(59,158,255,0.92)", strokeWidth: 3 },
        }}
        style={{ backgroundColor: "#050507", cursor: isCtrlSelecting ? "crosshair" : "grab" }}
      >
        <Background color="rgba(255,255,255,0.08)" gap={28} />
        <MiniMap pannable zoomable style={{ backgroundColor: "#0a0a0c", border: "1px solid rgba(255,255,255,0.08)" }} />
        <CustomControls />
      </ReactFlow>

      {pendingConnectionPreview ? (
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
          <path
            d={pendingConnectionPreview.path}
            fill="none"
            stroke="rgba(59,158,255,0.95)"
            strokeDasharray="8 8"
            strokeLinecap="round"
            strokeWidth={3}
          />
          <circle
            cx={pendingConnectionPreview.targetPoint.x}
            cy={pendingConnectionPreview.targetPoint.y}
            fill={pendingConnectionPreview.activeTarget ? "rgba(17,255,153,0.95)" : "rgba(59,158,255,0.95)"}
            r={5}
          />
        </svg>
      ) : null}

      {activeTipPopup === 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full border px-4 py-2 shadow-2xl animate-fade-in-up" style={{ borderColor: "rgba(59,158,255,0.34)", backgroundColor: "rgba(10,10,12,0.92)", backdropFilter: "blur(16px)" }}>
          <span className="text-xs" style={{ color: "var(--ink)" }}>Selection tip: Hold Ctrl and drag to select multiple nodes.</span>
          <button type="button" onClick={() => closeTipPopup(1)} className="rounded-full p-1 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}>
            <X size={12} />
          </button>
        </div>
      )}
      {activeTipPopup === 2 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full border px-4 py-2 shadow-2xl animate-fade-in-up" style={{ borderColor: "rgba(17,255,153,0.34)", backgroundColor: "rgba(10,10,12,0.92)", backdropFilter: "blur(16px)" }}>
          <span className="text-xs" style={{ color: "var(--ink)" }}>Autosave is active: Your changes are saved automatically.</span>
          <button type="button" onClick={() => closeTipPopup(2)} className="rounded-full p-1 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}>
            <X size={12} />
          </button>
        </div>
      )}
    </div>
    </div>
  );
}

export function RoadmapPage() {
  const { user } = useUser();
  const [activeSource, setActiveSource] = useState<{ kind: SourceKind; id: string }>(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get("id");
        if (urlId) return { kind: "roadmap", id: urlId };

        const stored = localStorage.getItem("rits_last_roadmap_source");
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return { kind: "draft", id: "new" };
  });
  const [creatingRoadmap, setCreatingRoadmap] = useState(false);
  const [pendingRoadmapDrafts, setPendingRoadmapDrafts] = useState<Record<string, DraftRoadmap>>({});
  const reservedRoadmapTitlesRef = useRef<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rits_last_roadmap_source", JSON.stringify(activeSource));
    }
  }, [activeSource]);
  const [savedMenuOpen, setSavedMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const draftCounterRef = useRef(1);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (event.target instanceof globalThis.Node && menuContainerRef.current && !menuContainerRef.current.contains(event.target)) {
        setSavedMenuOpen(false);
        setTemplateMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const nextDraftSource = () => {
    draftCounterRef.current += 1;
    return { kind: "draft" as const, id: `draft-${draftCounterRef.current}` };
  };

  const deleteRoadmap = useMutation(api.roadmaps.deleteRoadmap);
  const createRoadmap = useMutation(api.roadmaps.createRoadmap);

  const roadmaps = (useQuery(
    api.roadmaps.listRoadmaps,
    user ? {} : "skip"
  ) ?? []) as Array<{
    _id: Id<"roadmaps">;
    title: string;
    topic: string;
    topics: string[];
    nodes: BuilderNode[];
    edges: BuilderEdge[];
    aiMessages?: RoadmapAiMessage[];
    history?: RoadmapHistoryEntry[];
    published?: boolean;
  }>;

  const resolvedSource = activeSource.kind === "roadmap" && !roadmaps.some((item) => item._id === activeSource.id) && !pendingRoadmapDrafts[activeSource.id]
    ? { kind: "draft" as const, id: "new" }
    : activeSource;
  const sourceRoadmap = resolvedSource.kind === "roadmap" ? roadmaps.find((item) => item._id === resolvedSource.id) ?? null : null;
  const pendingRoadmapDraft = resolvedSource.kind === "roadmap" ? pendingRoadmapDrafts[resolvedSource.id] ?? null : null;
  const sourceTemplate = resolvedSource.kind === "template" ? templates.find((item) => item.id === resolvedSource.id) ?? templates[0] : null;
  const initialDraft = sourceRoadmap
    ? {
        title: sourceRoadmap.title,
        topic: sourceRoadmap.topic,
        topics: [...sourceRoadmap.topics],
        nodes: sourceRoadmap.nodes.map((node) => ({ ...node })),
        edges: sourceRoadmap.edges.map((edge) => ({ ...edge })),
        aiMessages: sourceRoadmap.aiMessages ?? [],
        history: sourceRoadmap.history ?? [],
      }
    : pendingRoadmapDraft
      ? cloneDraft(pendingRoadmapDraft)
    : resolvedSource.kind === "template"
      ? cloneTemplate(sourceTemplate ?? templates[0])
      : createEmptyDraft();

  const handleCreateNewRoadmap = async () => {
    if (!user) {
      toast.error("Please sign in to create roadmaps.");
      return;
    }

    if (creatingRoadmap) return;

    const title = createUniqueRoadmapTitle([
      ...roadmaps.map((roadmap) => roadmap.title),
      ...reservedRoadmapTitlesRef.current,
    ]);
    const draft = createEmptyDraft(title);
    const history = [createInitialHistoryEntry(draft)];

    setCreatingRoadmap(true);
    try {
      const createdId = await createRoadmap({ ...draft, aiMessages: [], history });
      reservedRoadmapTitlesRef.current = [...reservedRoadmapTitlesRef.current, title];
      setPendingRoadmapDrafts((current) => ({
        ...current,
        [createdId]: { ...draft, aiMessages: [], history },
      }));
      setActiveSource({ kind: "roadmap", id: createdId });
      setSavedMenuOpen(false);
      setTemplateMenuOpen(false);
      if (typeof window !== "undefined") window.history.pushState(null, "", `?id=${createdId}`);
      toast.success("Roadmap created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create roadmap.");
    } finally {
      setCreatingRoadmap(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: 0, maxWidth: "none" }}>
      <RoadmapEditor
        key={`${resolvedSource.kind}-${resolvedSource.id}`}
        roadmapId={sourceRoadmap?._id ?? null}
        initialDraft={initialDraft}
        published={sourceRoadmap?.published ?? false}
        canPersist={Boolean(user)}
        onDeleted={() => {
          setActiveSource(nextDraftSource());
          if (typeof window !== "undefined") window.history.pushState(null, "", window.location.pathname);
        }}
        onSaved={(id, draft) => {
          if (draft) {
            setPendingRoadmapDrafts((current) => ({ ...current, [id]: cloneDraft(draft) }));
          }
          setActiveSource({ kind: "roadmap", id });
          if (typeof window !== "undefined") window.history.pushState(null, "", `?id=${id}`);
        }}
        headerActions={
          <div ref={menuContainerRef} className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleCreateNewRoadmap()} disabled={creatingRoadmap} className="btn-primary">
              {creatingRoadmap ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              New roadmap
            </button>
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
              <button type="button" onClick={() => setSavedMenuOpen((current) => !current)} className="btn-outline"><LayoutTemplate size={15} /> My roadmap</button>
              {savedMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-[280px] rounded-2xl border p-2 shadow-2xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                  {roadmaps.length === 0 ? (
                    <div className="rounded-xl px-3 py-3 text-sm" style={{ color: "var(--charcoal)" }}>No saved roadmaps yet.</div>
                  ) : roadmaps.map((roadmap) => (
                    <div key={roadmap._id} className="group relative w-full">
                      <button type="button" onClick={() => { setActiveSource({ kind: "roadmap", id: roadmap._id }); setSavedMenuOpen(false); }} className="w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)] pr-10">
                        <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{roadmap.title}</p>
                        <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{roadmap.topic}</p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteRoadmap({ roadmapId: roadmap._id })
                            .then(() => toast.success("Roadmap deleted."))
                            .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to delete roadmap."));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--accent-red)]"
                        style={{ color: "var(--mute)" }}
                        aria-label="Delete roadmap"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        }
      />
    </div>
  );
}

function CustomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left" className="m-4 flex flex-col gap-1 rounded-lg border p-1 shadow-lg" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline)" }}>
      <button type="button" onClick={() => zoomIn({ duration: 300 })} className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }} title="Zoom in">
        <Plus size={14} />
      </button>
      <button type="button" onClick={() => zoomOut({ duration: 300 })} className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }} title="Zoom out">
        <Minus size={14} />
      </button>
      <button type="button" onClick={() => fitView({ duration: 600 })} className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }} title="Fit to view">
        <Maximize size={12} />
      </button>
    </Panel>
  );
}
