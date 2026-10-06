import { clean, cleanAll, collections, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canAccessSection, canManageSystem } from "@/lib/access";
import type { Entity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const me = await requireUser();
    const canListAll =
      canManageSystem(me) ||
      canAccessSection(me, "directorates", "entities") ||
      canAccessSection(me, "directorates", "performance");
    const col = await collections.entities();
    const entities = canListAll
      ? await col.find().toArray()
      : await col.find({ id: me.entityId }).toArray();
    return { entities: cleanAll(entities) };
  });
}

/** إضافة جهة جديدة — من لوحة التحكم، دون أي تدخل برمجي */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageSystem(me)) throw new ForbiddenError("إضافة الجهات من صلاحية مدير النظام");

    const input = await body<{ name: string; kind: Entity["kind"]; units: string[]; managerId?: string }>(request);
    const name = input.name?.trim();
    if (!name) throw new Error("اسم الجهة مطلوب");

    const col = await collections.entities();
    if (await col.findOne({ name })) throw new Error("توجد جهة بهذا الاسم مسبقاً");

    const count = await col.countDocuments();
    const entity: Entity = {
      id: "e" + (count + 1) + Date.now().toString().slice(-4),
      name,
      short: name.replace(/^مديرية |^المؤسسة العامة لل|^دائرة /, ""),
      kind: input.kind ?? "مديرية",
      managerId: input.managerId ?? me.id,
      units: (input.units ?? []).map((u) => u.trim()).filter(Boolean),
      staffCount: 0,
      active: true,
      compliance: 100,
      openTasks: 0,
      lateTasks: 0,
      accent: (["navy", "gold", "teal", "plum"] as const)[count % 4],
    };

    await col.insertOne(entity);
    await writeAudit(me.id, "أضاف جهة جديدة", name, ipOf(request));
    return { ok: true, entity };
  });
}

/** تفعيل أو تعطيل جهة — لا حذف، حفاظاً على بياناتها */
export async function PATCH(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageSystem(me)) throw new ForbiddenError("تعديل الجهات من صلاحية مدير النظام");

    const { id, active } = await body<{ id: string; active: boolean }>(request);
    const col = await collections.entities();
    const current = await col.findOne({ id });
    if (!current) throw new Error("الجهة غير موجودة");

    await col.updateOne({ id }, { $set: { active } });
    await writeAudit(me.id, active ? "فعّل جهة" : "عطّل جهة", current.name, ipOf(request));

    const after = await col.findOne({ id });
    return { ok: true, entity: after ? clean(after) : null };
  });
}
