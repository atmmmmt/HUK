import { collections, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canManageSystem } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** تفعيل حساب أو تعطيله — لا حذف، حفاظاً على سجل التدقيق */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageSystem(me)) throw new ForbiddenError("إدارة الحسابات من صلاحية مدير النظام");
    const { id } = await params;
    const { active, contacted } = await body<{ active?: boolean; contacted?: boolean }>(request);

    const users = await collections.users();
    const u = await users.findOne({ id });
    if (!u) throw new Error("الحساب غير موجود");

    if (typeof contacted === "boolean") {
      await users.updateOne({ id }, { $set: { contacted } });
      await writeAudit(me.id, contacted ? "علّم صاحب الحساب بأنه تواصل" : "ألغى علامة التواصل", u.username, ipOf(request));
      return { ok: true, id, contacted };
    }

    if (id === me.id) throw new Error("لا يمكنك تعطيل حسابك");
    if (u.role === "governor" && !active) throw new ForbiddenError("حساب المحافظ محمي من التعطيل المباشر؛ يلزم إجراء نقل صلاحية إداري منفصل");

    await users.updateOne({ id }, { $set: { active: !!active } });
    await writeAudit(me.id, active ? "فعّل حساباً" : "عطّل حساباً", u.username, ipOf(request));
    return { ok: true, id, active: !!active };
  });
}
