import { collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canSubmitDecision, canSubmitDecisionForAnyEntity, clearanceRank } from "@/lib/access";
import type { Decision, Priority } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITIES: Priority[] = ["عادي", "هام", "عاجل", "عاجل جداً"];
const SIGNERS = ["governor", "deputy", "assistant"] as const;

/** رفع معاملة جديدة إلى صندوق التوقيع (تُرفق مستنداتها بعد الإنشاء) */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canSubmitDecision(me)) throw new ForbiddenError("رفع المعاملات للتوقيع من صلاحية مدراء الجهات والديوان");
    const input = await body<{ title?: string; note?: string; amount?: string; priority?: Priority; awaiting?: string; entityId?: string; classification?: string }>(request);

    const title = input.title?.trim().slice(0, 200);
    if (!title) throw new Error("عنوان المعاملة مطلوب");
    const awaiting = (SIGNERS as readonly string[]).includes(String(input.awaiting)) ? input.awaiting as Decision["awaiting"] : "governor";
    const classification = input.classification === "سرّي" ? "سرّي" : "عادي";
    if (clearanceRank(classification) > clearanceRank(me.clearance)) throw new ForbiddenError("لا ترفع معاملة بدرجة أعلى من تصريحك");

    // الأصل أن المستخدم يرفع باسم جهته. اختيار جهة أخرى محصور بقيادة الديوان المخوّلة.
    let entityId = me.entityId;
    if (input.entityId && input.entityId !== me.entityId && !canSubmitDecisionForAnyEntity(me)) {
      throw new ForbiddenError("لا يمكنك رفع معاملة باسم جهة أخرى");
    }
    if (input.entityId && canSubmitDecisionForAnyEntity(me)) {
      const ent = await (await collections.entities()).findOne({ id: input.entityId });
      if (!ent) throw new Error("الجهة غير موجودة");
      entityId = input.entityId;
    }
    const entity = await (await collections.entities()).findOne({ id: entityId });

    const decision: Decision = {
      id: "d" + Date.now() + Math.floor(Math.random() * 1000),
      title,
      source: String(entity?.name ?? me.title),
      entityId,
      age: "الآن",
      priority: PRIORITIES.includes(input.priority as Priority) ? input.priority as Priority : "هام",
      awaiting,
      ...(input.amount?.trim() ? { amount: input.amount.trim().slice(0, 60) } : {}),
      ...(input.note?.trim() ? { note: input.note.trim().slice(0, 1000) } : {}),
      submittedBy: me.id,
      classification,
    };
    await (await collections.decisions()).insertOne({ ...decision });

    const signers = await (await collections.users()).find({ role: awaiting, active: { $ne: false } }).toArray();
    for (const s of signers) {
      await pushNotification({
        kind: "تصعيد", title: "معاملة جديدة بانتظار توقيعكم", body: `«${title}» — من ${decision.source}`,
        channel: "تنبيه التطبيق", toId: String(s.id), link: { portal: "diwan", section: "decisions" },
        urgent: decision.priority === "عاجل" || decision.priority === "عاجل جداً",
      });
    }
    await writeAudit(me.id, "رفع معاملة إلى صندوق التوقيع", title, ipOf(request));
    return { ok: true, decision };
  });
}
