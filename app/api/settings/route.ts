import { db, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canManageSystem } from "@/lib/access";
import { escalationRules } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** حفظ مستويات سُلّم التصعيد */
export async function PUT(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageSystem(me)) throw new ForbiddenError("ضبط التصعيد من صلاحية مدير النظام");
    const { levels } = await body<{ levels: number[] }>(request);
    if (!Array.isArray(levels) || levels.length !== escalationRules.length || levels.some((l) => ![0, 1, 2, 3].includes(l))) {
      throw new Error("مستويات التصعيد غير صحيحة");
    }
    await (await db()).collection("settings").updateOne({ id: "escalation" }, { $set: { id: "escalation", levels } }, { upsert: true });
    await writeAudit(me.id, "عدّل مستويات سُلّم التصعيد", levels.join("·"), ipOf(request));
    return { ok: true, levels };
  });
}
