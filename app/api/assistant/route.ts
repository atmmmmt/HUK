import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { assistantTools } from "@/lib/assistant-tools";
import { guideAsText, roleGuides } from "@/lib/guide";
import { navByPortal } from "@/lib/nav";
import type { RoleKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5-5";

const sitemap = (Object.keys(navByPortal) as (keyof typeof navByPortal)[])
  .map((p) => navByPortal[p].map((n) => `/${p}/${n.key}/ — ${n.label}: ${n.sub}`).join("\n"))
  .join("\n");

/** الجزء الثابت من التعليمات — يُخزَّن مؤقتاً لأنه لا يتغيّر بين الطلبات */
const STABLE_SYSTEM = `أنت «المساعد الذكي» في منظومة العمل التنفيذي لمحافظة حلب.
مهمتك: أن يصل أي مستخدم إلى ما يريده دون أن يضيع. تفهم طلبه بأي لهجة عربية، وتبحث، وتفتح الشاشة المناسبة، وتنفّذ الإجراء عنه.

قواعد العمل:
- أجب بالعربية وبإيجاز، بلهجة المستخدم إن كتب بالعامية. جملتان أو ثلاث تكفي غالباً.
- استخدم الأدوات لتجلب البيانات الحقيقية قبل أن تجيب عن أي رقم أو حالة. لا تخمّن.
- إذا طلب المستخدم فتح شيء أو كان الجواب أوضح على الشاشة، استخدم navigate.
- الأدوات التي تغيّر البيانات تعرض على المستخدم بطاقة تأكيد؛ اطلبها مباشرة حين يكون الطلب واضحاً، ولا تسأله «هل أنت متأكد» نصاً — البطاقة تكفي.
- إن رُفض الإجراء (من المستخدم أو لعدم الصلاحية) فأخبره بلطف بالسبب وما البديل.
- لا تعِد بما لا تستطيعه أدواتك (مثل إنشاء حساب أو حذف بيانات)؛ دُلّه على الشاشة والخطوات من الدليل.
- كل ما تنفّذه يُسجَّل في سجل التدقيق باسم المستخدم.

خريطة الشاشات:
${sitemap}
/guide/ — دليل الاستخدام

دليل الاستخدام الكامل:
${guideAsText()}`;

let client: Anthropic | null = null;

export async function POST(request: Request) {
  let me;
  try {
    me = await requireUser();
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "انتهت الجلسة — يرجى تسجيل الدخول" }, { status: 401 });
    return NextResponse.json({ error: "تعذّر التحقق من الجلسة" }, { status: 503 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "المساعد الذكي غير مفعّل بعد — يلزم ضبط مفتاح ANTHROPIC_API_KEY على الخادم." }, { status: 503 });
  }

  let body: { messages?: Anthropic.Beta.BetaMessageParam[]; page?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "صيغة الطلب غير صحيحة" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-60) : [];
  if (!messages.length || messages[0].role !== "user") {
    return NextResponse.json({ error: "المحادثة فارغة" }, { status: 400 });
  }

  const role = roleGuides[me.role as RoleKey];
  const context = `المستخدم الحالي: ${me.name} — ${me.title} (الدور: ${role?.title ?? me.role}، المعرّف ${me.id}).
الشاشة المفتوحة الآن: ${String(body.page ?? "/").slice(0, 120)}
التاريخ: ${new Date().toLocaleDateString("ar-SY", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

  client ??= new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [
        { type: "text", text: STABLE_SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: context },
      ],
      tools: assistantTools,
      messages,
    });
    return NextResponse.json({ content: response.content, stop_reason: response.stop_reason });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "المساعد مشغول حالياً — حاول بعد لحظات." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[assistant] invalid API key");
      return NextResponse.json({ error: "مفتاح المساعد غير صالح — راجع مدير النظام." }, { status: 503 });
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error("[assistant] bad request:", err.message);
      return NextResponse.json({ error: "تعذّر فهم المحادثة — ابدأ محادثة جديدة." }, { status: 400 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[assistant] API error", err.status, err.message);
      return NextResponse.json({ error: "تعذّر الوصول إلى المساعد — حاول لاحقاً." }, { status: 502 });
    }
    console.error("[assistant]", err);
    return NextResponse.json({ error: "تعذّر الوصول إلى المساعد — تحقق من الاتصال." }, { status: 502 });
  }
}
