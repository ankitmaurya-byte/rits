import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  if (!file) {
    return new Response("Missing file", { status: 400 });
  }

  const normalized = file.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    return new Response("Invalid path", { status: 400 });
  }

  const fullPath = path.join(process.cwd(), "lib", "shark-tank-india", "season4", normalized);

  try {
    const bytes = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return new Response(bytes, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
