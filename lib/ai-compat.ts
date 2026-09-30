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
  /** OpenRouter بلا AI_MODEL: نختار تلقائياً من النماذج المجانية المتاحة الآن */
  autoFree?: boolean;
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
  const model = process.env.AI_MODEL?.trim();
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    model: model || (openrouter ? "" : "llama-3.3-70b-versatile"),
    autoFree: openrouter && !model,
  };
}

/* ───────── اختيار نموذج مجاني تلقائياً على OpenRouter ─────────
   قائمة النماذج المجانية تتغيّر باستمرار، فنسألها من OpenRouter نفسه
   ونأخذ أفضل ثلاثة تدعم الأدوات، مع تخزين مؤقت لساعة. */

interface OrModel {
  id: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
}

const PREFERRED = [/llama-3\.3-70b/, /qwen.*(235b|72b|32b)/, /deepseek.*(v3|chat)/, /llama-4/, /mistral.*(small|medium)/, /gemma-3.*27b/];
let freeCache: { at: number; ids: string[] } | null = null;

async function freeModels(cfg: CompatConfig): Promise<string[]> {
  if (freeCache && Date.now() - freeCache.at < 60 * 60 * 1000 && freeCache.ids.length) return freeCache.ids;
  try {
    const res = await fetch(`${cfg.baseUrl}/models`, { signal: AbortSignal.timeout(15_000) });
    const data = (await res.json()) as { data?: OrModel[] };
    const free = (data.data ?? []).filter(
      (m) =>
        (m.id.endsWith(":free") || (m.pricing?.prompt === "0" && m.pricing?.completion === "0")) &&
        m.supported_parameters?.includes("tools"),
    );
    const rank = (m: OrModel) => {
      const i = PREFERRED.findIndex((re) => re.test(m.id));
      return (i === -1 ? PREFERRED.length : i) * 1e7 - (m.context_length ?? 0) / 1e3;
    };
    const ids = free.sort((a, b) => rank(a) - rank(b)).slice(0, 3).map((m) => m.id);
    if (ids.length) freeCache = { at: Date.now(), ids };
    return ids;
  } catch {
    return freeCache?.ids ?? [];
  }
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
  let models: string[] = [cfg.model];
  if (cfg.autoFree) {
    models = await freeModels(cfg);
    if (!models.length) {
      const err = new Error("no free models") as Error & { status: number; detail: string };
      err.status = 0;
      err.detail = "لم نجد الآن نموذجاً مجانياً على OpenRouter يدعم الأدوات — حاول لاحقاً أو اضبط AI_MODEL";
      throw err;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: models[0],
        // OpenRouter ينتقل تلقائياً إلى التالي إن تعذّر الأول
        ...(models.length > 1 ? { models } : {}),
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
    // نموذج سُحب أو ضُغط: نعيد جلب القائمة في الطلب القادم
    if (cfg.autoFree && (res.status === 404 || res.status === 429)) freeCache = null;
    throw err;
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  const content: Record<string, unknown>[] = [];
  // بعض النماذج المجانية تكتب تفكيرها داخل <think> في نص الرد — نحذفه قبل العرض
  const text = typeof msg.content === "string" ? msg.content.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim() : "";
  if (text) content.push({ type: "text", text });
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
