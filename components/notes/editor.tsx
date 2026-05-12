"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Quote,
  Code
} from "lucide-react";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const toggleStyle = (action: () => void, isActive: boolean) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        action();
      }}
      className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      type="button"
    >
      {/* Lucide icons will be rendered here as children */}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b" style={{ borderColor: "var(--hairline-strong)" }}>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <Italic size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('strike') ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <Strikethrough size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('code') ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <Code size={16} />
      </button>
      
      <div className="w-px h-4 mx-1" style={{ backgroundColor: "var(--hairline)" }} />
      
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <Heading1 size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <Heading2 size={16} />
      </button>
      
      <div className="w-px h-4 mx-1" style={{ backgroundColor: "var(--hairline)" }} />
      
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <List size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <ListOrdered size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('blockquote') ? 'bg-[#101012] text-white' : 'text-[#a1a4a5] hover:text-white hover:bg-[#101012]'}`}
      >
        <Quote size={16} />
      </button>
    </div>
  );
};

export function NoteEditor({ content, onChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      })
    ],
    content: content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Get HTML instead of text to preserve formatting
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[400px]",
      },
    },
  });

  // Sync external content changes (e.g., switching notes)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden" style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--hairline-strong)" }}>
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto" style={{ padding: "0" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}