import { clean, collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canAdvance, seesAssignment } from "@/lib/access";
import type { Assignment, AssignmentStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stampNow = () =>
  new Date().toLocaleString("ar-SY", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await params;
    const patch = await body<{ status?: AssignmentStatus; progress?: number }>(request);

    const col = await collections.assignments();
    const current = await col.findOne({ id });
    if (!current) throw new Error("التكليف غير موجود");

    const people = await (await collections.users()).find({}, { projection: { passwordHash: 0 } }).toArray();
    if (!seesAssignment(me, current as unknown as Assignment, { people })) {
      throw new ForbiddenError("هذا التكليف خارج نطاق رؤيتك");
    }

    const update: Record<string, unknown> = {};

    // تحديث نسبة الإنجاز — للمكلَّف وحده
    if (typeof patch.progress === "number") {
      if (current.ownerId !== me.id) throw new ForbiddenError("نسبة الإنجاز يحدّثها المكلَّف نفسه");
      update.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
    }

    // تغيير الحالة — وفق مصفوفة الصلاحيات
    if (patch.status) {
      if (!canAdvance(me, current as unknown as Assignment, patch.status)) {
        throw new ForbiddenError(`صفتك «${me.title}» لا تملك نقل التكليف إلى حالة «${patch.status}»`);
      }
      update.status = patch.status;
      const at = stampNow();
      if (patch.status === "مُستلَم") update["chain.acknowledged"] = at;
      if (patch.status === "قيد التنفيذ") update["chain.started"] = at;
      if (patch.status === "قيد المراجعة") {
        update["chain.submitted"] = at;
        update.progress = Math.max(current.progress, 90);
      }
      if (patch.status === "مُغلق") update.progress = 100;
    }

    if (!Object.keys(update).length) throw new Error("لا يوجد تغيير مطلوب");

    await col.updateOne({ id }, { $set: update });
    const after = await col.findOne({ id });

    await writeAudit(
      me.id,
      patch.status ? `نقل التكليف إلى «${patch.status}»` : "حدّث نسبة الإنجاز",
      current.ref,
      ipOf(request),
    );

    // إشعارات تتبع الحدث
    if (patch.status === "قيد المراجعة") {
      const chief = people.find((p) => p.role === "chief");
      if (chief) {
        await pushNotification({
          kind: "تكليف", title: "تسليم بانتظار الاعتماد",
          body: `«${current.title}» سُلّم وينتظر اعتمادك.`,
          channel: "تنبيه التطبيق", toId: chief.id,
          link: { portal: "diwan", section: "assignments" },
        });
      }
    }
    if (patch.status === "مُعاد للتصحيح" || patch.status === "مُغلق") {
      await pushNotification({
        kind: "تكليف",
        title: patch.status === "مُغلق" ? "اعتُمد تكليفك وأُغلق" : "أُعيد تكليفك للتصحيح",
        body: `«${current.title}»`,
        channel: "تنبيه التطبيق", toId: current.ownerId,
        link: { portal: "directorates", section: "inbox" },
        urgent: patch.status === "مُعاد للتصحيح",
      });
    }

    return { ok: true, assignment: after ? clean(after) : null };
  });
}
