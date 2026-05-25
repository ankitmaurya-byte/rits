"use client";

import { useEffect, useCallback, useRef, useState, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { AiAssistModal } from "./ai-assist-modal";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Node, mergeAttributes, type Content } from "@tiptap/core";
import { Fragment as ProseMirrorFragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
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
import { RitsImage } from "./rits-image-extension";
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
  ImagePlus,
  Table,
  Info,
  Video,
  FileAudio,
  File,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type EditorBlockHandleState = {
  pos: number;
  top: number;
  left: number;
  height: number;
  width: number;
  text: string;
};
type EditorBlockDropTarget = EditorBlockHandleState & {
  intent: "before" | "after";
  indicatorTop: number;
};
type EditorBlockDragPreview = {
  top: number;
  left: number;
  width: number;
  height: number;
  text: string;
};
type EditorBlockRange = EditorBlockHandleState & {
  end: number;
  nodeSize: number;
};
type InlineAiPromptState = EditorBlockHandleState & {
  prompt: string;
  loading: boolean;
};
type BlockAction =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "ordered"
  | "task"
  | "quote"
  | "code"
  | "divider"
  | "image"
  | "callout"
  | "toggle"
  | "table"
  | "video"
  | "audio"
  | "file";

const CalloutBlock = Node.create({
  name: "calloutBlock",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout", class: "rits-callout" }),
      ["div", { class: "rits-callout-icon", contenteditable: "false" }, "i"],
      ["div", { class: "rits-callout-content" }, 0],
    ];
  },
});

const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      title: {
        default: "Toggle",
        parseHTML: (element) => element.getAttribute("data-title") ?? "Toggle",
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'details[data-type="toggle"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, { "data-type": "toggle", class: "rits-toggle", open: "" }),
      ["summary", { contenteditable: "false" }, node.attrs.title || "Toggle"],
      ["div", { class: "rits-toggle-content" }, 0],
    ];
  },
});

const TableFrame = Node.create({
  name: "tableFrame",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      rows: { default: 3, parseHTML: (element) => Number(element.getAttribute("data-rows") ?? 3) },
      cols: { default: 3, parseHTML: (element) => Number(element.getAttribute("data-cols") ?? 3) },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="table-frame"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const rows = Math.max(1, Math.min(8, Number(node.attrs.rows) || 3));
    const cols = Math.max(1, Math.min(8, Number(node.attrs.cols) || 3));
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "table-frame", "data-rows": rows, "data-cols": cols, class: "rits-table-frame" }),
      ["table", ["tbody", ...Array.from({ length: rows }, () => ["tr", ...Array.from({ length: cols }, () => ["td", ""])])]],
    ];
  },
});

