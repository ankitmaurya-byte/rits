import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

import { api } from "@/convex/_generated/api";

type SharedItem = {
  id: string;
  type: "folder" | "link";
  title: string;
  url?: string;
  parentId: string | null;
  createdAt: string;
  description?: string;
};

function getColumnLayout(folders: SharedItem[], links: SharedItem[]) {
  const total = folders.length + links.length;
  if (total <= 10) return { mode: "single" as const, folderHeight: null, linkHeight: null };
  if (folders.length <= 5 && links.length > 10) return { mode: "split" as const, folderHeight: "20%", linkHeight: "80%" };
  return { mode: "split" as const, folderHeight: "50%", linkHeight: "50%" };
}

export default async function SharedResourcesPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  let share;

  try {
    share = await fetchQuery(api.resources.getPublicFolderShare, { shareToken });
  } catch {
    notFound();
  }

  let payload: { title: string; items: SharedItem[] } | null = null;
  try {
    payload = JSON.parse(share.payload) as { title: string; items: SharedItem[] };
  } catch {
    notFound();
  }

  if (!payload) notFound();

  const columns: Array<{ title: string; items: SharedItem[] }> = [];
  let currentParentId: string | null = null;
  let currentTitle = payload.title;

  while (true) {
    const items = payload.items
      .filter((item) => item.parentId === currentParentId)
      .sort((left, right) => {
        if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
        return left.title.localeCompare(right.title);
      });
    columns.push({ title: currentTitle, items });
    const nextFolder = items.find((item) => item.type === "folder");
    if (!nextFolder) break;
    currentParentId = nextFolder.id;
    currentTitle = nextFolder.title;
    if (columns.length > 6) break;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000", padding: "16px", color: "#fcfdff" }}>
      <div style={{ margin: "0 auto", maxWidth: "1440px" }}>
        <div style={{ marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.46)" }}>Shared resource folder</p>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.1, fontWeight: 500 }}>{payload.title}</h1>
        </div>

        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {columns.map((column) => {
            const folders = column.items.filter((item) => item.type === "folder");
            const links = column.items.filter((item) => item.type === "link");
            const layout = getColumnLayout(folders, links);

            return (
              <div key={column.title} style={{ width: 300, minWidth: 300, height: "calc(100vh - 140px)", minHeight: 520, display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, backgroundColor: "#0a0a0c" }}>
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>{column.title}</div>
                <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
                  {column.items.length === 0 ? (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "rgba(255,255,255,0.56)", fontSize: 14 }}>No resources here</div>
                  ) : layout.mode === "single" ? (
                    <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                      {[...folders, ...links].map((item) => (
                        <a key={item.id} href={item.type === "link" ? item.url : undefined} target={item.type === "link" ? "_blank" : undefined} rel="noreferrer" style={{ textDecoration: "none", color: "inherit", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, backgroundColor: "#101012", display: "block" }}>
                          <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.type === "folder" ? "Folder" : item.url}</div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, backgroundColor: "#06060a" }}>
                      <div style={{ height: layout.folderHeight ?? undefined, minHeight: 0, padding: 8 }}>
                        <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                          {folders.map((item) => (
                            <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, backgroundColor: "#101012" }}>
                              <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ margin: "0 12px", height: 1, backgroundColor: "rgba(255,128,31,0.4)" }} />
                      <div style={{ height: layout.linkHeight ?? undefined, minHeight: 0, padding: 8 }}>
                        <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                          {links.map((item) => (
                            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, backgroundColor: "#101012", display: "block" }}>
                              <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                              <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.url}</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
