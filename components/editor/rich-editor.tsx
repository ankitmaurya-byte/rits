"use client";

import { useEffect, useCallback } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
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
} from "lucide-react";

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

function Toolbar({ editor }: { editor: Editor }) {
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
}

export function RichEditor({
  content,
  onChange,
  placeholder = "Start writing…",
  minHeight = "300px",
  showCount = true,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes heading, bold, italic, strike, code, blockquote,
        // lists, codeBlock, horizontalRule, hardBreak, history — all covered.
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
      // transformPastedHTML — we just make sure it's not stripped.
      transformPastedHTML(html) {
        return html;
      },
    },
  });

  // Sync when switching notes / ideas
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || "", false);
    }
  }, [content, editor]);

  const words = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0;
  const chars = editor ? editor.getText().length : 0;

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--surface-card)",
        border: "1px solid var(--hairline-strong)",
      }}
    >
      {/* Toolbar */}
      {editor && <Toolbar editor={editor} />}

      {/* Editor body */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ minHeight }}
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>

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
