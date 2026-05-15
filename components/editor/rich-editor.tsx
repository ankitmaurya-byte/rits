"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { AiAssistModal } from "./ai-assist-modal";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link as LinkIcon,
  Link2Off,
  Minus,
  Undo2,
  Redo2,
  RemoveFormatting,
  Sparkles,
  MessageSquarePlus,
  Grip,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      title={title}
      disabled={disabled}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors"
      style={{
        backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent",
        color: active ? "var(--ink)" : disabled ? "var(--stone)" : "var(--charcoal)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(255,255,255,0.07)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            active ? "rgba(255,255,255,0.12)" : "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span
      className="mx-1 inline-block h-4 w-px shrink-0 self-center"
      style={{ backgroundColor: "var(--hairline-strong)" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function Toolbar({
  editor,
  onAiAssist,
}: {
  editor: Editor;
  onAiAssist: () => void;
}) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url, target: "_blank" })
      .run();
  }, [editor]);

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b"
      style={{ borderColor: "var(--hairline-strong)" }}
    >
      {/* History */}
      <ToolBtn title="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 size={14} />
      </ToolBtn>
      <ToolBtn title="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 size={14} />
      </ToolBtn>

      <Divider />

      {/* Text style */}
      <ToolBtn title="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolBtn>
      <ToolBtn title="Italic (⌘I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} />
      </ToolBtn>
      <ToolBtn title="Underline (⌘U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={14} />
      </ToolBtn>
      <ToolBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={14} />
      </ToolBtn>
      <ToolBtn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter size={14} />
      </ToolBtn>
      <ToolBtn title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={14} />
      </ToolBtn>

      <Divider />

      {/* Headings */}
      <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={14} />
      </ToolBtn>
      <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={14} />
      </ToolBtn>
      <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={14} />
      </ToolBtn>

      <Divider />

      {/* Lists */}
      <ToolBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={14} />
      </ToolBtn>
      <ToolBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={14} />
      </ToolBtn>
      <ToolBtn title="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListTodo size={14} />
      </ToolBtn>

      <Divider />

      {/* Block */}
      <ToolBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={14} />
      </ToolBtn>
      <ToolBtn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code2 size={14} />
      </ToolBtn>
      <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={14} />
      </ToolBtn>

      <Divider />

      {/* Alignment */}
      <ToolBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft size={14} />
      </ToolBtn>
      <ToolBtn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter size={14} />
      </ToolBtn>
      <ToolBtn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight size={14} />
      </ToolBtn>
      <ToolBtn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        <AlignJustify size={14} />
      </ToolBtn>

      <Divider />

      {/* Link */}
      <ToolBtn title="Insert / edit link" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon size={14} />
      </ToolBtn>
      <ToolBtn title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")}>
        <Link2Off size={14} />
      </ToolBtn>

      <Divider />

      {/* Clear */}
      <ToolBtn title="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
        <RemoveFormatting size={14} />
      </ToolBtn>

      <Divider />

      {/* AI Assist */}
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onAiAssist(); }}
        title="AI Writing Assistant"
        className="ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors"
        style={{
          borderColor: "var(--hairline-strong)",
          backgroundColor: "var(--surface-elevated)",
          color: "var(--charcoal)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--hairline-strong)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--charcoal)";
        }}
      >
        <Sparkles size={12} />
        AI
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** If true, shows word/char count in status bar */
  showCount?: boolean;
  /** "note" or "idea"  controls AI prompt suggestions */
  contextType?: "note" | "idea";
}

type SelectionPopoverState = {
  from: number;
  to: number;
  text: string;
  top: number;
  left: number;
};

type SelectionChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function RichEditor({
  content,
  onChange,
  placeholder = "Start writing…",
  minHeight = "300px",
  showCount = true,
  contextType = "note",
}: RichEditorProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<SelectionPopoverState | null>(null);
  const [selectionPromptOpen, setSelectionPromptOpen] = useState(false);
  const [selectionPrompt, setSelectionPrompt] = useState("");
  const [selectionAiLoading, setSelectionAiLoading] = useState<"enhance" | "prompt" | "explain" | "save" | null>(null);
  const [selectionChat, setSelectionChat] = useState<SelectionChatMessage[]>([]);
  const [selectionPanelPosition, setSelectionPanelPosition] = useState<{ top: number; left: number } | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const editorWrapRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originTop: number; originLeft: number } | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes heading, bold, italic, strike, code, blockquote,
        // lists, codeBlock, horizontalRule, hardBreak, history  all covered.
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Typography, // smart quotes, em-dashes, ellipsis, etc.
      Placeholder.configure({ placeholder }),
    ],
    content: content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content focus:outline-none",
        spellcheck: "true",
      },
      // Preserve rich formatting when pasting from Word, Google Docs, etc.
      // TipTap's default paste handler already handles this via ProseMirror's
      // transformPastedHTML  we just make sure it's not stripped.
      transformPastedHTML(html) {
        return html;
      },
    },
  });

  // Sync when switching notes / ideas
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor || contextType !== "note") return;

    const updateSelectionPopover = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to || !editor.isFocused) {
        setSelectionPopover(null);
        setSelectionPromptOpen(false);
        return;
      }

      const text = editor.state.doc.textBetween(from, to, "\n").trim();
      if (!text) {
        setSelectionPopover(null);
        setSelectionPromptOpen(false);
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const width = end.left - start.left;
      const nextPopover = {
        from,
        to,
        text,
        top: Math.min(start.top, end.top) - 12,
        left: start.left + Math.max(width / 2, 0),
      };

      setSelectionPopover(nextPopover);
      if (panelDismissed) return;
      setSelectionPanelPosition((current) => current ?? { top: nextPopover.top + 8, left: nextPopover.left });
    };

    editor.on("selectionUpdate", updateSelectionPopover);
    editor.on("focus", updateSelectionPopover);

    return () => {
      editor.off("selectionUpdate", updateSelectionPopover);
      editor.off("focus", updateSelectionPopover);
    };
  }, [contextType, editor, panelDismissed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current) return;
      setSelectionPanelPosition({
        top: Math.max(16, dragStateRef.current.originTop + (event.clientY - dragStateRef.current.startY)),
        left: Math.max(16, dragStateRef.current.originLeft + (event.clientX - dragStateRef.current.startX)),
      });
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const runSelectionAi = useCallback(
    async (mode: "enhance" | "prompt" | "explain") => {
      if (!editor || !selectionPopover) return;
      if (mode === "prompt" && !selectionPrompt.trim()) return;

      setSelectionAiLoading(mode);
      try {
        const instruction =
          mode === "enhance"
            ? [
                "Improve the selected excerpt for clarity, flow, and precision.",
                "Preserve the original meaning and keep the length reasonably similar unless expansion clearly helps.",
                "Return only the revised excerpt.",
              ].join(" ")
            : mode === "explain"
              ? [
                  "Explain the selected excerpt in a very short and clear way.",
                  "Use the full note as context.",
                  "Keep the explanation concise, ideally 2-4 sentences.",
                  "Return only the explanation.",
                ].join(" ")
            : [
                `Apply this instruction to the selected excerpt: ${selectionPrompt.trim()}.`,
                "Use the full note as context.",
                "Return only the revised excerpt.",
              ].join(" ");

        const prompt = `${instruction}\n\nSelected excerpt:\n"""\n${selectionPopover.text}\n"""`;
        if (mode !== "enhance") {
          setSelectionChat((current) => [
            ...current,
            {
              role: "user",
              content: mode === "explain" ? `Explain: ${selectionPopover.text}` : selectionPrompt.trim(),
            },
          ]);
        }
        const response = await fetch("/api/ai/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context: editor.getHTML(),
            contextType: "note",
          }),
        });
        const data = (await response.json()) as { result?: string; error?: string };
        if (!response.ok || data.error || !data.result?.trim()) {
          throw new Error(data.error ?? "AI assist failed.");
        }

        if (mode === "enhance" || mode === "prompt") {
          editor
            .chain()
            .focus()
            .insertContentAt({ from: selectionPopover.from, to: selectionPopover.to }, data.result.trim())
            .run();
        }

        setSelectionChat((current) => [...current, { role: "assistant", content: data.result.trim() }]);
        if (mode === "prompt") setSelectionPrompt("");
        if (mode !== "prompt") setSelectionPromptOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "AI assist failed.");
      } finally {
        setSelectionAiLoading(null);
      }
    },
    [editor, selectionPopover, selectionPrompt]
  );

  const saveSelectionChatToRitsAi = useCallback(async () => {
    if (!selectionPopover || selectionChat.length === 0) return;
    setSelectionAiLoading("save");
    try {
      const transcript = selectionChat
        .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
        .join("\n\n");
      const message = [
        `Save this temporary note-selection AI thread as a reusable Rits AI conversation.`,
        `Selected excerpt: "${selectionPopover.text}"`,
        `Whole note context should be considered.`,
        `Thread so far:\n${transcript}`,
      ].join("\n\n");

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          agentKey: "writer",
          scopeMode: "all",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to save chat.");
      }
      toast.success("Saved to Rits AI.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save chat.");
    } finally {
      setSelectionAiLoading(null);
    }
  }, [selectionChat, selectionPopover]);

  const words = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0;
  const chars = editor ? editor.getText().length : 0;

  return (
    <div
      ref={editorWrapRef}
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--surface-card)",
        border: "1px solid var(--hairline-strong)",
      }}
    >
      {/* Toolbar */}
      {editor && (
        <Toolbar
          editor={editor}
          onAiAssist={() => setAiOpen(true)}
        />
      )}

      {/* Editor body */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ minHeight }}
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>

      {contextType === "note" && selectionPopover && selectionPanelPosition && !panelDismissed ? (
        <div
          className="fixed z-[120] w-[380px] rounded-2xl border shadow-2xl"
          style={{
            top: selectionPanelPosition.top,
            left: selectionPanelPosition.left,
            borderColor: "var(--hairline-strong)",
            backgroundColor: "var(--surface-card)",
          }}
        >
          <div
            className="flex cursor-move items-center justify-between rounded-t-2xl border-b px-3 py-2"
            style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}
            onMouseDown={(event) => {
              dragStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                originTop: selectionPanelPosition.top,
                originLeft: selectionPanelPosition.left,
              };
            }}
          >
            <div className="flex items-center gap-2">
              <Grip size={13} style={{ color: "var(--mute)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>
                Selection AI
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelectionChat([]);
                  setSelectionPrompt("");
                  setSelectionPromptOpen(false);
                }}
                className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-card)]"
                style={{ color: "var(--mute)" }}
                aria-label="New temporary chat"
              >
                <MessageSquarePlus size={13} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setPanelDismissed(true)}
                className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-card)]"
                style={{ color: "var(--mute)" }}
                aria-label="Close selection AI"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <div className="rounded-xl border px-3 py-2 text-xs leading-5" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)", backgroundColor: "var(--surface-elevated)" }}>
              <span className="block text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--mute)" }}>Selected text</span>
              {selectionPopover.text}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void runSelectionAi("enhance")}
                disabled={selectionAiLoading !== null}
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60"
                style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}
              >
                {selectionAiLoading === "enhance" ? "Enhancing..." : "Enhance"}
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void runSelectionAi("explain")}
                disabled={selectionAiLoading !== null}
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60"
                style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}
              >
                {selectionAiLoading === "explain" ? "Explaining..." : "Explain"}
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSelectionPromptOpen((current) => !current)}
                disabled={selectionAiLoading !== null}
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60"
                style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}
              >
                Prompt
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void saveSelectionChatToRitsAi()}
                disabled={selectionAiLoading !== null || selectionChat.length === 0}
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60"
                style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}
              >
                {selectionAiLoading === "save" ? "Saving..." : "Save to Rits AI"}
              </button>
            </div>

            {selectionPromptOpen ? (
              <div className="flex items-end gap-2 rounded-xl border p-2" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                <textarea
                  value={selectionPrompt}
                  onChange={(e) => setSelectionPrompt(e.target.value)}
                  placeholder="Tell AI what to do with this selection..."
                  rows={2}
                  className="min-h-[56px] flex-1 resize-none border-0 bg-transparent text-[12px] leading-5 outline-none"
                  style={{ color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void runSelectionAi("prompt")}
                  disabled={selectionAiLoading !== null || !selectionPrompt.trim()}
                  className="rounded-full px-3 py-1.5 text-[11px] font-medium disabled:opacity-60"
                  style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}
                >
                  {selectionAiLoading === "prompt" ? "Working..." : "Send"}
                </button>
              </div>
            ) : null}

            <div className="max-h-[240px] space-y-2 overflow-y-auto rounded-xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
              {selectionChat.length === 0 ? (
                <p className="text-xs leading-5" style={{ color: "var(--charcoal)" }}>
                  Temporary selection chat. Use Explain, Enhance, or Prompt. Save it to Rits AI when it becomes worth keeping.
                </p>
              ) : (
                selectionChat.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className="rounded-xl px-3 py-2 text-xs leading-6"
                    style={{
                      backgroundColor: message.role === "assistant" ? "var(--surface-card)" : "transparent",
                      border: message.role === "assistant" ? "1px solid var(--hairline)" : "1px dashed transparent",
                      color: message.role === "assistant" ? "var(--body)" : "var(--ink)",
                    }}
                  >
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>
                      {message.role === "assistant" ? "AI" : "Prompt"}
                    </span>
                    {message.content}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Status bar */}
      {showCount && (
        <div
          className="flex items-center justify-end gap-4 border-t px-5 py-2 text-[11px]"
          style={{
            borderColor: "var(--hairline)",
            color: "var(--mute)",
            backgroundColor: "var(--surface-elevated)",
          }}
        >
          <span>{words} word{words !== 1 ? "s" : ""}</span>
          <span>{chars} char{chars !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* AI Assist Modal */}
      <AiAssistModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        contextHtml={editor ? editor.getHTML() : content}
        contextType={contextType}
        onAppend={(html) => {
          editor?.chain().focus().insertContentAt(editor.state.doc.content.size, html).run();
          onChange(editor?.getHTML() ?? content);
        }}
        onReplace={(html) => {
          editor?.commands.setContent(html, { emitUpdate: true });
          onChange(editor?.getHTML() ?? html);
        }}
      />

      {/* Editor styles */}
      <style>{`
        .rich-editor-content {
          min-height: ${minHeight};
          font-size: 14px;
          line-height: 1.75;
          color: var(--body);
          caret-color: var(--ink);
        }
        .rich-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--stone);
          pointer-events: none;
          height: 0;
        }
        /* Headings */
        .rich-editor-content h1 { font-size: 1.6em; font-weight: 600; color: var(--ink); margin: 1em 0 0.4em; line-height: 1.3; }
        .rich-editor-content h2 { font-size: 1.3em; font-weight: 600; color: var(--ink); margin: 0.9em 0 0.35em; line-height: 1.35; }
        .rich-editor-content h3 { font-size: 1.1em; font-weight: 600; color: var(--ink); margin: 0.8em 0 0.3em; line-height: 1.4; }
        /* Paragraphs */
        .rich-editor-content p { margin: 0 0 0.7em; }
        .rich-editor-content p:last-child { margin-bottom: 0; }
        /* Inline */
        .rich-editor-content strong { font-weight: 600; color: var(--ink); }
        .rich-editor-content em { font-style: italic; color: var(--charcoal); }
        .rich-editor-content u { text-decoration: underline; text-underline-offset: 3px; }
        .rich-editor-content s { text-decoration: line-through; color: var(--charcoal); }
        .rich-editor-content mark { background-color: rgba(251,191,36,0.25); border-radius: 2px; padding: 0 2px; }
        .rich-editor-content code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.85em; background: rgba(255,255,255,0.07); border: 1px solid var(--hairline-strong); border-radius: 4px; padding: 1px 5px; color: var(--ink); }
        /* Code block */
        .rich-editor-content pre { background: rgba(255,255,255,0.03); border: 1px solid var(--hairline-strong); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 0.8em 0; }
        .rich-editor-content pre code { background: none; border: none; padding: 0; font-size: 0.82em; line-height: 1.65; color: var(--ink); }
        /* Blockquote */
        .rich-editor-content blockquote { border-left: 3px solid var(--hairline-strong); margin: 0.8em 0; padding: 6px 0 6px 16px; color: var(--charcoal); font-style: italic; }
        /* HR */
        .rich-editor-content hr { border: none; border-top: 1px solid var(--hairline-strong); margin: 1.2em 0; }
        /* Lists */
        .rich-editor-content ul { list-style-type: disc; padding-left: 1.4em; margin: 0.5em 0; }
        .rich-editor-content ol { list-style-type: decimal; padding-left: 1.4em; margin: 0.5em 0; }
        .rich-editor-content li { margin: 0.25em 0; line-height: 1.7; }
        .rich-editor-content li p { margin: 0; }
        /* Task list */
        .rich-editor-content ul[data-type="taskList"] { list-style: none; padding-left: 0.2em; }
        .rich-editor-content ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
        .rich-editor-content ul[data-type="taskList"] li > label { display: flex; align-items: center; margin-top: 3px; cursor: pointer; }
        .rich-editor-content ul[data-type="taskList"] li > label > input[type="checkbox"] { accent-color: var(--accent-blue); width: 14px; height: 14px; cursor: pointer; }
        .rich-editor-content ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; opacity: 0.5; }
        /* Links */
        .rich-editor-content a { color: var(--accent-blue); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .rich-editor-content a:hover { opacity: 0.75; }
        /* Text align */
        .rich-editor-content [style*="text-align: center"] { text-align: center; }
        .rich-editor-content [style*="text-align: right"] { text-align: right; }
        .rich-editor-content [style*="text-align: justify"] { text-align: justify; }
        /* Selection */
        .rich-editor-content ::selection { background: rgba(96,165,250,0.25); }
      `}</style>
    </div>
  );
}
