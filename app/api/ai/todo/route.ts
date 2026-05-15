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
  const trimmed = base.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;
}

function normalizeCustomFields(fields: unknown) {
  if (!Array.isArray(fields)) return [] as Array<{ key: string; value: string }>;
  return fields
    .map((field) => {
      if (!field || typeof field !== "object") return null;
      const key = String((field as { key?: unknown }).key ?? "").trim();
      const value = String((field as { value?: unknown }).value ?? "").trim();
      return key || value ? { key, value } : null;
    })
    .filter((field): field is { key: string; value: string } => field !== null);
}

function extractJsonObject(input: string) {
  const fencedMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fencedMatch?.[1] ?? input).trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI returned invalid JSON.");
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
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
      mode?: "describe" | "build";
      prompt?: string;
      todo?: {
        title?: string;
        description?: string;
        priority?: string;
        customFields?: Array<{ key?: string; value?: string }>;
      };
    };

    const mode = body.mode ?? "describe";
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt cannot be empty." }, { status: 400 });
    }

    const todo = body.todo ?? {};
    const currentFields = normalizeCustomFields(todo.customFields);
    const currentContext = [
      todo.title ? `Title: ${todo.title}` : null,
      todo.description ? `Description: ${todo.description}` : null,
      todo.priority ? `Priority: ${todo.priority}` : null,
      currentFields.length
        ? `Custom fields: ${currentFields
            .map((field) => `${field.key}: ${field.value}`)
            .join(" | ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt =
      mode === "build"
        ? [
            "You are an expert task-planning assistant inside a todo app.",
            "Turn the user's prompt into one actionable todo.",
            currentContext ? `Current draft context:\n${currentContext}` : "There is no existing draft context.",
            'Return only valid JSON with this exact shape: {"title":"string","description":"string","priority":"high|medium|low","customFields":[{"key":"string","value":"string"}]}',
            "Keep the title concise. Keep the description practical. Use 0 to 5 custom fields.",
          ].join("\n")
        : [
            "You are an expert writing assistant inside a todo app.",
            currentContext ? `Current draft context:\n${currentContext}` : "There is no existing draft context.",
            "Write or improve the todo description based on the user's prompt.",
            "Return only the description text. No JSON, no code fences, no preamble.",
          ].join("\n");

    const response = await fetch(chatUrl(XAI_API_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: mode === "build" ? 0.3 : 0.5,
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
    if (!result) {
      throw new Error("AI returned an empty response.");
    }

    if (mode === "build") {
      const parsed = extractJsonObject(result) as {
        title?: unknown;
        description?: unknown;
        priority?: unknown;
        customFields?: unknown;
      };
      const priority = ["high", "medium", "low"].includes(String(parsed.priority))
        ? String(parsed.priority)
        : "medium";
      const todoDraft = {
        title: String(parsed.title ?? "").trim(),
        description: String(parsed.description ?? "").trim(),
        priority,
        customFields: normalizeCustomFields(parsed.customFields),
      };
      if (!todoDraft.title) {
        throw new Error("AI did not return a usable todo title.");
      }
      return NextResponse.json({ todo: todoDraft });
    }

    return NextResponse.json({ description: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Todo AI assist failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
