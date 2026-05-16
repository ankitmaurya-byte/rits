import { Doc, Id } from "./_generated/dataModel";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireCurrentUser } from "./authHelpers";

type ItemType = "idea" | "todo" | "note" | "resource";
type Scope = "private" | "workspace";
type ScopeMode = "private" | "current" | "all";

type Counts = Record<ItemType, number>;

type PromptEntry = {
  itemType: ItemType;
  itemId: string;
  scope: Scope;
  title: string;
  body: string;
  href: string;
  workspaceId?: Id<"workspaces">;
  workspaceName?: string;
  timestamp: number;
  refId: string;
};

const MAX_CONTEXT_CHARS = 55_000;
const ITEM_TYPE_PREFIX: Record<ItemType, string> = {
  idea: "I",
  todo: "T",
  note: "N",
  resource: "R",
};

function emptyCounts(): Counts {
  return {
    idea: 0,
    todo: 0,
    note: 0,
    resource: 0,
  };
}

function truncateText(value: string, max: number) {
  const trimmed = value.trim();

  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, max - 3)}...`;
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|blockquote|pre|h[1-6])>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getResourceTitle(resource: Doc<"resources">) {
  const firstLine = resource.description
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (firstLine) {
    return truncateText(firstLine, 80);
  }

  try {
    return new URL(resource.url).hostname.replace(/^www\./, "");
  } catch {
    return truncateText(resource.url, 80);
  }
}

function formatScopeLabel(entry: PromptEntry) {
  if (entry.scope === "private") {
    return "private";
  }

  return `workspace:${entry.workspaceName ?? "Workspace"}`;
}

function buildPromptBlock(entry: PromptEntry) {
  return [
    `[${entry.refId}] ${entry.itemType.toUpperCase()} | ${formatScopeLabel(entry)}`,
    `Title: ${entry.title}`,
    entry.body,
  ].join("\n");
}

export const buildAssistantContext = internalQuery({
  args: {
    scopeMode: v.union(v.literal("private"), v.literal("current"), v.literal("all")),
    workspaceId: v.union(v.id("workspaces"), v.null()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const totalCounts = emptyCounts();
    const includedCounts = emptyCounts();
    const omittedCounts = emptyCounts();

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const workspacePairs = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await ctx.db.get(membership.workspaceId);
        return workspace
          ? { workspace, role: membership.role }
          : null;
      })
    );

    const accessibleWorkspaces = workspacePairs.filter(
      (pair): pair is NonNullable<typeof pair> => pair !== null
    );

    const workspaces = filterWorkspaces(
      accessibleWorkspaces,
      args.scopeMode,
      args.workspaceId
    );

    const workspaceNameById = new Map<string, string>();
    for (const pair of workspaces) {
      workspaceNameById.set(pair.workspace._id, pair.workspace.name);
    }

    const privateIdeas = await ctx.db
      .query("ideas")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", user._id).eq("scope", "private")
      )
      .collect();
    const privateTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", user._id).eq("scope", "private")
      )
      .collect();
    const privateNotes = await ctx.db
      .query("notes")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", user._id).eq("scope", "private")
      )
      .collect();
    const privateResources = await ctx.db
      .query("resources")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", user._id).eq("scope", "private")
      )
      .collect();

    const workspaceIdeas = await Promise.all(
      workspaces.map(({ workspace }) =>
        ctx.db
          .query("ideas")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect()
      )
    );
    const workspaceTodos = await Promise.all(
      workspaces.map(({ workspace }) =>
        ctx.db
          .query("todos")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect()
      )
    );
    const workspaceNotes = await Promise.all(
      workspaces.map(({ workspace }) =>
        ctx.db
          .query("notes")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect()
      )
    );
    const workspaceResources = await Promise.all(
      workspaces.map(({ workspace }) =>
        ctx.db
          .query("resources")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect()
      )
    );
    const workspaceGroups = await Promise.all(
      workspaces.map(({ workspace }) =>
        ctx.db
          .query("todoGroups")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect()
      )
    );

    const groupNameById = new Map<string, string>();
    for (const groupList of workspaceGroups) {
      for (const group of groupList) {
        groupNameById.set(group._id, group.name);
      }
    }

    const baseEntries: Omit<PromptEntry, "refId">[] = [];

    for (const idea of privateIdeas) {
      totalCounts.idea += 1;
      baseEntries.push({
        itemType: "idea",
        itemId: idea._id,
        scope: "private",
        title: idea.title,
        body: [
          idea.tags.length > 0 ? `Tags: ${idea.tags.slice(0, 12).join(", ")}` : null,
          `Description: ${truncateText(idea.description || "No description.", 1_200)}`,
        ]
          .filter(Boolean)
          .join("\n"),
        href: "/private/ideas",
        timestamp: idea.createdAt,
      });
    }

    for (const ideaList of workspaceIdeas) {
      for (const idea of ideaList) {
        totalCounts.idea += 1;
        baseEntries.push({
          itemType: "idea",
          itemId: idea._id,
          scope: "workspace",
          title: idea.title,
          body: [
            idea.tags.length > 0 ? `Tags: ${idea.tags.slice(0, 12).join(", ")}` : null,
            `Description: ${truncateText(idea.description || "No description.", 1_200)}`,
          ]
            .filter(Boolean)
            .join("\n"),
          href: "/private/ideas",
          workspaceId: idea.workspaceId,
          workspaceName: idea.workspaceId
            ? workspaceNameById.get(idea.workspaceId)
            : undefined,
          timestamp: idea.createdAt,
        });
      }
    }

    for (const todo of privateTodos) {
      totalCounts.todo += 1;
      const sourceUrl = todo.sourceUrl ? `Source URL: ${todo.sourceUrl}` : null;
      baseEntries.push({
        itemType: "todo",
        itemId: todo._id,
        scope: "private",
        title: todo.title,
        body: [
          `Status: ${todo.status ?? (todo.completed ? "completed" : "todo")}`,
          `Priority: ${todo.priority}`,
          todo.description
            ? `Description: ${truncateText(todo.description, 1_000)}`
            : null,
          todo.sourceDescription
            ? `Details: ${truncateText(todo.sourceDescription, 1_000)}`
            : null,
          todo.customFields?.length
            ? `Fields: ${todo.customFields
                .map((field) => `${field.key}: ${field.value}`)
                .join(" | ")}`
            : null,
          sourceUrl,
        ]
          .filter(Boolean)
          .join("\n"),
        href: "/private/todos",
        timestamp: todo.createdAt,
      });
    }

    for (const todoList of workspaceTodos) {
      for (const todo of todoList) {
        totalCounts.todo += 1;
        const sourceUrl = todo.sourceUrl ? `Source URL: ${todo.sourceUrl}` : null;
        const groupLabel = todo.groupId ? groupNameById.get(todo.groupId) : null;
        baseEntries.push({
          itemType: "todo",
          itemId: todo._id,
          scope: "workspace",
          title: todo.title,
          body: [
            `Status: ${todo.status ?? (todo.completed ? "completed" : "todo")}`,
            `Priority: ${todo.priority}`,
            groupLabel ? `Group: ${groupLabel}` : null,
            todo.description
              ? `Description: ${truncateText(todo.description, 1_000)}`
              : null,
            todo.sourceDescription
              ? `Details: ${truncateText(todo.sourceDescription, 1_000)}`
              : null,
            todo.customFields?.length
              ? `Fields: ${todo.customFields
                  .map((field) => `${field.key}: ${field.value}`)
                  .join(" | ")}`
              : null,
            sourceUrl,
          ]
            .filter(Boolean)
            .join("\n"),
          href: "/workspace/todos",
          workspaceId: todo.workspaceId,
          workspaceName: todo.workspaceId
            ? workspaceNameById.get(todo.workspaceId)
            : undefined,
          timestamp: todo.createdAt,
        });
      }
    }

    for (const note of privateNotes) {
      totalCounts.note += 1;
      baseEntries.push({
        itemType: "note",
        itemId: note._id,
        scope: "private",
        title: note.title,
        body: `Content: ${truncateText(stripHtml(note.content || ""), 1_800) || "Empty note."}`,
        href: `/private/notes?note=${note._id}`,
        timestamp: note.updatedAt,
      });
    }

    for (const noteList of workspaceNotes) {
      for (const note of noteList) {
        totalCounts.note += 1;
        baseEntries.push({
          itemType: "note",
          itemId: note._id,
          scope: "workspace",
          title: note.title,
          body: `Content: ${truncateText(stripHtml(note.content || ""), 1_800) || "Empty note."}`,
          href: `/workspace/notes?note=${note._id}`,
          workspaceId: note.workspaceId,
          workspaceName: note.workspaceId
            ? workspaceNameById.get(note.workspaceId)
            : undefined,
          timestamp: note.updatedAt,
        });
      }
    }

    for (const resource of privateResources) {
      totalCounts.resource += 1;
      baseEntries.push({
        itemType: "resource",
        itemId: resource._id,
        scope: "private",
        title: getResourceTitle(resource),
        body: [
          `URL: ${resource.url}`,
          resource.description
            ? `Description: ${truncateText(resource.description, 1_200)}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
        href: "/private/resources",
        timestamp: resource.createdAt,
      });
    }

    for (const resourceList of workspaceResources) {
      for (const resource of resourceList) {
        totalCounts.resource += 1;
        baseEntries.push({
          itemType: "resource",
          itemId: resource._id,
          scope: "workspace",
          title: getResourceTitle(resource),
          body: [
            `URL: ${resource.url}`,
            resource.description
              ? `Description: ${truncateText(resource.description, 1_200)}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          href: "/workspace/resources",
          workspaceId: resource.workspaceId,
          workspaceName: resource.workspaceId
            ? workspaceNameById.get(resource.workspaceId)
            : undefined,
          timestamp: resource.createdAt,
        });
      }
    }

    baseEntries.sort((a, b) => b.timestamp - a.timestamp || a.title.localeCompare(b.title));

    const refCounts = emptyCounts();
    const entries = baseEntries.map((entry) => {
      refCounts[entry.itemType] += 1;

      return {
        ...entry,
        refId: `${ITEM_TYPE_PREFIX[entry.itemType]}-${refCounts[entry.itemType]}`,
      };
    });

    const headerLines = [
      `Viewer: ${user.name} <${user.email}>`,
      `Scope: ${describeScope(args.scopeMode, workspaces, args.workspaceId)}.`,
      `Workspaces (${workspaces.length}):`,
      workspaces.length > 0
        ? workspaces
            .map(
              ({ workspace, role }) =>
                `- ${workspace.name} (${role})${workspace.description ? `: ${truncateText(workspace.description, 160)}` : ""}`
            )
            .join("\n")
        : "- No workspaces",
      `Totals: ${totalCounts.idea} ideas, ${totalCounts.todo} todos, ${totalCounts.note} notes, ${totalCounts.resource} resources.`,
    ];

    const promptBlocks = [...headerLines];
    let currentLength = promptBlocks.join("\n\n").length;
    const includedEntries: PromptEntry[] = [];

    for (const entry of entries) {
      const block = buildPromptBlock(entry);

      if (currentLength + block.length + 2 > MAX_CONTEXT_CHARS) {
        omittedCounts[entry.itemType] += 1;
        continue;
      }

      promptBlocks.push(block);
      currentLength += block.length + 2;
      includedCounts[entry.itemType] += 1;
      includedEntries.push(entry);
    }

    const omittedTotal =
      omittedCounts.idea +
      omittedCounts.todo +
      omittedCounts.note +
      omittedCounts.resource;

    if (omittedTotal > 0) {
      promptBlocks.push(
        `Context budget note: omitted ${omittedTotal} older items (${omittedCounts.idea} ideas, ${omittedCounts.todo} todos, ${omittedCounts.note} notes, ${omittedCounts.resource} resources) after hitting the prompt size limit.`
      );
    }

    return {
      promptContext: promptBlocks.join("\n\n"),
      workspaceCount: workspaces.length,
      scopeMode: args.scopeMode,
      totalCounts,
      includedCounts,
      omittedCounts,
      citations: includedEntries.map((entry) => ({
        refId: entry.refId,
        itemType: entry.itemType,
        itemId: entry.itemId,
        title: entry.title,
        scope: entry.scope,
        href: entry.href,
        workspaceId: entry.workspaceId,
        workspaceName: entry.workspaceName,
      })),
    };
  },
});

function filterWorkspaces(
  workspaces: Array<{ workspace: Doc<"workspaces">; role: "owner" | "member" }>,
  scopeMode: ScopeMode,
  workspaceId: Id<"workspaces"> | null
) {
  if (scopeMode === "private") {
    return [];
  }

  if (scopeMode === "current" && workspaceId) {
    return workspaces.filter(({ workspace }) => workspace._id === workspaceId);
  }

  return workspaces;
}

function describeScope(
  scopeMode: ScopeMode,
  workspaces: Array<{ workspace: Doc<"workspaces">; role: "owner" | "member" }>,
  workspaceId: Id<"workspaces"> | null
) {
  if (scopeMode === "private") {
    return "include only private items";
  }

  if (scopeMode === "current") {
    const workspaceName = workspaces.find(({ workspace }) => workspace._id === workspaceId)?.workspace
      .name;
    return workspaceName
      ? `include private items plus the current workspace (${workspaceName})`
      : "include private items plus the currently selected workspace if available";
  }

  return "include all private items and every workspace the user belongs to";
}
