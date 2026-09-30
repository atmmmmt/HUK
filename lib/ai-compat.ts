import "server-only";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * موصل لأي خدمة متوافقة مع واجهة OpenAI — تعمل عليها النماذج المفتوحة المصدر:
 * Groq (مجاني بحدود يومية)، Ollama (محلي بلا حدود)، OpenRouter، وغيرها.
 *
 * المتصفح يحتفظ بالمحادثة بصيغة واحدة دائماً، وهنا نترجمها ذهاباً وإياباً،
 * فيبقى المساعد نفسه مهما تغيّر المزوّد.
 */

type Msg = Anthropic.Beta.BetaMessageParam;
type Tool = Anthropic.Beta.BetaTool;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

export interface CompatConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

/**
 * يكفي ضبط AI_API_KEY: نعرف المزوّد من بادئة المفتاح ونختار نموذجاً مجانياً مفتوح المصدر.
 * sk-or- ← OpenRouter · gsk_ ← Groq. ويمكن تجاوز أي منهما بـ AI_BASE_URL و AI_MODEL.
 */
export function compatConfig(): CompatConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim() || undefined;
  const openrouter = apiKey?.startsWith("sk-or-");
  const baseUrl =
    process.env.AI_BASE_URL?.trim() ||
    (openrouter ? "https://openrouter.ai/api/v1" : apiKey ? "https://api.groq.com/openai/v1" : "");
  if (!baseUrl) return null;
  const defaultModel = openrouter ? "meta-llama/llama-3.3-70b-instruct:free" : "llama-3.3-70b-versatile";
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    model: process.env.AI_MODEL?.trim() || defaultModel,
  };
}

function toChat(system: string, messages: Msg[]): ChatMessage[] {
  const out: ChatMessage[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      const text = m.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
      const calls = m.content
        .filter((b) => b.type === "tool_use")
        .map((b) => {
          const u = b as { id: string; name: string; input: unknown };
          return { id: u.id, type: "function" as const, function: { name: u.name, arguments: JSON.stringify(u.input ?? {}) } };
        });
      out.push({ role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      for (const b of m.content) {
        if (b.type === "tool_result") {
          const r = b as { tool_use_id: string; content?: unknown };
          out.push({ role: "tool", tool_call_id: r.tool_use_id, content: typeof r.content === "string" ? r.content : JSON.stringify(r.content ?? "") });
        } else if (b.type === "text") {
          out.push({ role: "user", content: (b as { text: string }).text });
        }
      }
    }
  }
  return out;
}

export async function compatChat(cfg: CompatConfig, system: string, messages: Msg[], tools: Tool[]) {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 1500,
        messages: toChat(system, messages),
        tools: tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.input_schema },
        })),
        tool_choice: "auto",
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    // لم يصل الطلب أصلاً: حجب شبكة، اسم خادم خاطئ، أو انتهاء المهلة
    const cause = (e as { cause?: { code?: string } }).cause?.code ?? (e instanceof Error ? e.name : "");
    const err = new Error(`تعذّر اتصال الخادم بـ ${new URL(cfg.baseUrl).host}${cause ? ` (${cause})` : ""}`) as Error & { status: number; detail: string };
    err.status = 0;
    err.detail = err.message;
    throw err;
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let detail = raw;
    try {
      const j = JSON.parse(raw);
      detail = j?.error?.metadata?.raw || j?.error?.message || j?.message || raw;
    } catch { /* نص عادي */ }
    const err = new Error(`compat ${res.status}: ${String(detail).slice(0, 300)}`) as Error & { status: number; detail: string };
    err.status = res.status;
    err.detail = `${res.status} — ${String(detail).slice(0, 220)}`;
    throw err;
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  const content: Record<string, unknown>[] = [];
  if (typeof msg.content === "string" && msg.content.trim()) content.push({ type: "text", text: msg.content.trim() });
  for (const c of msg.tool_calls ?? []) {
    let input: unknown = {};
    try {
      input = c.function?.arguments ? JSON.parse(c.function.arguments) : {};
    } catch {
      input = {};
    }
    content.push({ type: "tool_use", id: c.id || `call_${Math.random().toString(36).slice(2, 10)}`, name: c.function?.name, input });
  }
  const stop_reason = content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn";
  return { content, stop_reason };
}
