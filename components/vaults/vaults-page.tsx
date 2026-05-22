"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRight,
  Copy,
  File,
  Folder,
  FolderKanban,
  Lock,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore } from "@/store/workspace-store";

type VaultScope = "private" | "workspace";

function isImageFile(entry: Doc<"vaultEntries">) {
  return entry.kind === "file" && entry.mimeType?.startsWith("image/");
}

function formatBytes(sizeBytes?: number) {
  if (!sizeBytes) {
    return "-";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}

function buildVaultHref(scope: VaultScope, vaultId: string) {
  return scope === "workspace" ? `/workspace/vaults/${vaultId}` : `/private/vaults/${vaultId}`;
}

function FolderTree({
  folders,
  currentFolderId,
  onSelect,
  parentId = null,
  depth = 0,
}: {
  folders: Doc<"vaultEntries">[];
  currentFolderId: Id<"vaultEntries"> | null;
  onSelect: (id: Id<"vaultEntries"> | null) => void;
  parentId?: Id<"vaultEntries"> | null;
  depth?: number;
}) {
  const children = folders
    .filter((folder) => (folder.parentEntryId ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {children.map((folder) => {
        const isActive = currentFolderId === folder._id;
        return (
          <div key={folder._id}>
            <button
              type="button"
              onClick={() => onSelect(folder._id)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
              style={{
                paddingLeft: `${12 + depth * 16}px`,
                color: isActive ? "var(--ink)" : "var(--charcoal)",
                backgroundColor: isActive ? "var(--surface-elevated)" : "transparent",
              }}
            >
              <Folder size={14} style={{ color: isActive ? "var(--accent-blue)" : "var(--stone)" }} />
              <span className="truncate">{folder.name}</span>
            </button>
            <FolderTree folders={folders} currentFolderId={currentFolderId} onSelect={onSelect} parentId={folder._id} depth={depth + 1} />
          </div>
        );
      })}
    </div>
  );
}

export function VaultsPage({ scope, vaultId }: { scope: VaultScope; vaultId?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { selectedWorkspaceId } = useWorkspaceStore();
  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const workspace = useQuery(
    api.workspaces.getWorkspaceById,
    scope === "workspace" && selectedWorkspaceId && user
      ? { workspaceId: selectedWorkspaceId, clerkId: user.id }
      : "skip"
  );
  const privateVaults = useQuery(api.vaults.getPrivateVaults, scope === "private" ? {} : "skip");
  const workspaceVaults = useQuery(
    api.vaults.getWorkspaceVaults,
    scope === "workspace" && workspace?._id ? { workspaceId: workspace._id } : "skip"
  );

  const activeVaultId = vaultId as Id<"vaults"> | undefined;
  const activeVault = useQuery(api.vaults.getVault, activeVaultId ? { vaultId: activeVaultId } : "skip");

  const [showCreateVault, setShowCreateVault] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [vaultDescription, setVaultDescription] = useState("");
  const [savingVault, setSavingVault] = useState(false);

  const [currentFolderId, setCurrentFolderId] = useState<Id<"vaultEntries"> | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const explorerData = useQuery(
    api.vaults.getVaultEntries,
    activeVault && activeVaultId
      ? { vaultId: activeVaultId, parentEntryId: currentFolderId }
      : "skip"
  );

  const createVault = useMutation(api.vaults.createVault);
  const createFolder = useMutation(api.vaults.createFolder);
  const createFile = useMutation(api.vaults.createFile);
  const deleteEntry = useMutation(api.vaults.deleteEntry);

  const vaults = useMemo(
    () => (scope === "workspace" ? workspaceVaults : privateVaults) ?? [],
    [privateVaults, scope, workspaceVaults]
  );
  const scopeLabel = scope === "workspace" ? workspace?.name ?? "Workspace" : "Private";
  const defaultVault = vaults[0] ?? null;

  const uploadedImages = useMemo(
    () => (explorerData?.entries ?? []).filter((entry) => isImageFile(entry)),
    [explorerData?.entries]
  );

  const regularFiles = useMemo(
    () => (explorerData?.entries ?? []).filter((entry) => entry.kind === "file" && !isImageFile(entry)),
    [explorerData?.entries]
  );

  const explorer = explorerData ?? { breadcrumbs: [], folders: [], entries: [] };

  const handleCreateVault = async () => {
    if (!vaultName.trim()) {
      toast.error("Vault name is required.");
      return;
    }

    if (scope === "workspace" && !selectedWorkspaceId) {
      toast.error("Select a workspace first.");
      return;
    }

    setSavingVault(true);
    try {
      const createdId = await createVault({
        scope,
        workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
        name: vaultName,
        description: vaultDescription.trim() || undefined,
      });
      setVaultName("");
      setVaultDescription("");
      setShowCreateVault(false);
      toast.success("Vault created.");
      window.location.href = buildVaultHref(scope, createdId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create vault.");
    } finally {
      setSavingVault(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!activeVaultId) return;
    if (!folderName.trim()) {
      toast.error("Folder name is required.");
      return;
    }

    setSavingFolder(true);
    try {
      await createFolder({
        vaultId: activeVaultId,
        parentEntryId: currentFolderId,
        name: folderName,
      });
      setFolderName("");
      setShowCreateFolder(false);
      toast.success("Folder created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create folder.");
    } finally {
      setSavingFolder(false);
    }
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!activeVaultId) return;
    const list = Array.from(files);
    if (list.length === 0) return;

    for (const file of list) {
      if (file.size > 1024 * 1024) {
        toast.error(`${file.name} is larger than 1MB.`);
        return;
      }
    }

    setUploadingFiles(true);
    try {
      for (const file of list) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/cloudinary/upload-vault", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !data.url) {
          throw new Error(data.error ?? `Failed to upload ${file.name}`);
        }

        await createFile({
          vaultId: activeVaultId,
          parentEntryId: currentFolderId,
          name: file.name,
          fileUrl: data.url,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
      }

      toast.success(list.length === 1 ? "File uploaded." : "Files uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vault upload failed.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleDeleteEntry = async (entryId: Id<"vaultEntries">) => {
    setDeletingEntryId(entryId);
    try {
      await deleteEntry({ entryId });
      toast.success("Item deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete item.");
    } finally {
      setDeletingEntryId(null);
    }
  };

  useEffect(() => {
    if (vaultId || !defaultVault) {
      return;
    }

    router.replace(buildVaultHref(scope, defaultVault._id));
  }, [defaultVault, router, scope, vaultId]);

  useEffect(() => {
    if (!vaultId || activeVault !== null || vaults.length === 0) {
      return;
    }

    router.replace(buildVaultHref(scope, vaults[0]!._id));
  }, [activeVault, router, scope, vaultId, vaults]);

  if (scope === "workspace" && !selectedWorkspaceId) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <Users size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>No workspace selected</h2>
        <p style={{ color: "var(--charcoal)" }}>Create or join a workspace using the sidebar.</p>
      </div>
    );
  }

  if (scope === "workspace" && selectedWorkspaceId && workspace === null) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <Users size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>Workspace access required</h2>
        <p style={{ color: "var(--charcoal)" }}>Only workspace members can access workspace vaults.</p>
      </div>
    );
  }

  if (!user || convexUser === undefined || (scope === "workspace" && selectedWorkspaceId && workspace === undefined) || (vaultId ? activeVault === undefined || explorerData === undefined : vaults === undefined)) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-52 mb-8" />
        <div className="skeleton h-40 rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!vaultId && vaults.length === 0) {
    return (
      <div className="page-container animate-fade-in-up relative">
        <div
          className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, var(--accent-green) 0%, transparent 70%)", opacity: 0.14 }}
        />

        <div className="page-header border-b pb-8 mb-8 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {scope === "workspace" ? (
                  <>
                    <Users size={13} style={{ color: "var(--mute)" }} />
                    <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--mute)" }}>{scopeLabel}</span>
                  </>
                ) : (
                  <>
                    <Lock size={13} style={{ color: "var(--mute)" }} />
                    <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--mute)" }}>Private</span>
                  </>
                )}
              </div>
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>
                {scope === "workspace" ? "Workspace Vaults" : "Private Vaults"}
              </h2>
             </div>
            <button onClick={() => setShowCreateVault((current) => !current)} className="btn-primary">
              <Plus size={16} /> {showCreateVault ? "Close" : "Add New Vault"}
            </button>
          </div>
        </div>

        {showCreateVault ? (
          <div className="feature-card mb-10 relative z-10">
            <div className="max-w-3xl space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Vault name</label>
                <input value={vaultName} onChange={(event) => setVaultName(event.target.value)} className="input-field" placeholder="e.g. Investor Decks, Launch Assets, Product Research" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Description</label>
                <textarea value={vaultDescription} onChange={(event) => setVaultDescription(event.target.value)} className="input-field resize-none" rows={4} placeholder="What lives in this vault?" />
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => void handleCreateVault()} disabled={savingVault} className="btn-primary">{savingVault ? "Saving..." : "Create Vault"}</button>
                <button onClick={() => setShowCreateVault(false)} className="btn-outline">Cancel</button>
              </div>
            </div>
          </div>
        ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
          {vaults.length === 0 ? (
            <div className="feature-card col-span-full flex flex-col items-center justify-center py-20 text-center">
              <FolderKanban size={36} className="mb-6" style={{ color: "var(--accent-green)" }} />
              <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>No vaults yet</h3>
              <p className="mb-8 max-w-lg" style={{ color: "var(--charcoal)" }}>
                Create your first vault, then use the explorer UI inside it to build nested folders and upload files.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (!vaultId) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-52 mb-8" />
        <div className="skeleton h-40 rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeVault) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <FolderKanban size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>Vault not found</h2>
        <p style={{ color: "var(--charcoal)" }}>This vault does not exist or you do not have access to it.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--canvas)" }}>
      <div className="flex w-[320px] shrink-0 flex-col border-r" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)" }}>
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
          <div className="mb-2 flex items-center gap-2">
            <FolderKanban size={16} style={{ color: "var(--accent-green)" }} />
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--mute)" }}>{scopeLabel}</span>
          </div>
          <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>{activeVault.name}</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>{activeVault.description || "Nested folders and files live here."}</p>
        </div>

        <div className="border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
          <button type="button" onClick={() => setCurrentFolderId(null)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: currentFolderId === null ? "var(--ink)" : "var(--charcoal)", backgroundColor: currentFolderId === null ? "var(--surface-elevated)" : "transparent" }}>
            <Folder size={14} style={{ color: "var(--accent-blue)" }} />
            <span>Root</span>
          </button>
          <div className="mt-2">
            <FolderTree folders={explorer.folders} currentFolderId={currentFolderId} onSelect={setCurrentFolderId} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-sm" style={{ color: "var(--charcoal)" }}>
          <p className="mb-2 font-medium" style={{ color: "var(--ink)" }}>Explorer tips</p>
          <p className="leading-7">Create folders inside folders, upload files up to 1MB, and use the breadcrumb bar to move back up the tree.</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative" style={{ backgroundColor: "var(--canvas)" }}>
        <div className="absolute top-0 right-0 h-[360px] w-[520px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, var(--accent-green) 0%, transparent 70%)", opacity: 0.12 }} />

        <div className="border-b px-6 py-4 relative z-10" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--charcoal)" }}>
            <span style={{ color: "var(--accent-blue)" }}>
              Vault
            </span>
            <ChevronRight size={14} />
            <button type="button" onClick={() => setCurrentFolderId(null)} style={{ color: currentFolderId === null ? "var(--ink)" : "var(--accent-blue)" }}>
              {activeVault.name}
            </button>
            {explorer.breadcrumbs.map((folder) => (
              <div key={folder._id} className="flex items-center gap-2">
                <ChevronRight size={14} />
                <button type="button" onClick={() => setCurrentFolderId(folder._id)} style={{ color: currentFolderId === folder._id ? "var(--ink)" : "var(--accent-blue)" }}>
                  {folder.name}
                </button>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={activeVault._id}
              onChange={(event) => router.push(buildVaultHref(scope, event.target.value))}
              className="input-field min-w-[220px]"
              aria-label="Select vault"
            >
              {vaults.map((vault) => (
                <option key={vault._id} value={vault._id}>
                  {vault.name}
                </option>
              ))}
            </select>
            <button onClick={() => setShowCreateFolder((current) => !current)} className="btn-outline">
              <Plus size={15} /> New folder
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles} className="btn-primary">
              <Upload size={15} /> {uploadingFiles ? "Uploading..." : "Upload files"}
            </button>
            <button onClick={() => setShowCreateVault((current) => !current)} className="btn-outline">
              <Plus size={15} /> New vault
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  void handleUploadFiles(event.target.files);
                  event.target.value = "";
                }
              }}
            />
            <p className="flex items-center text-xs" style={{ color: "var(--mute)" }}>1MB max per file</p>
          </div>

          {showCreateVault ? (
            <div className="mb-4 grid max-w-3xl gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input value={vaultName} onChange={(event) => setVaultName(event.target.value)} className="input-field" placeholder="Vault name" />
              <input value={vaultDescription} onChange={(event) => setVaultDescription(event.target.value)} className="input-field" placeholder="Description (optional)" />
              <button onClick={() => void handleCreateVault()} disabled={savingVault} className="btn-primary">
                {savingVault ? "Creating..." : "Create vault"}
              </button>
            </div>
          ) : null}

          {showCreateFolder ? (
            <div className="mt-4 flex max-w-xl gap-3">
              <input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="input-field flex-1" placeholder="Folder name" />
              <button onClick={() => void handleCreateFolder()} disabled={savingFolder} className="btn-primary">{savingFolder ? "Creating..." : "Create"}</button>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-auto p-6 relative z-10">
          {explorer.entries.length === 0 ? (
            <div className="feature-card flex flex-col items-center justify-center py-24 text-center">
              <Folder size={40} className="mb-6" style={{ color: "var(--stone)" }} />
              <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>This folder is empty</h3>
              <p className="max-w-md" style={{ color: "var(--charcoal)" }}>Create a nested folder or upload files to start building your vault explorer.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Folders</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {explorer.entries.filter((entry) => entry.kind === "folder").map((entry) => (
                    <button key={entry._id} type="button" onClick={() => setCurrentFolderId(entry._id)} className="feature-card flex cursor-pointer items-center gap-3 text-left transition-all hover:-translate-y-0.5" style={{ padding: "20px" }}>
                      <Folder size={18} style={{ color: "var(--accent-blue)" }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{entry.name}</p>
                        <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>Open folder</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Images</h3>
                {uploadedImages.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--charcoal)" }}>No images in this folder.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {uploadedImages.map((entry) => (
                      <div key={entry._id} className="feature-card group overflow-hidden" style={{ padding: 0 }}>
                        <div className="relative h-44 w-full overflow-hidden">
                          <Image src={entry.fileUrl!} alt={entry.name} fill sizes="(max-width: 1280px) 50vw, 33vw" className="object-cover transition-transform duration-200 group-hover:scale-[1.03]" unoptimized />
                          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => void handleCopyLink(entry.fileUrl!)}
                              className="rounded-full border p-2 transition-colors hover:bg-[rgba(255,255,255,0.14)]"
                              style={{ borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(15,15,15,0.72)", color: "white" }}
                              aria-label="Copy image link"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteEntry(entry._id)}
                              disabled={deletingEntryId === entry._id}
                              className="rounded-full border p-2 transition-colors hover:bg-[rgba(255,255,255,0.14)]"
                              style={{ borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(15,15,15,0.72)", color: "white" }}
                              aria-label="Delete image"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <a href={entry.fileUrl!} target="_blank" rel="noreferrer" className="block px-4 py-3">
                          <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{entry.name}</p>
                          <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{formatBytes(entry.sizeBytes)}</p>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Files</h3>
                {regularFiles.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--charcoal)" }}>No files in this folder.</p>
                ) : (
                  <div className="space-y-3">
                    {regularFiles.map((entry) => (
                      <div key={entry._id} className="feature-card flex items-center gap-3 transition-colors hover:bg-[var(--surface-elevated)]" style={{ padding: "18px 20px" }}>
                        <a href={entry.fileUrl!} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                          <File size={16} style={{ color: "var(--stone)" }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{entry.name}</p>
                            <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{entry.mimeType || "File"} • {formatBytes(entry.sizeBytes)}</p>
                          </div>
                        </a>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopyLink(entry.fileUrl!)}
                            className="rounded-full border p-2 transition-colors hover:bg-[var(--surface-elevated)]"
                            style={{ borderColor: "var(--hairline-strong)", color: "var(--ink)" }}
                            aria-label="Copy file link"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteEntry(entry._id)}
                            disabled={deletingEntryId === entry._id}
                            className="rounded-full border p-2 transition-colors hover:bg-[var(--surface-elevated)]"
                            style={{ borderColor: "var(--hairline-strong)", color: "var(--ink)" }}
                            aria-label="Delete file"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
