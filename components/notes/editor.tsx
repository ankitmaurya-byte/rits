"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function NoteEditor({ content, onChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || "<p>Start writing...</p>",
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none min-h-[400px] focus:outline-none p-4",
      },
    },
  });

  // Sync external content changes (e.g., switching notes)
  useEffect(() => {
    if (editor && content !== editor.getText()) {
      editor.commands.setContent(content || "<p>Start writing...</p>");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <div className="border rounded-xl bg-white dark:bg-zinc-950 overflow-hidden min-h-[400px]">
      <EditorContent editor={editor} />
    </div>
  );
}