const MediaFrame = Node.create({
  name: "mediaFrame",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: "", parseHTML: (element) => element.getAttribute("data-src") ?? "" },
      kind: { default: "video", parseHTML: (element) => element.getAttribute("data-kind") ?? "video" },
      title: { default: "", parseHTML: (element) => element.getAttribute("data-title") ?? "" },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="media-frame"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const src = String(node.attrs.src || "");
    const kind = String(node.attrs.kind || "video");
    const title = String(node.attrs.title || src || kind);
    const attrs = mergeAttributes(HTMLAttributes, {
      "data-type": "media-frame",
      "data-kind": kind,
      "data-src": src,
      "data-title": title,
      class: `rits-media-frame rits-media-frame-${kind}`,
    });

    if (kind === "audio") {
      return ["div", attrs, ["audio", { controls: "", src }], ["a", { href: src, target: "_blank", rel: "noreferrer" }, title]];
    }

    if (kind === "file") {
      return ["div", attrs, ["a", { href: src, target: "_blank", rel: "noreferrer" }, title || "Open file"]];
    }

    return ["div", attrs, ["iframe", { src, title, allowfullscreen: "", loading: "lazy" }]];
  },
});

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
  onAddImage,
}: {
  editor: Editor;
  onAiAssist: () => void;
  onAddImage: () => void;
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

      <ToolBtn title="Upload image" onClick={onAddImage}>
        <ImagePlus size={14} />
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
  className?: string;
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

function hasAiEligibleSelectionLine(text: string) {
  return text
    .split(/\r?\n/)
    .some((line) => line.replace(/\s/g, "").length >= 5);
}

export function RichEditor({
  content,
  onChange,
  placeholder = "Start writing…",
  minHeight = "300px",
  showCount = true,
  contextType = "note",
  className = "",
}: RichEditorProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<SelectionPopoverState | null>(null);
  const [selectionPromptOpen, setSelectionPromptOpen] = useState(false);
  const [selectionPrompt, setSelectionPrompt] = useState("");
  const [selectionAiLoading, setSelectionAiLoading] = useState<"enhance" | "prompt" | "explain" | "save" | null>(null);
  const [selectionChat, setSelectionChat] = useState<SelectionChatMessage[]>([]);
  const [selectionPanelPosition, setSelectionPanelPosition] = useState<{ top: number; left: number } | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [blockHandle, setBlockHandle] = useState<EditorBlockHandleState | null>(null);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [draggingBlockPos, setDraggingBlockPos] = useState<number | null>(null);
  const [blockDropTarget, setBlockDropTarget] = useState<EditorBlockDropTarget | null>(null);
  const [blockDragPreview, setBlockDragPreview] = useState<EditorBlockDragPreview | null>(null);
  const [selectedBlockPositions, setSelectedBlockPositions] = useState<number[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<EditorBlockRange[]>([]);
  const [inlineAiPrompt, setInlineAiPrompt] = useState<InlineAiPromptState | null>(null);
  const editorWrapRef = useRef<HTMLDivElement | null>(null);
  const editorBodyRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originTop: number; originLeft: number } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadImageToCloudinary(file: File): Promise<{ url: string; width: number | null }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/cloudinary/upload", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { url?: string; width?: number | null; error?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error ?? "Image upload failed.");
    }
    return { url: data.url, width: data.width ?? null };
  }

  function isImageUrl(value: string) {
    return /^(https?:\/\/.*\.(?:png|jpe?g|gif|webp|svg|avif))(\?.*)?$/i.test(value.trim());
  }

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
      RitsImage,
      CalloutBlock,
      ToggleBlock,
      TableFrame,
      MediaFrame,
      Typography, // smart quotes, em-dashes, ellipsis, etc.
      Placeholder.configure({ placeholder }),
    ],
    content: content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setSelectedBlockPositions([]);
      setSelectedBlocks([]);
      setInlineAiPrompt(null);
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
      handlePaste(view, event) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;
        if (clipboardData.files?.length) {
          void handleImageFiles(clipboardData.files);
          return true;
        }
        const text = clipboardData.getData("text/plain").trim();
        if (isImageUrl(text)) {
          insertImageFromUrl(text);
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        if (event.dataTransfer?.files?.length) {
          void handleImageFiles(event.dataTransfer.files);
          return true;
        }
        if (event.dataTransfer?.types.includes("application/x-rits-block")) {
          // Tell ProseMirror to ignore block drops so it doesn't insert raw numbers
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          if (event.ctrlKey || event.metaKey) {
            return true;
          }
          return false;
        },
      },
      handleKeyDown(view, event) {
        if (event.key !== "/" && event.key !== " ") return false;
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;

        const { selection, doc } = view.state;
        if (!selection.empty || selection.$from.depth < 1) return false;

        const node = selection.$from.node(1);
        if (!node.isTextblock || node.content.size > 0) return false;

        const pos = selection.$from.before(1);
        let index = -1;
        let nextPos = 0;
        for (let childIndex = 0; childIndex < doc.childCount; childIndex += 1) {
          const child = doc.child(childIndex);
          if (nextPos === pos) {
            index = childIndex;
            break;
          }
          nextPos += child.nodeSize;
        }
        if (index < 0 || !editorBodyRef.current) return false;

        const blockElement = (view.dom as HTMLElement).children[index];
        if (!(blockElement instanceof HTMLElement)) return false;

        const bodyRect = editorBodyRef.current.getBoundingClientRect();
        const blockRect = blockElement.getBoundingClientRect();
        const currentBlock = {
          pos,
          top: blockRect.top - bodyRect.top + editorBodyRef.current.scrollTop,
          left: blockRect.left - bodyRect.left - 36,
          height: blockRect.height,
          width: blockRect.width,
          text: "Empty block",
        };

        event.preventDefault();
        setSelectedBlockPositions([]);
        setSelectedBlocks([]);
        setBlockHandle(currentBlock);
        setInlineAiPrompt(null);

        if (event.key === "/") {
          setBlockMenuOpen(true);
          return true;
        }

        setBlockMenuOpen(false);
        setInlineAiPrompt({ ...currentBlock, prompt: "", loading: false });
        return true;
      },
    },
  });

  const getTopLevelBlockFromEvent = useCallback((event: ReactMouseEvent | ReactDragEvent | MouseEvent) => {
    if (!editor || !editorBodyRef.current) return null;
    const editorDom = editor.view.dom as HTMLElement;
    const target = event.target instanceof HTMLElement ? event.target : null;
    let blockElement = target?.closest(".ProseMirror > *");

    if (!(blockElement instanceof HTMLElement) || !editorDom.contains(blockElement)) {
      const blocks = Array.from(editorDom.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      blockElement = blocks.find((block) => {
        const rect = block.getBoundingClientRect();
        return event.clientY >= rect.top && event.clientY <= rect.bottom;
      }) ?? null;
    }

    if (!(blockElement instanceof HTMLElement) || !editorDom.contains(blockElement)) return null;

    const index = Array.from(editorDom.children).indexOf(blockElement);
    if (index < 0) return null;

    let pos = 0;
    for (let childIndex = 0; childIndex < index; childIndex += 1) {
      pos += editor.state.doc.child(childIndex).nodeSize;
    }

    const bodyRect = editorBodyRef.current.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();
    return {
      pos,
      top: blockRect.top - bodyRect.top + editorBodyRef.current.scrollTop,
      left: blockRect.left - bodyRect.left - 36,
      height: blockRect.height,
      width: blockRect.width,
      text: blockElement.textContent?.trim() || blockElement.getAttribute("data-type") || "Empty block",
    };
  }, [editor]);

  const getDropTargetFromEvent = useCallback((event: ReactDragEvent): EditorBlockDropTarget | null => {
    const bodyRect = editorBodyRef.current?.getBoundingClientRect();
    if (!editor || !editorBodyRef.current || !bodyRect) return null;

    let block = getTopLevelBlockFromEvent(event);
    let intent: "before" | "after" | null = null;

    if (!block) {
      const editorDom = editor.view.dom as HTMLElement;
      const blocks = Array.from(editorDom.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      const targetIndex = blocks.findIndex((element) => event.clientY < element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2);
      const fallbackIndex = targetIndex >= 0 ? targetIndex : blocks.length - 1;
      const fallbackElement = blocks[fallbackIndex];
      if (!fallbackElement) return null;

      let pos = 0;
      for (let childIndex = 0; childIndex < fallbackIndex; childIndex += 1) {
        pos += editor.state.doc.child(childIndex).nodeSize;
      }

      const blockRect = fallbackElement.getBoundingClientRect();
      block = {
        pos,
        top: blockRect.top - bodyRect.top + editorBodyRef.current.scrollTop,
        left: blockRect.left - bodyRect.left - 36,
        height: blockRect.height,
        width: blockRect.width,
        text: fallbackElement.textContent?.trim() || fallbackElement.getAttribute("data-type") || "Empty block",
      };
      intent = targetIndex >= 0 ? "before" : "after";
    }

    const blockViewportTop = bodyRect.top + block.top - editorBodyRef.current.scrollTop;
    intent ??= event.clientY < blockViewportTop + block.height / 2 ? "before" : "after";
    return {
      ...block,
      intent,
      indicatorTop: intent === "before" ? block.top : block.top + block.height,
    };
  }, [editor, getTopLevelBlockFromEvent]);

  const getTopLevelBlockByPos = useCallback((pos: number): EditorBlockRange | null => {
    if (!editor || !editorBodyRef.current) return null;
    const editorDom = editor.view.dom as HTMLElement;
    let nextPos = 0;
    let index = -1;
    for (let childIndex = 0; childIndex < editor.state.doc.childCount; childIndex += 1) {
      const node = editor.state.doc.child(childIndex);
      if (nextPos === pos) {
        index = childIndex;
        break;
      }
      nextPos += node.nodeSize;
    }
    if (index < 0) return null;

    const node = editor.state.doc.child(index);
    const blockElement = editorDom.children[index];
    if (!(blockElement instanceof HTMLElement)) return null;

    const bodyRect = editorBodyRef.current.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();
    return {
      pos,
      end: pos + node.nodeSize,
      nodeSize: node.nodeSize,
      top: blockRect.top - bodyRect.top + editorBodyRef.current.scrollTop,
      left: blockRect.left - bodyRect.left - 36,
      height: blockRect.height,
      width: blockRect.width,
      text: blockElement.textContent?.trim() || blockElement.getAttribute("data-type") || "Empty block",
    };
  }, [editor]);

  const activeBlockHandle = selectedBlocks.length > 0
    ? selectedBlocks.reduce((topBlock, block) => block.top < topBlock.top ? block : topBlock, selectedBlocks[0])
    : blockHandle;

  const getBlocksFromPositions = useCallback((positions: number[]) => (
    positions
      .map((pos) => getTopLevelBlockByPos(pos))
      .filter((block): block is EditorBlockRange => Boolean(block))
  ), [getTopLevelBlockByPos]);

  const placeCursorInBlock = useCallback((pos: number) => {
    if (!editor) return false;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return false;

    const selectionPos = Math.min(pos + 1, editor.state.doc.content.size);
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(selectionPos))));
    editor.view.focus();
    return true;
  }, [editor]);

  function insertImageFromUrl(url: string, width?: number | null) {
    if (!editor) return;
    editor.chain().focus().setRitsImage({ src: url, width: width ?? 420, displayMode: "image" }).run();
  }

  async function handleImageFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return false;
    try {
      for (const file of imageFiles) {
        const uploaded = await uploadImageToCloudinary(file);
        insertImageFromUrl(uploaded.url, uploaded.width);
      }
      toast.success(imageFiles.length === 1 ? "Image added." : "Images added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    }
    return true;
  }

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
        setSelectionPanelPosition(null);
        setPanelDismissed(false);
        return;
      }

      const text = editor.state.doc.textBetween(from, to, "\n").trim();
      if (!text || !hasAiEligibleSelectionLine(text)) {
        setSelectionPopover(null);
        setSelectionPromptOpen(false);
        setSelectionPanelPosition(null);
        setPanelDismissed(false);
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const width = end.left - start.left;
      const nextPopover = {
        from,
        to,
        text,
        top: Math.max(start.bottom, end.bottom) + 16,
        left: start.left + Math.max(width / 2, 0),
      };

      setSelectionPopover(nextPopover);
      if (panelDismissed) return;
      setSelectionPanelPosition((current) => current ?? { top: nextPopover.top, left: nextPopover.left });
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
        const result = data.result.trim();

        if (mode === "enhance" || mode === "prompt") {
          editor
            .chain()
            .focus()
            .insertContentAt({ from: selectionPopover.from, to: selectionPopover.to }, result)
            .run();
        }

        setSelectionChat((current) => [...current, { role: "assistant", content: result }]);
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

  const runInlineAiPrompt = useCallback(async () => {
    if (!editor || !inlineAiPrompt?.prompt.trim() || inlineAiPrompt.loading) return;

    setInlineAiPrompt((current) => current ? { ...current, loading: true } : current);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: [
            "Write note content for this empty editor block.",
            "Return only the content to insert. Keep it concise unless the user asks for detail.",
            `User prompt: ${inlineAiPrompt.prompt.trim()}`,
          ].join("\n"),
          context: editor.getHTML(),
          contextType,
        }),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result?.trim()) {
        throw new Error(data.error ?? "AI prompt failed.");
      }

      const targetNode = editor.state.doc.nodeAt(inlineAiPrompt.pos);
      if (!targetNode) return;
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: inlineAiPrompt.pos, to: inlineAiPrompt.pos + targetNode.nodeSize },
          `<p>${data.result.trim()}</p>`
        )
        .run();
      setInlineAiPrompt(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI prompt failed.");
      setInlineAiPrompt((current) => current ? { ...current, loading: false } : current);
    }
  }, [contextType, editor, inlineAiPrompt]);

  const insertBlockAfterActive = useCallback((contentToInsert: Content) => {
    const targetBlock = activeBlockHandle;
    if (!editor || !targetBlock) return;
    const targetNode = editor.state.doc.nodeAt(targetBlock.pos);
    const insertPos = targetBlock.pos + (targetNode?.nodeSize ?? 0);
    editor.chain().focus().insertContentAt(insertPos, contentToInsert).run();
    setBlockMenuOpen(false);
  }, [activeBlockHandle, editor]);

  const transformActiveBlock = useCallback((type: BlockAction) => {
    const targetBlock = activeBlockHandle;
    if (!editor || !targetBlock) return;

    if (type === "image") {
      imageInputRef.current?.click();
      setBlockMenuOpen(false);
      return;
    }

    if (type === "callout") {
      insertBlockAfterActive({
        type: "calloutBlock",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Callout" }] }],
      });
      return;
    }

    if (type === "toggle") {
      insertBlockAfterActive({
        type: "toggleBlock",
        attrs: { title: "Toggle" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hidden detail" }] }],
      });
      return;
    }

    if (type === "table") {
      insertBlockAfterActive({ type: "tableFrame", attrs: { rows: 3, cols: 3 } });
      return;
    }

    if (type === "video" || type === "audio" || type === "file") {
      const url = window.prompt(`${type === "video" ? "Video embed" : type === "audio" ? "Audio" : "File"} URL`);
      if (!url?.trim()) return;
      insertBlockAfterActive({
        type: "mediaFrame",
        attrs: { kind: type, src: url.trim(), title: type === "file" ? "File attachment" : url.trim() },
      });
      return;
    }

    if (!placeCursorInBlock(targetBlock.pos)) return;

    const chain = editor.chain().focus();
    if (selectedBlocks.length > 1) {
      const from = Math.min(...selectedBlocks.map((block) => block.pos));
      const to = Math.max(...selectedBlocks.map((block) => block.end));
      editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from + 1, Math.max(from + 1, to - 1))));
    }

    if (type === "paragraph") chain.setParagraph().run();
    if (type === "h1") chain.toggleHeading({ level: 1 }).run();
    if (type === "h2") chain.toggleHeading({ level: 2 }).run();
    if (type === "h3") chain.toggleHeading({ level: 3 }).run();
    if (type === "bullet") chain.toggleBulletList().run();
    if (type === "ordered") chain.toggleOrderedList().run();
    if (type === "task") chain.toggleTaskList().run();
    if (type === "quote") chain.toggleBlockquote().run();
    if (type === "code") chain.toggleCodeBlock().run();
    if (type === "divider") chain.setHorizontalRule().run();
    setBlockMenuOpen(false);
  }, [activeBlockHandle, editor, insertBlockAfterActive, placeCursorInBlock, selectedBlocks]);

  const moveBlock = useCallback((fromPos: number, toPos: number, intent: "before" | "after") => {
    if (!editor || fromPos === toPos) return;

    const node = editor.state.doc.nodeAt(fromPos);
    const target = editor.state.doc.nodeAt(toPos);
    if (!node || !target) return;

    const fromEnd = fromPos + node.nodeSize;
    const targetEnd = toPos + target.nodeSize;
    const rawInsertPos = intent === "before" ? toPos : targetEnd;
    if (rawInsertPos >= fromPos && rawInsertPos <= fromEnd) return;

    const insertPos = rawInsertPos > fromPos ? rawInsertPos - node.nodeSize : rawInsertPos;
    const tr = editor.state.tr
      .delete(fromPos, fromEnd)
      .insert(insertPos, ProseMirrorFragment.from(node));

    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();
    onChange(editor.getHTML());
  }, [editor, onChange]);

  const moveBlocks = useCallback((fromPositions: number[], toPos: number, intent: "before" | "after") => {
    if (!editor || fromPositions.length === 0) return;

    const blocks = fromPositions
      .map((pos) => {
        const node = editor.state.doc.nodeAt(pos);
        return node ? { pos, end: pos + node.nodeSize, node } : null;
      })
      .filter((block): block is { pos: number; end: number; node: ProseMirrorNode } => Boolean(block))
      .sort((left, right) => left.pos - right.pos);
    const target = editor.state.doc.nodeAt(toPos);
    if (blocks.length === 0 || !target) return;

    const targetEnd = toPos + target.nodeSize;
    const rawInsertPos = intent === "before" ? toPos : targetEnd;
    if (blocks.some((block) => rawInsertPos >= block.pos && rawInsertPos <= block.end)) return;

    const movedSizeBeforeTarget = blocks
      .filter((block) => block.pos < rawInsertPos)
      .reduce((total, block) => total + block.node.nodeSize, 0);
    const insertPos = rawInsertPos - movedSizeBeforeTarget;
    const fragment = ProseMirrorFragment.fromArray(blocks.map((block) => block.node));
    let tr = editor.state.tr;
    [...blocks].reverse().forEach((block) => {
      tr = tr.delete(block.pos, block.end);
    });
    tr = tr.insert(insertPos, fragment);

    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();
    setSelectedBlockPositions([]);
    setSelectedBlocks([]);
    onChange(editor.getHTML());
  }, [editor, onChange]);

  const words = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0;
  const chars = editor ? editor.getText().length : 0;

  return (
    <div
      ref={editorWrapRef}
      className={`flex flex-col rounded-xl overflow-hidden bg-[var(--surface-card)] border border-[var(--hairline-strong)] ${className}`}
    >
      {/* Toolbar */}
      {editor && (
        <Toolbar
          editor={editor}
          onAiAssist={() => setAiOpen(true)}
          onAddImage={() => imageInputRef.current?.click()}
        />
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void handleImageFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />

      {/* Editor body */}
      <div
        ref={editorBodyRef}
        className="relative flex-1 overflow-y-auto px-12 py-4"
        style={{ minHeight }}
        onMouseMove={(event) => {
          if (blockMenuOpen || draggingBlockPos !== null) return;
          setBlockHandle(getTopLevelBlockFromEvent(event));
        }}
        onMouseLeave={() => {
          if (!blockMenuOpen && draggingBlockPos === null) setBlockHandle(null);
        }}
        onDragOver={(event) => {
          if (draggingBlockPos === null) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          const nextTarget = getDropTargetFromEvent(event);
          if (nextTarget) {
            setBlockHandle(nextTarget);
            setBlockDropTarget(nextTarget);
          }
          const editorBody = editorBodyRef.current;
          if (editorBody) {
            const bodyRect = editorBody.getBoundingClientRect();
            setBlockDragPreview((current) => current ? {
              ...current,
              top: event.clientY - bodyRect.top + editorBody.scrollTop - current.height / 2,
              left: Math.max(8, event.clientX - bodyRect.left - 18),
            } : null);
          }
        }}
        onDrop={(event) => {
          if (draggingBlockPos === null || !blockDropTarget) return;
          event.preventDefault();
          const dragPositions = selectedBlockPositions.includes(draggingBlockPos) ? selectedBlockPositions : [draggingBlockPos];
          if (dragPositions.length > 1) {
            moveBlocks(dragPositions, blockDropTarget.pos, blockDropTarget.intent);
          } else {
            moveBlock(draggingBlockPos, blockDropTarget.pos, blockDropTarget.intent);
          }
          setDraggingBlockPos(null);
          setBlockDropTarget(null);
          setBlockDragPreview(null);
          setBlockMenuOpen(false);
        }}
        onClick={(event) => {
          setSelectedBlockPositions([]);
          setSelectedBlocks([]);
          editor?.chain().focus().run();
        }}
      >
        {selectedBlocks.map((block) => (
          <div
            key={block.pos}
            className="pointer-events-none absolute z-[1] rounded-md bg-blue-400/10 ring-1 ring-blue-400/20"
            style={{
              top: block.top,
              left: Math.max(block.left + 36, 40),
              width: Math.max(block.width, 160),
              height: block.height,
            }}
          />
        ))}
        {blockDropTarget && draggingBlockPos !== null ? (
          <div
            className="pointer-events-none absolute z-10 h-0.5 rounded-full bg-blue-400"
            style={{
              top: blockDropTarget.indicatorTop,
              left: Math.max(blockDropTarget.left + 36, 40),
              width: Math.max(blockDropTarget.width, 160),
            }}
          />
        ) : null}
        {blockDragPreview && draggingBlockPos !== null ? (
          <div
            className="pointer-events-none absolute z-30 max-w-[520px] rounded-md border px-3 py-2 text-xs shadow-2xl opacity-90"
            style={{
              top: blockDragPreview.top,
              left: blockDragPreview.left,
              width: Math.min(Math.max(blockDragPreview.width, 180), 520),
              minHeight: Math.min(Math.max(blockDragPreview.height, 34), 96),
              borderColor: "var(--hairline-strong)",
              backgroundColor: "var(--surface-card)",
              color: "var(--charcoal)",
            }}
          >
            <span className="line-clamp-2">{blockDragPreview.text}</span>
          </div>
        ) : null}
        {inlineAiPrompt ? (
          <div
            className="absolute z-30 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-xl"
            style={{
              top: inlineAiPrompt.top + Math.max((inlineAiPrompt.height - 38) / 2, 0),
              left: Math.max(inlineAiPrompt.left + 36, 40),
              width: Math.min(Math.max(inlineAiPrompt.width, 260), 620),
              borderColor: "var(--hairline-strong)",
              backgroundColor: "var(--surface-card)",
            }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <Sparkles size={14} className="shrink-0 text-blue-400" />
            <input
              autoFocus
              value={inlineAiPrompt.prompt}
              onChange={(event) => setInlineAiPrompt((current) => current ? { ...current, prompt: event.target.value } : current)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setInlineAiPrompt(null);
                  editor?.chain().focus().run();
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runInlineAiPrompt();
                }
              }}
              placeholder="Ask AI to write this block..."
              disabled={inlineAiPrompt.loading}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
              style={{ color: "var(--ink)" }}
            />
            <button
              type="button"
              onClick={() => void runInlineAiPrompt()}
              disabled={inlineAiPrompt.loading || !inlineAiPrompt.prompt.trim()}
              className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}
            >
              {inlineAiPrompt.loading ? "Writing" : "Insert"}
            </button>
          </div>
        ) : null}
        {editor && activeBlockHandle ? (
          <>
            <button
              type="button"
              draggable
              className="absolute z-20 flex h-7 w-7 cursor-grab items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-elevated)] active:cursor-grabbing"
              style={{
                top: activeBlockHandle.top + Math.max((activeBlockHandle.height - 28) / 2, 0),
                left: Math.max(activeBlockHandle.left, 8),
                backgroundColor: blockMenuOpen ? "var(--surface-elevated)" : "transparent",
                color: "var(--mute)",
              }}
              title="Drag to move. Click for block options."
              aria-label="Block options"
              onClick={(event) => {
                event.stopPropagation();
                placeCursorInBlock(activeBlockHandle.pos);
                setBlockMenuOpen((current) => !current);
              }}
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.effectAllowed = "move";
                const dragPositions = selectedBlockPositions.includes(activeBlockHandle.pos) ? selectedBlockPositions : [activeBlockHandle.pos];
                event.dataTransfer.setData("application/x-rits-block", dragPositions.join(","));
                const dragImage = document.createElement("div");
                dragImage.style.width = "1px";
                dragImage.style.height = "1px";
                dragImage.style.opacity = "0";
                document.body.appendChild(dragImage);
                event.dataTransfer.setDragImage(dragImage, 0, 0);
                window.setTimeout(() => dragImage.remove(), 0);
                setDraggingBlockPos(activeBlockHandle.pos);
                setBlockDragPreview({
                  top: activeBlockHandle.top,
                  left: Math.max(activeBlockHandle.left + 36, 40),
                  width: activeBlockHandle.width,
                  height: activeBlockHandle.height,
                  text: dragPositions.length > 1 ? `${dragPositions.length} selected blocks` : activeBlockHandle.text,
                });
                setBlockDropTarget(null);
                setBlockMenuOpen(false);
              }}
              onDragEnd={() => {
                setDraggingBlockPos(null);
                setBlockDropTarget(null);
                setBlockDragPreview(null);
              }}
            >
              <Grip size={16} strokeWidth={1.8} />
            </button>

            {blockMenuOpen ? (
              <div
                className="absolute z-30 w-56 overflow-hidden rounded-xl border p-1 shadow-2xl"
                style={{
                  top: activeBlockHandle.top + Math.max((activeBlockHandle.height - 28) / 2, 0),
                  left: Math.max(activeBlockHandle.left + 32, 42),
                  borderColor: "var(--hairline-strong)",
                  backgroundColor: "var(--surface-card)",
                }}
                onMouseDown={(event) => event.preventDefault()}
              >
                {[
                  { label: "Text", icon: <RemoveFormatting size={14} />, type: "paragraph" as const },
                  { label: "Heading 1", icon: <Heading1 size={14} />, type: "h1" as const },
                  { label: "Heading 2", icon: <Heading2 size={14} />, type: "h2" as const },
                  { label: "Heading 3", icon: <Heading3 size={14} />, type: "h3" as const },
                  { label: "Bullet list", icon: <List size={14} />, type: "bullet" as const },
                  { label: "Numbered list", icon: <ListOrdered size={14} />, type: "ordered" as const },
                  { label: "Task list", icon: <ListTodo size={14} />, type: "task" as const },
                  { label: "Quote", icon: <Quote size={14} />, type: "quote" as const },
                  { label: "Code block", icon: <Code2 size={14} />, type: "code" as const },
                  { label: "Divider", icon: <Minus size={14} />, type: "divider" as const },
                  { label: "Image", icon: <ImagePlus size={14} />, type: "image" as const },
                  { label: "Callout", icon: <Info size={14} />, type: "callout" as const },
                  { label: "Toggle", icon: <ChevronRight size={14} />, type: "toggle" as const },
                  { label: "Table", icon: <Table size={14} />, type: "table" as const },
                  { label: "Video frame", icon: <Video size={14} />, type: "video" as const },
                  { label: "Audio", icon: <FileAudio size={14} />, type: "audio" as const },
                  { label: "File", icon: <File size={14} />, type: "file" as const },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--surface-elevated)]"
                    style={{ color: "var(--charcoal)" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      transformActiveBlock(item.type);
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
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
        .rich-editor-content .rits-image-block { margin: 0; }
        .rich-editor-content .rits-callout {
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 10px;
          margin: 0.8em 0;
          border: 1px solid var(--hairline-strong);
          border-radius: 8px;
          background: rgba(96,165,250,0.08);
          padding: 12px;
        }
        .rich-editor-content .rits-callout-icon {
          display: flex;
          height: 24px;
          width: 24px;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: rgba(96,165,250,0.16);
          color: var(--accent-blue);
          font-size: 12px;
          font-weight: 700;
          font-style: normal;
        }
        .rich-editor-content .rits-callout-content > :last-child,
        .rich-editor-content .rits-toggle-content > :last-child { margin-bottom: 0; }
        .rich-editor-content .rits-toggle {
          margin: 0.8em 0;
          border: 1px solid var(--hairline-strong);
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          padding: 10px 12px;
        }
        .rich-editor-content .rits-toggle summary {
          cursor: pointer;
          color: var(--ink);
          font-weight: 600;
          list-style-position: inside;
        }
        .rich-editor-content .rits-toggle-content { margin-top: 10px; padding-left: 18px; }
        .rich-editor-content .rits-table-frame {
          margin: 0.9em 0;
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid var(--hairline-strong);
        }
        .rich-editor-content .rits-table-frame table {
          width: 100%;
          min-width: 360px;
          border-collapse: collapse;
        }
        .rich-editor-content .rits-table-frame td {
          height: 38px;
          border: 1px solid var(--hairline);
          background: rgba(255,255,255,0.025);
        }
        .rich-editor-content .rits-media-frame {
          margin: 0.9em 0;
          overflow: hidden;
          border: 1px solid var(--hairline-strong);
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
        }
        .rich-editor-content .rits-media-frame iframe {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          border: 0;
          background: #000;
        }
        .rich-editor-content .rits-media-frame audio {
          display: block;
          width: 100%;
          padding: 14px;
        }
        .rich-editor-content .rits-media-frame a {
          display: block;
          padding: 14px 16px;
          text-decoration: none;
        }
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
