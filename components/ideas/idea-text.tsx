import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

function sanitizeIdeaLine(line: string) {
  return line
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

export function getIdeaTitle(title: string, description: string) {
  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    return trimmedTitle;
  }

  const fallback = description
    .split("\n")
    .map(sanitizeIdeaLine)
    .find(Boolean);

  return fallback ? fallback.slice(0, 120) : "";
}

export function IdeaDescription({
  description,
  className,
  style,
}: {
  description: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p className={cn("whitespace-pre-line break-words", className)} style={style}>
      {description}
    </p>
  );
}
