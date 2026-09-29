import { collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canApproveDecision } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** اعتماد قرار أو إعادته — صندوق التوقيع */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    if (!canApproveDecision(me)) {
      throw new ForbiddenError(`صفتك «${me.title}» لا تملك صلاحية الاعتماد`);
    }

    const { id } = await params;
    const { action } = await body<{ action: "approve" | "return" }>(request);

    const col = await collections.decisions();
    const current = await col.findOne({ id });
    if (!current) throw new Error("المعاملة غير موجودة");

    await col.deleteOne({ id });
    await writeAudit(
      me.id,
      action === "approve" ? "اعتمد قراراً" : "أعاد معاملة مع ملاحظات",
      current.title,
      ipOf(request),
    );

    const users = await collections.users();
    const director = await users.findOne({ entityId: current.entityId, role: "director" });
    if (director) {
      await pushNotification({
        kind: "تصعيد",
        title: action === "approve" ? "اعتُمدت معاملتكم" : "أُعيدت معاملتكم",
        body: `«${current.title}» — ${action === "approve" ? "اعتمدها" : "أعادها"} ${me.name}.`,
        channel: "تنبيه التطبيق",
        toId: director.id,
        link: { portal: "directorates", section: "replies" },
        urgent: action !== "approve",
      });
    }

    return { ok: true, id };
  });
}
