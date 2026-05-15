"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/lib/use-workspace";
import { ThemedSelect } from "@/components/ui/themed-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  BookOpen,
  Cpu,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderGit2,
  Globe,
  Lightbulb,
  Plus,
  Search,
  SearchCode,
  Sparkles,
  Star,
  Workflow,
  Wrench,
  CheckSquare,
} from "lucide-react";

type GitHubTool = Doc<"githubTools">;

type ManualDraft = {
  repoUrl: string;
  description: string;
  homepageUrl: string;
  language: string;
  stars: string;
  forks: string;
  openIssues: string;
  topics: string;
  readme: string;
  aiSummary: string;
  aiUseCases: string;
  aiOpportunity: string;
};

const emptyDraft: ManualDraft = {
  repoUrl: "",
  description: "",
  homepageUrl: "",
  language: "",
  stars: "",
  forks: "",
  openIssues: "",
  topics: "",
  readme: "",
  aiSummary: "",
  aiUseCases: "",
  aiOpportunity: "",
};

function parseRepoUrl(input: string) {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    if (url.hostname !== "github.com") {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      return null;
    }

    return {
      owner: parts[0],
      name: parts[1].replace(/\.git$/, ""),
      htmlUrl: `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}`,
    };
  } catch {
    return null;
  }
}

