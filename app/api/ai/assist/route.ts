import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const XAI_API_KEY = process.env.XAI_API_KEY ?? process.env.GROK_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL ?? process.env.GROK_MODEL ?? "grok-beta";
const XAI_API_URL =
  process.env.XAI_API_URL ??
  process.env.GROK_API_URL ??
  "https://api.x.ai/v1/chat/completions";

function chatUrl(base: string) {
  const t = base.trim().replace(/\/+$/, "");
  return t.endsWith("/chat/completions") ? t : `${t}/chat/completions`;
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n[Context truncated to fit model limits.]`;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: "AI assist is not configured (missing XAI_API_KEY)." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      prompt?: string;
      context?: string;
      contextType?: "note" | "idea" | "roadmap" | "database-design";
    };

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt cannot be empty." }, { status: 400 });
    }

    const contextType = body.contextType ?? "note";
    const contextLabel = contextType === "idea" ? "idea description" : contextType === "roadmap" ? "roadmap data" : contextType === "database-design" ? "database blocks" : "note";
    const rawContext = (body.context ?? "").trim();

    // Strip HTML tags for cleaner context unless it's a roadmap or database-design
    const normalizedContext = (contextType === "roadmap" || contextType === "database-design") ? rawContext : rawContext.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const plainContext = truncateText(normalizedContext, (contextType === "roadmap" || contextType === "database-design") ? 5000 : 6500);
    const safePrompt = truncateText(prompt, (contextType === "roadmap" || contextType === "database-design") ? 2500 : 3500);
    const maxTokens = contextType === "roadmap" ? 2200 : contextType === "database-design" ? 4000 : 1800;

    const systemPrompt = [
      `You are an expert ${contextType === "roadmap" ? "roadmap generator" : contextType === "database-design" ? "UI and database designer" : "writing assistant"} embedded in a productivity app.`,
      `The user is currently editing a ${contextLabel}.`,
      plainContext
        ? `Here is the current content of the ${contextLabel} (use this as context):\n\n"""\n${(contextType === "roadmap" || contextType === "database-design") ? plainContext : plainContext.slice(0, 8000)}\n"""`
        : `The ${contextLabel} is currently empty.`,
      ``,
      `Follow the user's instruction precisely. Return only the requested content  no preamble, no meta commentary${(contextType === "roadmap" || contextType === "database-design") ? "." : ", and absolutely no markdown code fences unless the user asks for code."}`,
      contextType === "database-design" ? `The user is requesting design changes to the provided JSON object. You must return ONLY a valid JSON ARRAY containing the updated 'blocks' array. Keep the 'id', 'fieldKey', and 'label' fields intact. Adjust 'x', 'y', 'w', 'h', 'shape', 'accent', 'kind' properties to beautify and format the layout. Do NOT wrap the JSON in markdown code blocks. Ensure the output is a raw JSON array of objects.` : contextType === "roadmap" ? "" : `Format your response using ONLY plain HTML tags (e.g. <p>, <strong>, <em>, <ul>, <li>, <h1>). DO NOT use Markdown formatting (like **, -, #). For nested lists, ensure strict HTML (the nested <ul> MUST be inside an <li> element).`,
      `If the user asks you to improve, rewrite, summarise, expand, or continue the existing content, do so relative to the context provided.`,
    ].filter(Boolean).join("\n");

    const response = await fetch(chatUrl(XAI_API_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.4,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: safePrompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = (await response.text()).trim();
      throw new Error(text || `AI request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    let result = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (contextType === "database-design") {
      result = result
        .replace(/^```(?:json)?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();
    } else if (contextType !== "roadmap") {
      result = result
        .replace(/^```(?:html|xml)?\n?/i, "")
        .replace(/\n?```$/i, "")
        .replace(/>\s+</g, "><")
        .trim();
    }
    if (!result) {
      console.error("AI returned empty. Full response:", JSON.stringify(data));
      throw new Error("AI returned an empty response.");
    }

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI assist failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
