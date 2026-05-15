"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Copy, ExternalLink, ImageIcon, Link as LinkIcon, GripHorizontal } from "lucide-react";
import { useMemo, useRef } from "react";
import { toast } from "sonner";

type ImageAttrs = {
  src: string;
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  displayMode?: "image" | "link";
};

function getFigureAttrs(element: HTMLElement): ImageAttrs {
  const image = element.querySelector("img");
  const anchor = element.querySelector("a");
  const src =
    element.getAttribute("data-src") ??
    image?.getAttribute("src") ??
    anchor?.getAttribute("href") ??
    "";
  const widthValue = Number(element.getAttribute("data-width") ?? image?.getAttribute("data-width") ?? image?.getAttribute("width") ?? "");
  return {
    src,
    alt: element.getAttribute("data-alt") ?? image?.getAttribute("alt") ?? null,
    title: element.getAttribute("data-title") ?? image?.getAttribute("title") ?? anchor?.textContent ?? null,
    width: Number.isFinite(widthValue) && widthValue > 0 ? widthValue : null,
    displayMode: (element.getAttribute("data-display-mode") as "image" | "link" | null) ?? "image",
  };
}

function RitsImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const attrs = node.attrs as ImageAttrs;
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const widthStyle = useMemo(() => {
    if (!attrs.width) return undefined;
    return `${attrs.width}px`;
  }, [attrs.width]);

  const startResize = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeStateRef.current = { startX: event.clientX, startWidth: attrs.width ?? 420 };

    const handleMove = (moveEvent: MouseEvent) => {
      if (!resizeStateRef.current) return;
      const nextWidth = Math.max(180, Math.min(960, resizeStateRef.current.startWidth + (moveEvent.clientX - resizeStateRef.current.startX)));
      updateAttributes({ width: Math.round(nextWidth) });
    };

    const handleUp = () => {
      resizeStateRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const copyUrl = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(attrs.src);
      toast.success("Image URL copied.");
    } catch {
      toast.error("Failed to copy image URL.");
    }
  };

  const toggleDisplay = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    updateAttributes({ displayMode: attrs.displayMode === "link" ? "image" : "link" });
  };

  return (
    <NodeViewWrapper
      className={`group/rits-image relative my-5 ${selected ? "ring-2 ring-[var(--accent-blue)] ring-offset-2 ring-offset-[var(--surface-card)]" : ""}`}
      data-drag-handle
      style={{ width: widthStyle, maxWidth: "100%" }}
    >
      <div
        className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border px-1.5 py-1 opacity-0 transition-opacity group-hover/rits-image:opacity-100"
        style={{ backgroundColor: "color-mix(in srgb, var(--surface-card) 92%, transparent)", borderColor: "var(--hairline-strong)", backdropFilter: "blur(10px)" }}
      >
        <button type="button" onClick={copyUrl} className="rounded-full p-1 transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }} aria-label="Copy image URL">
          <Copy size={12} />
        </button>
        <button type="button" onClick={toggleDisplay} className="rounded-full p-1 transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }} aria-label={attrs.displayMode === "link" ? "Show as image" : "Show as link"}>
          {attrs.displayMode === "link" ? <ImageIcon size={12} /> : <LinkIcon size={12} />}
        </button>
        <a href={attrs.src} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="rounded-full p-1 transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }} aria-label="Open image">
          <ExternalLink size={12} />
        </a>
      </div>

      {attrs.displayMode === "link" ? (
        <a
          href={attrs.src}
          target="_blank"
          rel="noreferrer"
          className="block rounded-2xl border px-4 py-3 text-sm no-underline transition-colors hover:bg-[var(--surface-elevated)]"
          style={{ borderColor: "var(--hairline-strong)", color: "var(--accent-blue)" }}
        >
          {attrs.title || attrs.alt || attrs.src}
        </a>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attrs.src}
          alt={attrs.alt ?? ""}
          title={attrs.title ?? undefined}
          className="block w-full rounded-2xl border object-contain"
          style={{ borderColor: "var(--hairline-strong)", maxWidth: "100%", height: "auto" }}
        />
      )}

      {attrs.displayMode !== "link" ? (
        <button
          type="button"
          onMouseDown={startResize}
          className="absolute bottom-3 right-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border opacity-0 transition-opacity group-hover/rits-image:opacity-100"
          style={{ backgroundColor: "color-mix(in srgb, var(--surface-card) 92%, transparent)", borderColor: "var(--hairline-strong)", color: "var(--ink)", backdropFilter: "blur(10px)" }}
          aria-label="Resize image"
        >
          <GripHorizontal size={12} />
        </button>
      ) : null}
    </NodeViewWrapper>
  );
}

export const RitsImage = Node.create({
  name: "ritsImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: null },
      title: { default: null },
      width: { default: 420 },
      displayMode: { default: "image" },
    };
  },

  parseHTML() {
    return [
      { tag: 'figure[data-rits-image="true"]', getAttrs: (element) => getFigureAttrs(element as HTMLElement) },
      { tag: 'img[data-rits-image="true"]', getAttrs: (element) => getFigureAttrs(element as HTMLElement) },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as ImageAttrs & Record<string, unknown>;
    const shared = {
      "data-rits-image": "true",
      "data-src": attrs.src,
      "data-alt": attrs.alt ?? "",
      "data-title": attrs.title ?? "",
      "data-width": attrs.width ? String(attrs.width) : "",
      "data-display-mode": attrs.displayMode ?? "image",
      class: "rits-image-block",
    };

    if (attrs.displayMode === "link") {
      return [
        "figure",
        mergeAttributes(shared),
        ["a", { href: attrs.src, target: "_blank", rel: "noopener noreferrer" }, attrs.title || attrs.alt || attrs.src],
      ];
    }

    return [
      "figure",
      mergeAttributes(shared),
      ["img", { src: attrs.src, alt: attrs.alt ?? "", title: attrs.title ?? "", width: attrs.width ? String(attrs.width) : undefined, style: attrs.width ? `width:${attrs.width}px;max-width:100%;height:auto;` : "max-width:100%;height:auto;" }],
    ];
  },

  addCommands() {
    return {
      setRitsImage:
        (attributes: ImageAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: attributes }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(RitsImageNodeView);
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ritsImage: {
      setRitsImage: (attributes: ImageAttrs) => ReturnType;
    };
  }
}