function parseTopics(input: string) {
  return input
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildRepoContext(repo: GitHubTool) {
  return [
    `Repository: ${repo.repoFullName}`,
    `Description: ${repo.description}`,
    `Language: ${repo.language ?? "Unknown"}`,
    `Stars: ${repo.stars}`,
    `Forks: ${repo.forks}`,
    `Topics: ${repo.topics.join(", ") || "None"}`,
    `Homepage: ${repo.homepageUrl ?? "None"}`,
    `AI summary: ${repo.aiSummary ?? "None"}`,
    `AI use cases: ${repo.aiUseCases ?? "None"}`,
    `AI opportunity: ${repo.aiOpportunity ?? "None"}`,
    `README:\n${(repo.readme ?? "README not available").slice(0, 10000)}`,
  ].join("\n");
}

function buildNoteContent(repo: GitHubTool) {
  return [
    `# ${repo.repoFullName}`,
    "",
    `URL: ${repo.htmlUrl}`,
    `Language: ${repo.language ?? "Unknown"}`,
    `Stars: ${repo.stars}`,
    `Forks: ${repo.forks}`,
    `Topics: ${repo.topics.join(", ") || "None"}`,
    "",
    "## Description",
    repo.description,
    repo.aiSummary ? `\n## AI Summary\n${repo.aiSummary}` : "",
    repo.aiUseCases ? `\n## Use Cases\n${repo.aiUseCases}` : "",
    repo.aiOpportunity ? `\n## Opportunity\n${repo.aiOpportunity}` : "",
    repo.aiAnalysis ? `\n## Analysis\n${repo.aiAnalysis}` : "",
    repo.readme ? `\n## README\n${repo.readme.slice(0, 8000)}` : "",
  ].join("\n");
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 mt-5 text-[16px] font-semibold first:mt-0" style={{ color: "var(--ink)" }}>{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-[14px] font-semibold first:mt-0" style={{ color: "var(--ink)" }}>{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-[13px] font-semibold first:mt-0" style={{ color: "var(--ink)" }}>{children}</h3>,
        p: ({ children }) => <p className="mb-3 text-[13.5px] leading-7 last:mb-0" style={{ color: "var(--body)" }}>{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1.5" style={{ color: "var(--body)" }}>{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5" style={{ color: "var(--body)" }}>{children}</ol>,
        li: ({ children }) => <li className="text-[13.5px] leading-7">{children}</li>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--accent-blue)" }}>{children}</a>,
        code: ({ children }) => <code className="rounded px-1.5 py-0.5 text-[12px]" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--ink)", border: "1px solid var(--hairline)" }}>{children}</code>,
        pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-xl border p-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "var(--hairline-strong)" }}>{children}</pre>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function GithubToolsExplorerPage() {
  const router = useRouter();
  const { user } = useUser();
  const { workspaceId, isLoading } = useWorkspace();
  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const rawFeed = useQuery(api.githubTools.listFeed, {});
  const feed = useMemo(() => (rawFeed ?? []) as GitHubTool[], [rawFeed]);

  const fetchRepos = useAction(api.githubTools.fetchRepos);
  const createManual = useMutation(api.githubTools.createManual);
  const updateAiFields = useMutation(api.githubTools.updateAiFields);
  const createTodo = useMutation(api.todos.createTodo);
  const createIdea = useMutation(api.ideas.createIdea);
  const createNote = useMutation(api.notes.createNote);
  const createResource = useMutation(api.resources.createResource);

  const [searchQuery, setSearchQuery] = useState("");
  const [fetchMode, setFetchMode] = useState<"trending" | "stars">("trending");
  const [language, setLanguage] = useState("");
  const [fetchPrompt, setFetchPrompt] = useState("ai tools developer tools agent framework");
  const [fetchLimit, setFetchLimit] = useState("6");
  const [selectedRepo, setSelectedRepo] = useState<GitHubTool | null>(null);
  const [repoAnalysisPrompt, setRepoAnalysisPrompt] = useState(
    "Analyze this repository: summarize what it does, who it is for, its moat, risks, business potential, and what product ideas or workflows can be built from it."
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [generatingManualAi, setGeneratingManualAi] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualDraft>(emptyDraft);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const filteredFeed = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return feed;
    }

    return feed.filter((repo) =>
      [repo.repoFullName, repo.description, repo.language ?? "", repo.aiSummary ?? "", repo.aiOpportunity ?? "", repo.topics.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [feed, searchQuery]);

  const defaultScope = workspaceId ? "workspace" : "private";
  const defaultWorkspaceId = workspaceId ?? undefined;

  const selectedFeedRepo = selectedRepo ? feed.find((repo) => repo._id === selectedRepo._id) ?? selectedRepo : null;

  const handleFetchRepos = async () => {
    setFetchingRepos(true);
    try {
      const result = await fetchRepos({
        mode: fetchMode,
        queryText: fetchPrompt,
        language: language.trim() || undefined,
        limit: Number(fetchLimit),
      });
      toast.success(`GitHub sync complete. Added ${result.inserted}, updated ${result.updated}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GitHub fetch failed.");
    } finally {
      setFetchingRepos(false);
    }
  };

  const handleGenerateManualAi = async () => {
    const parsed = parseRepoUrl(manualDraft.repoUrl);
    if (!parsed) {
      toast.error("Enter a valid GitHub repository URL first.");
      return;
    }

    setGeneratingManualAi(true);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            'Return valid JSON only with keys "aiSummary", "aiUseCases", and "aiOpportunity". Each value should be concise markdown-friendly text with no code fences.',
          context: [
            `Repository: ${parsed.owner}/${parsed.name}`,
            `URL: ${parsed.htmlUrl}`,
            `Description: ${manualDraft.description || "Not provided"}`,
            `Language: ${manualDraft.language || "Not provided"}`,
            `Topics: ${manualDraft.topics || "Not provided"}`,
            `README: ${(manualDraft.readme || "Not provided").slice(0, 8000)}`,
          ].join("\n"),
          contextType: "note",
        }),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result) {
        throw new Error(data.error ?? "AI generation failed.");
      }

      const parsedAi = JSON.parse(data.result) as {
        aiSummary?: string;
        aiUseCases?: string;
        aiOpportunity?: string;
      };

      setManualDraft((draft) => ({
        ...draft,
        aiSummary: parsedAi.aiSummary?.trim() ?? draft.aiSummary,
        aiUseCases: parsedAi.aiUseCases?.trim() ?? draft.aiUseCases,
        aiOpportunity: parsedAi.aiOpportunity?.trim() ?? draft.aiOpportunity,
        description: draft.description || parsedAi.aiSummary?.trim() || draft.description,
      }));
      toast.success("AI descriptions generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI generation failed.");
    } finally {
      setGeneratingManualAi(false);
    }
  };

  const handleSaveManual = async () => {
    const parsed = parseRepoUrl(manualDraft.repoUrl);
    if (!parsed) {
      toast.error("Enter a valid GitHub repository URL.");
      return;
    }

    if (!manualDraft.description.trim()) {
      toast.error("Add a description or generate AI descriptions first.");
      return;
    }

    setSavingManual(true);
    try {
      await createManual({
        owner: parsed.owner,
        name: parsed.name,
        htmlUrl: parsed.htmlUrl,
        description: manualDraft.description,
        homepageUrl: manualDraft.homepageUrl.trim() || undefined,
        language: manualDraft.language.trim() || undefined,
        stars: manualDraft.stars ? Number(manualDraft.stars) : undefined,
        forks: manualDraft.forks ? Number(manualDraft.forks) : undefined,
        openIssues: manualDraft.openIssues ? Number(manualDraft.openIssues) : undefined,
        topics: parseTopics(manualDraft.topics),
        license: undefined,
        defaultBranch: undefined,
        isArchived: false,
        readme: manualDraft.readme.trim() || undefined,
        aiSummary: manualDraft.aiSummary.trim() || undefined,
        aiUseCases: manualDraft.aiUseCases.trim() || undefined,
        aiOpportunity: manualDraft.aiOpportunity.trim() || undefined,
      });
      setShowManualDialog(false);
      setManualDraft(emptyDraft);
      toast.success("GitHub tool saved to feed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save manual post.");
    } finally {
      setSavingManual(false);
    }
  };

  const handleAnalyzeRepo = async () => {
    if (!selectedFeedRepo || !repoAnalysisPrompt.trim()) return;

    setAnalysisLoading(true);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: repoAnalysisPrompt,
          context: buildRepoContext(selectedFeedRepo),
          contextType: "note",
        }),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result) {
        throw new Error(data.error ?? "AI analysis failed.");
      }

      await updateAiFields({ id: selectedFeedRepo._id, aiAnalysis: data.result });
      toast.success("Analysis saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAddToTodo = async () => {
    if (!selectedFeedRepo || !convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    setBusyAction("todo");
    try {
      await createTodo({
        scope: defaultScope,
        workspaceId: defaultWorkspaceId,
        title: `Review ${selectedFeedRepo.repoFullName}`,
        description: selectedFeedRepo.aiSummary ?? selectedFeedRepo.description,
        priority: "medium",
        status: "todo",
        createdBy: convexUser._id,
        groupId: defaultScope === "workspace" ? null : undefined,
        sourceUrl: selectedFeedRepo.htmlUrl,
        sourceDescription: selectedFeedRepo.aiSummary ?? selectedFeedRepo.description,
      });
      toast.success("Added to todos.");
    } catch {
      toast.error("Failed to create todo.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddToIdea = async () => {
    if (!selectedFeedRepo || !convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    setBusyAction("idea");
    try {
      await createIdea({
        scope: defaultScope,
        workspaceId: defaultWorkspaceId,
        title: `Idea from ${selectedFeedRepo.repoFullName}`,
        description: [
          selectedFeedRepo.aiOpportunity ?? selectedFeedRepo.aiSummary ?? selectedFeedRepo.description,
          "",
          `Source: ${selectedFeedRepo.htmlUrl}`,
          selectedFeedRepo.aiAnalysis ? `\nAnalysis:\n${selectedFeedRepo.aiAnalysis}` : "",
        ].join("\n"),
        tags: ["github", selectedFeedRepo.language?.toLowerCase() ?? "repo"],
        createdBy: convexUser._id,
      });
      toast.success("Added to ideas.");
      if (defaultScope === "workspace") {
        router.push("/workspace/ideas");
      } else {
        router.push("/private/ideas");
      }
    } catch {
      toast.error("Failed to create idea.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddToNote = async () => {
    if (!selectedFeedRepo || !convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    setBusyAction("note");
    try {
      const noteId = await createNote({
        scope: defaultScope,
        workspaceId: defaultWorkspaceId,
        title: selectedFeedRepo.repoFullName,
        content: buildNoteContent(selectedFeedRepo),
        createdBy: convexUser._id,
      });
      toast.success("Added to notes.");
      if (defaultScope === "workspace") {
        router.push(`/workspace/notes?note=${noteId}`);
      } else {
        router.push(`/private/notes?note=${noteId}`);
      }
    } catch {
      toast.error("Failed to create note.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddToResource = async () => {
    if (!selectedFeedRepo || !convexUser) {
      toast.error("Your account is still loading.");
      return;
    }

    setBusyAction("resource");
    try {
      await createResource({
        scope: defaultScope,
        workspaceId: defaultWorkspaceId,
        url: selectedFeedRepo.htmlUrl,
        description: selectedFeedRepo.aiSummary ?? selectedFeedRepo.description,
        createdBy: convexUser._id,
      });
      toast.success("Added to resources.");
    } catch {
      toast.error("Failed to create resource.");
    } finally {
      setBusyAction(null);
    }
  };

  if (!user || convexUser === undefined || isLoading) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton mb-8 h-10 w-56" />
        <div className="skeleton mb-8 h-40 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="skeleton h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up relative">
      <div
        className="absolute top-0 right-1/4 h-[400px] w-[620px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, var(--accent-blue) 0%, transparent 70%)", opacity: 0.14 }}
      />

      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--mute)" }}>
              Explore / GitHub Tools
            </p>
            <h2 className="text-4xl font-medium tracking-tight mb-4" style={{ color: "var(--ink)" }}>
              GitHub tools and agent framework feed
            </h2>
            <p className="text-base leading-7" style={{ color: "var(--body)" }}>
              Fetch a limited batch of trending or high-star GitHub repos into Convex, manually post tools with AI-generated descriptions, and turn any repo into notes, ideas, todos, or resources.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowManualDialog(true)} className="btn-primary">
              <FilePlus2 size={16} /> Manual post
            </button>
            <a href="/vaults/ai-tools" className="btn-outline">
              <Cpu size={16} /> AI tools vault
            </a>
          </div>
        </div>
      </div>

      <div className="feature-card mb-8 relative z-10 p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search repos, languages, topics, or AI summaries..."
                className="input-field pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ThemedSelect value={fetchMode} onChange={(event) => setFetchMode(event.target.value as typeof fetchMode)}>
              <option value="trending">Trending</option>
              <option value="stars">High stars</option>
            </ThemedSelect>
            <input value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="Language" className="input-field" />
            <ThemedSelect value={fetchLimit} onChange={(event) => setFetchLimit(event.target.value)}>
              <option value="4">4 repos</option>
              <option value="6">6 repos</option>
              <option value="8">8 repos</option>
            </ThemedSelect>
            <button onClick={() => void handleFetchRepos()} disabled={fetchingRepos} className="btn-primary">
              <FolderGit2 size={16} /> {fetchingRepos ? "Fetching..." : "Fetch repos"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            value={fetchPrompt}
            onChange={(event) => setFetchPrompt(event.target.value)}
            placeholder="Search theme, e.g. ai agents, developer tools, workflow automation..."
            className="input-field"
          />
          <p className="mt-2 text-xs" style={{ color: "var(--mute)" }}>
            Fetching is intentionally capped to a small batch so the GitHub API calls and database writes stay bounded.
          </p>
        </div>
      </div>

      {filteredFeed.length === 0 ? (
        <div className="feature-card relative z-10 flex flex-col items-center justify-center py-24 text-center">
          <Wrench size={34} className="mb-6" style={{ color: "var(--accent-blue)" }} />
          <h3 className="mb-3 text-xl font-medium" style={{ color: "var(--ink)" }}>No GitHub tools in the feed yet</h3>
          <p className="mb-8 max-w-xl" style={{ color: "var(--charcoal)" }}>
            Pull in a limited set of trending or high-star repos, or publish a manual tool entry with AI-generated descriptions.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void handleFetchRepos()} disabled={fetchingRepos} className="btn-primary">
              <FolderGit2 size={16} /> {fetchingRepos ? "Fetching..." : "Fetch first batch"}
            </button>
            <button onClick={() => setShowManualDialog(true)} className="btn-outline">
              <Plus size={16} /> Manual post
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 relative z-10 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredFeed.map((repo, index) => (
            <button
              key={repo._id}
              type="button"
              onClick={() => setSelectedRepo(repo)}
              className="feature-card flex cursor-pointer flex-col text-left group relative overflow-hidden"
              style={{ animationDelay: `${index * 40}ms`, padding: "24px" }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="badge-pill" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-blue)" }}>
                      {repo.sourceType === "manual" ? "Manual" : repo.fetchMode === "stars" ? "High stars" : "Trending"}
                    </span>
                    {repo.language ? <span className="badge-pill">{repo.language}</span> : null}
                  </div>
                  <h3 className="text-xl font-medium leading-tight" style={{ color: "var(--ink)" }}>{repo.repoFullName}</h3>
                </div>
                <a
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-md p-2 transition-colors hover:bg-[var(--surface-elevated)]"
                  style={{ color: "var(--stone)" }}
                >
                  <ExternalLink size={18} />
                </a>
              </div>

              <p className="mb-5 text-sm leading-7" style={{ color: "var(--charcoal)" }}>
                {repo.aiSummary ?? repo.description}
              </p>

              <div className="mb-5 flex flex-wrap gap-2">
                {repo.topics.slice(0, 4).map((topic) => (
                  <span key={topic} className="badge-pill">{topic}</span>
                ))}
              </div>

              <div className="mt-auto grid grid-cols-3 gap-3 border-t pt-4 text-xs" style={{ borderColor: "var(--divider-soft)", color: "var(--mute)" }}>
                <div className="flex items-center gap-2"><Star size={13} /> {repo.stars.toLocaleString()}</div>
                <div className="flex items-center gap-2"><Workflow size={13} /> {repo.forks.toLocaleString()}</div>
                <div className="flex items-center gap-2"><BookOpen size={13} /> {repo.readme ? "README" : "No README"}</div>
              </div>

              <div className="absolute top-0 left-0 right-0 h-1 opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: "var(--accent-blue)" }} />
            </button>
          ))}
        </div>
      )}

      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0 sm:max-w-4xl">
          <div className="border-b px-6 py-5" style={{ borderColor: "var(--hairline)" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--ink)" }}>Manual GitHub tool post</DialogTitle>
              <DialogDescription style={{ color: "var(--charcoal)" }}>
                Publish a repo manually, generate AI descriptions, and add it into the feed.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-6 p-6 xl:grid-cols-2">
            <div className="space-y-4">
              <input autoFocus value={manualDraft.repoUrl} onChange={(event) => setManualDraft((draft) => ({ ...draft, repoUrl: event.target.value }))} placeholder="https://github.com/owner/repo" className="input-field" />
              <textarea value={manualDraft.description} onChange={(event) => setManualDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Description" rows={4} className="input-field resize-y" />
              <input value={manualDraft.homepageUrl} onChange={(event) => setManualDraft((draft) => ({ ...draft, homepageUrl: event.target.value }))} placeholder="Homepage URL (optional)" className="input-field" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input value={manualDraft.language} onChange={(event) => setManualDraft((draft) => ({ ...draft, language: event.target.value }))} placeholder="Language" className="input-field" />
                <input value={manualDraft.stars} onChange={(event) => setManualDraft((draft) => ({ ...draft, stars: event.target.value }))} placeholder="Stars" className="input-field" />
                <input value={manualDraft.forks} onChange={(event) => setManualDraft((draft) => ({ ...draft, forks: event.target.value }))} placeholder="Forks" className="input-field" />
              </div>
              <input value={manualDraft.openIssues} onChange={(event) => setManualDraft((draft) => ({ ...draft, openIssues: event.target.value }))} placeholder="Open issues" className="input-field" />
              <input value={manualDraft.topics} onChange={(event) => setManualDraft((draft) => ({ ...draft, topics: event.target.value }))} placeholder="Topics, comma separated" className="input-field" />
              <textarea value={manualDraft.readme} onChange={(event) => setManualDraft((draft) => ({ ...draft, readme: event.target.value }))} placeholder="README or notes" rows={10} className="input-field resize-y" />
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button onClick={() => void handleGenerateManualAi()} disabled={generatingManualAi} className="btn-primary">
                  <Sparkles size={15} /> {generatingManualAi ? "Generating..." : "Generate AI descriptions"}
                </button>
                <button onClick={() => void handleSaveManual()} disabled={savingManual} className="btn-outline">
                  <Plus size={15} /> {savingManual ? "Saving..." : "Save to feed"}
                </button>
              </div>
              <textarea value={manualDraft.aiSummary} onChange={(event) => setManualDraft((draft) => ({ ...draft, aiSummary: event.target.value }))} placeholder="AI summary" rows={6} className="input-field resize-y" />
              <textarea value={manualDraft.aiUseCases} onChange={(event) => setManualDraft((draft) => ({ ...draft, aiUseCases: event.target.value }))} placeholder="AI use cases" rows={6} className="input-field resize-y" />
              <textarea value={manualDraft.aiOpportunity} onChange={(event) => setManualDraft((draft) => ({ ...draft, aiOpportunity: event.target.value }))} placeholder="AI opportunity or business angle" rows={6} className="input-field resize-y" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRepo)} onOpenChange={(open) => !open && setSelectedRepo(null)}>
        {selectedFeedRepo ? (
          <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto p-0 sm:max-w-7xl">
            <div className="border-b px-6 py-5" style={{ borderColor: "var(--hairline)" }}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <DialogHeader>
                  <DialogTitle className="text-2xl" style={{ color: "var(--ink)" }}>{selectedFeedRepo.repoFullName}</DialogTitle>
                  <DialogDescription style={{ color: "var(--charcoal)" }}>
                    {selectedFeedRepo.language ?? "Unknown language"} • {selectedFeedRepo.stars.toLocaleString()} stars • {selectedFeedRepo.forks.toLocaleString()} forks
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => void handleAnalyzeRepo()} disabled={analysisLoading} className="btn-primary">
                    <SearchCode size={15} /> {analysisLoading ? "Analyzing..." : "Analyze"}
                  </button>
                  <button onClick={() => void handleAddToTodo()} disabled={busyAction === "todo"} className="btn-outline">
                    <CheckSquare size={15} /> {busyAction === "todo" ? "Saving..." : "Todo"}
                  </button>
                  <button onClick={() => void handleAddToIdea()} disabled={busyAction === "idea"} className="btn-outline">
                    <Lightbulb size={15} /> {busyAction === "idea" ? "Saving..." : "Idea"}
                  </button>
                  <button onClick={() => void handleAddToNote()} disabled={busyAction === "note"} className="btn-outline">
                    <FileText size={15} /> {busyAction === "note" ? "Saving..." : "Note"}
                  </button>
                  <button onClick={() => void handleAddToResource()} disabled={busyAction === "resource"} className="btn-outline">
                    <Globe size={15} /> {busyAction === "resource" ? "Saving..." : "Resource"}
                  </button>
                  <a href={selectedFeedRepo.htmlUrl} target="_blank" rel="noreferrer" className="btn-outline">
                    <ExternalLink size={15} /> GitHub
                  </a>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Overview</p>
                  <p className="text-sm leading-7" style={{ color: "var(--body)" }}>{selectedFeedRepo.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedFeedRepo.topics.map((topic) => (
                      <span key={topic} className="badge-pill">{topic}</span>
                    ))}
                  </div>
                </section>

                {selectedFeedRepo.aiSummary || selectedFeedRepo.aiUseCases || selectedFeedRepo.aiOpportunity ? (
                  <section className="feature-card p-5">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>AI descriptions</p>
                    <div className="space-y-4">
                      {selectedFeedRepo.aiSummary ? <div><p className="mb-2 text-sm font-medium" style={{ color: "var(--ink)" }}>Summary</p><MarkdownBlock content={selectedFeedRepo.aiSummary} /></div> : null}
                      {selectedFeedRepo.aiUseCases ? <div><p className="mb-2 text-sm font-medium" style={{ color: "var(--ink)" }}>Use cases</p><MarkdownBlock content={selectedFeedRepo.aiUseCases} /></div> : null}
                      {selectedFeedRepo.aiOpportunity ? <div><p className="mb-2 text-sm font-medium" style={{ color: "var(--ink)" }}>Opportunity</p><MarkdownBlock content={selectedFeedRepo.aiOpportunity} /></div> : null}
                    </div>
                  </section>
                ) : null}

                <section className="feature-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} style={{ color: "var(--accent-blue)" }} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Analysis prompt</p>
                  </div>
                  <textarea value={repoAnalysisPrompt} onChange={(event) => setRepoAnalysisPrompt(event.target.value)} rows={5} className="input-field min-h-[130px] resize-y" />
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>AI analysis</p>
                  {selectedFeedRepo.aiAnalysis ? (
                    <MarkdownBlock content={selectedFeedRepo.aiAnalysis} />
                  ) : (
                    <p className="text-sm leading-7" style={{ color: "var(--charcoal)" }}>
                      Run Analyze to generate a business and product assessment for this repo.
                    </p>
                  )}
                </section>
              </div>

              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Repository details</p>
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2" style={{ color: "var(--charcoal)" }}>
                    <div><strong style={{ color: "var(--ink)" }}>Language:</strong> {selectedFeedRepo.language ?? "Unknown"}</div>
                    <div><strong style={{ color: "var(--ink)" }}>Homepage:</strong> {selectedFeedRepo.homepageUrl ?? "None"}</div>
                    <div><strong style={{ color: "var(--ink)" }}>Stars:</strong> {selectedFeedRepo.stars.toLocaleString()}</div>
                    <div><strong style={{ color: "var(--ink)" }}>Forks:</strong> {selectedFeedRepo.forks.toLocaleString()}</div>
                    <div><strong style={{ color: "var(--ink)" }}>Open issues:</strong> {selectedFeedRepo.openIssues.toLocaleString()}</div>
                    <div><strong style={{ color: "var(--ink)" }}>License:</strong> {selectedFeedRepo.license ?? "Unknown"}</div>
                  </div>
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>README</p>
                  {selectedFeedRepo.readme ? (
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                      <MarkdownBlock content={selectedFeedRepo.readme} />
                    </div>
                  ) : (
                    <p className="text-sm leading-7" style={{ color: "var(--charcoal)" }}>
                      No README was stored for this repository yet.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
