"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  FileText,
  Lightbulb,
  Link2,
  Lock,
  MoreVertical,
  Plus,
  CheckSquare,
  Search,
  LayoutGrid,
  Trash2,
  Users,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ResourceScope = "private" | "workspace";
type ResourceCard = {
  _id: Id<"resources">;
  url: string;
  description: string;
  createdAt: number;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Link is required");
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return new URL(withProtocol).toString();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function getHostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFirstLine(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";
}

function getBaseTitle(url: string, description: string) {
  return truncate(getFirstLine(description) || getHostLabel(url), 80);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildNoteContent(url: string, description: string) {
  const paragraphs = description
    .split(/\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk)}</p>`);

  paragraphs.push(`<p>${escapeHtml(url)}</p>`);
  return paragraphs.join("");
}

type GridPreset = "2x2" | "3x5" | "4x4" | "custom";

function getGridClasses(preset: GridPreset, customColumns: number) {
  if (preset === "2x2") return "grid-cols-1 md:grid-cols-2";
  if (preset === "3x5") return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
  if (preset === "4x4") return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

  const columnMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
  };
  return columnMap[customColumns] ?? columnMap[3];
}

export function ResourcesPage({ scope }: { scope: ResourceScope }) {
  const { user } = useUser();
  const router = useRouter();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const workspace = useQuery(
    api.workspaces.getWorkspaceById,
    scope === "workspace" && selectedWorkspaceId && user
      ? { workspaceId: selectedWorkspaceId, clerkId: user.id }
      : "skip"
  );
  const workspaceResources = useQuery(
    api.resources.getResources,
    scope === "workspace" && selectedWorkspaceId
      ? { workspaceId: selectedWorkspaceId }
      : "skip"
  );
  const privateResources = useQuery(
    api.resources.getPrivateResources,
    scope === "private" && convexUser
      ? { createdBy: convexUser._id }
      : "skip"
  );

  const createResource = useMutation(api.resources.createResource);
  const deleteResource = useMutation(api.resources.deleteResource);
  const createTodo = useMutation(api.todos.createTodo);
  const createNote = useMutation(api.notes.createNote);
  const createIdea = useMutation(api.ideas.createIdea);

  const [showForm, setShowForm] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "with-description" | "without-description">("all");
  const [gridPreset, setGridPreset] = useState<GridPreset>("3x5");
  const [customColumns, setCustomColumns] = useState(3);
  const confirm = useConfirm();

  const resources = scope === "workspace" ? workspaceResources : privateResources;
  const isWorkspace = scope === "workspace";
  const titlePrefix = isWorkspace ? workspace?.name ?? "Workspace" : "Private";
  const routeBase = isWorkspace ? "/workspace" : "/private";
  const resourceList = useMemo(() => resources ?? [], [resources]);
  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return resourceList.filter((resource) => {
      const matchesQuery =
        !query ||
        resource.url.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query) ||
        getHostLabel(resource.url).toLowerCase().includes(query);

      const hasDescription = Boolean(resource.description.trim());
      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "with-description" && hasDescription) ||
        (filterMode === "without-description" && !hasDescription);

      return matchesQuery && matchesFilter;
    });
  }, [resourceList, searchQuery, filterMode]);

  if (isWorkspace && !selectedWorkspaceId) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <Users size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>No workspace selected</h2>
        <p style={{ color: "var(--charcoal)" }}>Create or join a workspace using the sidebar.</p>
      </div>
    );
  }

  if (!user || convexUser === undefined || (isWorkspace && selectedWorkspaceId && workspace === undefined) || resources === undefined) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-52 mb-8" />
        <div className="skeleton h-48 rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const handleCreateResource = async () => {
    if (!convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    try {
      const normalizedUrl = normalizeUrl(urlInput);
      setSaving(true);
      await createResource({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        url: normalizedUrl,
        description: descriptionInput,
        createdBy: convexUser._id,
      });
      setUrlInput("");
      setDescriptionInput("");
      setShowForm(false);
      toast.success("Resource saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save resource.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (resourceId: Id<"resources">) => {
    const confirmed = await confirm({
      title: "Delete resource?",
      description: "This saved link and its context will be removed.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    setBusyKey(`${resourceId}:delete`);
    try {
      await deleteResource({ id: resourceId });
      toast.success("Resource deleted.");
    } catch {
      toast.error("Failed to delete resource.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateTodo = async (resource: ResourceCard) => {
    if (!convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    setBusyKey(`${resource._id}:todo`);
    try {
      await createTodo({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        title: truncate(`Review ${getBaseTitle(resource.url, resource.description)}`, 120),
        priority: "medium",
        status: "todo",
        createdBy: convexUser._id,
        groupId: isWorkspace ? null : undefined,
        sourceUrl: resource.url,
        sourceDescription: resource.description.trim() || undefined,
      });
      toast.success("Added to todos.");
    } catch {
      toast.error("Failed to create todo.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateNote = async (resource: ResourceCard) => {
    if (!convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    setBusyKey(`${resource._id}:note`);
    try {
      const noteId = await createNote({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        title: getBaseTitle(resource.url, resource.description),
        content: buildNoteContent(resource.url, resource.description),
        createdBy: convexUser._id,
      });
      toast.success("Note created from resource.");
      router.push(`${routeBase}/notes?note=${noteId}`);
    } catch {
      toast.error("Failed to create note.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateIdea = async (resource: ResourceCard) => {
    if (!convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    setBusyKey(`${resource._id}:idea`);
    try {
      await createIdea({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        title: getBaseTitle(resource.url, resource.description),
        description: resource.description.trim()
          ? `${resource.description.trim()}\n\nSource: ${resource.url}`
          : `Source: ${resource.url}`,
        tags: [],
        createdBy: convexUser._id,
      });
      toast.success("Idea created from resource.");
      router.push(`${routeBase}/ideas`);
    } catch {
      toast.error("Failed to create idea.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div
        className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, var(--accent-orange-glow) 0%, transparent 70%)",
          opacity: 0.14,
        }}
      />

      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isWorkspace ? (
              <span className="text-xs uppercase tracking-widest font-medium px-2 py-0.5 rounded" style={{ color: "var(--mute)", backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
                {titlePrefix}
              </span>
            ) : (
              <>
                <Lock size={13} style={{ color: "var(--mute)" }} />
                <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--mute)" }}>Private</span>
              </>
            )}
          </div>
          <h2 className="text-3xl font-medium tracking-tight mb-1" style={{ color: "var(--ink)" }}>Resources</h2>
          <p className="text-sm font-medium max-w-2xl" style={{ color: "var(--charcoal)" }}>
            Save links with context, then turn them into todos, notes, or ideas when you are ready.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setUrlInput("");
              setDescriptionInput("");
              return;
            }
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} /> Add Resource
        </button>
      </div>

      <div className="feature-card mb-8 relative z-40 overflow-visible p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-2xl">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search links, hosts, or descriptions..."
                className="input-field min-w-[340px] pl-9 lg:min-w-[520px]"
              />
            </div>

            <select value={filterMode} onChange={(event) => setFilterMode(event.target.value as typeof filterMode)} className="input-field md:w-[220px]">
              <option value="all">All resources</option>
              <option value="with-description">With description</option>
              <option value="without-description">Without description</option>
            </select>
          </div>

          <div className="relative z-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-elevated)]"
                  style={{ borderColor: "var(--hairline-strong)", color: "var(--ink)" }}
                >
                  <LayoutGrid size={15} />
                  Grid: {gridPreset === "custom" ? `Custom ${customColumns} col` : gridPreset}
                  <ChevronDown size={14} style={{ color: "var(--mute)" }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Grid presets</DropdownMenuLabel>
                {(["2x2", "3x5", "4x4", "custom"] as GridPreset[]).map((preset) => (
                  <DropdownMenuItem key={preset} onSelect={() => setGridPreset(preset)}>
                    {preset === "2x2" ? "2 x 2" : preset === "3x5" ? "3 x 5" : preset === "4x4" ? "4 x 4" : "Custom"}
                  </DropdownMenuItem>
                ))}
                {gridPreset === "custom" ? (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>Columns</label>
                      <select value={customColumns} onChange={(event) => setCustomColumns(Number(event.target.value))} className="input-field">
                        <option value={1}>1 column</option>
                        <option value={2}>2 columns</option>
                        <option value={3}>3 columns</option>
                        <option value={4}>4 columns</option>
                      </select>
                    </div>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="feature-card mb-12 animate-fade-in-up relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Link</label>
              <input
                autoFocus
                placeholder="https://example.com/article"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Description</label>
              <textarea
                placeholder="Why this link matters, what to extract from it, or what to revisit later..."
                value={descriptionInput}
                onChange={(event) => setDescriptionInput(event.target.value)}
                rows={5}
                className="input-field resize-none"
              />
            </div>
            <div className="flex gap-4 pt-6 border-t" style={{ borderColor: "var(--divider-soft)" }}>
              <button onClick={handleCreateResource} disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Save Resource"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setUrlInput("");
                  setDescriptionInput("");
                }}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {resourceList.length === 0 && !showForm && (
        <div
          className="flex flex-col items-center justify-center py-32 text-center border rounded-xl relative z-10"
          style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)" }}
        >
          <Link2 size={32} className="mb-6" style={{ color: "var(--accent-orange)" }} />
          <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>
            No {isWorkspace ? "workspace" : "private"} resources yet
          </h3>
          <p className="mb-10 max-w-md" style={{ color: "var(--charcoal)" }}>
            Drop in articles, docs, references, or inspiration links and turn them into action when you need to.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Save first resource
          </button>
        </div>
      )}

      {filteredResources.length === 0 && resourceList.length > 0 ? (
        <div className="feature-card relative z-10 flex flex-col items-center justify-center py-20 text-center">
          <Search size={28} className="mb-4" style={{ color: "var(--stone)" }} />
          <h3 className="mb-2 text-lg font-medium" style={{ color: "var(--ink)" }}>No matching resources</h3>
          <p style={{ color: "var(--charcoal)" }}>Adjust your search or filter to find what you are looking for.</p>
        </div>
      ) : null}

      <div className={`grid gap-6 relative z-0 ${getGridClasses(gridPreset, customColumns)}`}>
        {filteredResources.map((resource, index) => {
          const deleteBusy = busyKey === `${resource._id}:delete`;
          const todoBusy = busyKey === `${resource._id}:todo`;
          const noteBusy = busyKey === `${resource._id}:note`;
          const ideaBusy = busyKey === `${resource._id}:idea`;

          return (
            <div key={resource._id} className="feature-card flex flex-col group relative overflow-hidden" style={{ animationDelay: `${index * 40}ms`, padding: "24px" }}>
              <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "var(--accent-orange)" }} />

              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="badge-pill">{getHostLabel(resource.url)}</span>
                    <span className="text-xs" style={{ color: "var(--mute)" }}>
                      {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium break-all" style={{ color: "var(--ink)" }}>{resource.url}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-elevated)]"
                      style={{ color: "var(--stone)" }}
                      aria-label="Open resource actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} /> Open link
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={todoBusy || busyKey !== null} onSelect={() => void handleCreateTodo(resource)}>
                      <CheckSquare size={14} /> {todoBusy ? "Adding..." : "Add to todo"}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={noteBusy || busyKey !== null} onSelect={() => void handleCreateNote(resource)}>
                      <FileText size={14} /> {noteBusy ? "Creating..." : "New note"}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={ideaBusy || busyKey !== null} onSelect={() => void handleCreateIdea(resource)}>
                      <Lightbulb size={14} /> {ideaBusy ? "Creating..." : "New idea"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" disabled={deleteBusy} onSelect={() => void handleDeleteResource(resource._id)}>
                      <Trash2 size={14} /> {deleteBusy ? "Deleting..." : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {resource.description ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-5 mb-6" style={{ color: "var(--charcoal)" }}>
                  {resource.description}
                </p>
              ) : (
                <p className="text-sm italic mb-6" style={{ color: "var(--stone)" }}>No description added.</p>
              )}

              <div className="mt-auto flex items-center justify-between gap-3 pt-5 border-t" style={{ borderColor: "var(--divider-soft)" }}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-elevated)]"
                  style={{ borderColor: "var(--hairline-strong)", color: "var(--ink)" }}
                >
                  <ExternalLink size={14} /> Open Link
                </a>
                <span className="text-xs" style={{ color: "var(--mute)" }}>
                  Quick actions in menu
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
