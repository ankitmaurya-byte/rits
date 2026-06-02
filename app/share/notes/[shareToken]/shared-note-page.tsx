"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Clock, Database, FileText, ListTree, MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { DatabaseFileEditor, getDatabasePreviewText, isDatabaseFileContent } from "@/components/notes/database-file-editor";
import { HierarchyFileEditor, isHierarchyFileContent } from "@/components/notes/hierarchy-file-editor";
import { NoteEditor } from "@/components/notes/editor";

type NotePermission = "read" | "comment" | "edit";

function getSharedFileType(note: { fileType?: "text" | "database" | "hierarchy"; content: string } | null | undefined) {
  if (!note) return "text";
  if (note.fileType === "hierarchy") return "hierarchy";
  if (note.fileType === "database") return "database";
  if (isHierarchyFileContent(note.content)) return "hierarchy";
  if (isDatabaseFileContent(note.content)) return "database";
  return "text";
}

function getPermissionLabel(permission: NotePermission) {
  if (permission === "edit") return "Editor";
  if (permission === "comment") return "Commenter";
  return "Viewer";
}

export function SharedNotePage({ shareToken }: { shareToken: string }) {
  const shared = useQuery(api.notes.getSharedNoteByToken, { shareToken });
  const comments = useQuery(api.notes.listSharedNoteComments, { shareToken }) ?? [];
  const updateSharedNote = useMutation(api.notes.updateSharedNoteByToken);
  const addComment = useMutation(api.notes.addSharedNoteComment);
  const [commentBody, setCommentBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const note = shared?.note;
  const permission = (shared?.permission ?? "read") as NotePermission;
  const canEdit = Boolean(shared?.canEdit);
  const canComment = Boolean(shared?.canComment);
  const fileType = getSharedFileType(note);
  const content = pendingContent ?? note?.content ?? "";
  const previewText = useMemo(() => {
    if (!note) return "";
    if (fileType === "database") return getDatabasePreviewText(note.content);
    return note.content.replace(/<[^>]+>/g, "").slice(0, 140);
  }, [fileType, note]);

  const handleSave = async (value: string) => {
    if (!canEdit) return;
    setPendingContent(value);
    setIsSaving(true);
    try {
      await updateSharedNote({ shareToken, content: value, fileType });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save shared note.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!canComment || !commentBody.trim()) return;
    setIsCommenting(true);
    try {
      await addComment({
        shareToken,
        body: commentBody,
        authorName: guestName.trim() || undefined,
      });
      setCommentBody("");
      toast.success("Comment added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment.");
    } finally {
      setIsCommenting(false);
    }
  };

  if (shared === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--canvas)", color: "var(--mute)" }}>
        Loading shared note...
      </main>
    );
  }

  if (!note) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--canvas)" }}>
        <div>
          <h1 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>Share unavailable</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>This note link is restricted or no longer exists.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--canvas)" }}>
      <header className="border-b px-5 py-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                {fileType === "database" ? <Database size={13} /> : fileType === "hierarchy" ? <ListTree size={13} /> : <FileText size={13} />}
                {fileType === "database" ? "Database" : fileType === "hierarchy" ? "Hierarchy" : "Document"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                {getPermissionLabel(permission)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                <Clock size={13} /> {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
              </span>
              {isSaving ? <span className="text-xs" style={{ color: "var(--mute)" }}>Saving...</span> : null}
            </div>
            <h1 className="truncate text-2xl font-medium" style={{ color: "var(--ink)" }}>{note.title}</h1>
            {previewText ? <p className="mt-1 max-w-2xl truncate text-sm" style={{ color: "var(--charcoal)" }}>{previewText}</p> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-[calc(100vh-140px)] overflow-hidden border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
          {fileType === "hierarchy" ? (
            <HierarchyFileEditor
              content={content}
              onChange={handleSave}
              readOnly={!canEdit}
              viewMode={canEdit ? "edit" : "read"}
            />
          ) : fileType === "database" ? (
            <DatabaseFileEditor content={content} onChange={canEdit ? handleSave : () => {}} />
          ) : canEdit ? (
            <NoteEditor className="h-full w-full !rounded-none !border-0 shadow-none" content={content} minHeight="calc(100vh - 170px)" onChange={handleSave} />
          ) : (
            <div className="h-full overflow-y-auto px-8 py-7 prose prose-sm max-w-none" style={{ color: "var(--ink)", background: "var(--surface-card)" }} dangerouslySetInnerHTML={{ __html: content }} />
          )}
        </section>

        <aside className="flex max-h-[calc(100vh-140px)] flex-col rounded-xl border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
          <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
            <MessageSquare size={15} style={{ color: "var(--mute)" }} />
            <h2 className="text-sm font-medium" style={{ color: "var(--ink)" }}>Comments</h2>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {comments.length ? comments.map((comment) => (
              <article key={comment._id} className="rounded-lg border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{comment.authorName}</p>
                  <p className="text-[10px]" style={{ color: "var(--mute)" }}>{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: "var(--charcoal)" }}>{comment.body}</p>
              </article>
            )) : (
              <div className="rounded-lg border px-3 py-8 text-center text-sm" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                No comments yet.
              </div>
            )}
          </div>
          <div className="border-t p-4" style={{ borderColor: "var(--hairline)" }}>
            {canComment ? (
              <div className="space-y-2">
                {!shared.viewerName ? (
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} className="input-field" placeholder="Your name" />
                ) : null}
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Add a comment"
                />
                <button type="button" onClick={() => void handleAddComment()} disabled={isCommenting || !commentBody.trim()} className="btn-primary w-full justify-center disabled:opacity-50">
                  <Send size={14} /> Comment
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--mute)" }}>This link is view-only.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
