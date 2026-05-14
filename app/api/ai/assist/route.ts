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
      contextType?: "note" | "idea";
    };

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt cannot be empty." }, { status: 400 });
    }

    const contextType = body.contextType ?? "note";
    const contextLabel = contextType === "idea" ? "idea description" : "note";
    const rawContext = (body.context ?? "").trim();

    // Strip HTML tags for cleaner context
    const plainContext = rawContext.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const systemPrompt = [
      `You are an expert writing assistant embedded in a note-taking and idea-management app.`,
      `The user is currently editing a ${contextLabel}.`,
      plainContext
        ? `Here is the current content of the ${contextLabel} (use this as context):\n\n"""\n${plainContext.slice(0, 8000)}\n"""`
        : `The ${contextLabel} is currently empty.`,
      ``,
      `Follow the user's instruction precisely. Return only the written content  no preamble, no meta commentary, no markdown code fences unless the user asks for code.`,
      `Format your response as clean rich text: use paragraphs, bullet points, headings, or numbered lists as appropriate for the content.`,
      `If the user asks you to improve, rewrite, summarise, expand, or continue the existing content, do so relative to the context provided.`,
    ].join("\n");

    const response = await fetch(chatUrl(XAI_API_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
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

    const result = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!result) throw new Error("AI returned an empty response.");

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI assist failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
