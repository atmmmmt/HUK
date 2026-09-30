import { clean, collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canRespondRequest } from "@/lib/access";
import { arDate, validISO } from "@/lib/ops";
import type { Meeting, RequestItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Input =
  | { action: "approve" | "reject"; note?: string }
  | { action: "schedule" | "propose"; dayISO: string; time: string; note?: string };

/** الرد على طلب جهة: موافقة، رفض، تحديد موعد، أو اقتراح وقت بديل */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await params;
    const input = await body<Input>(request);

    const col = await collections.requests();
    const r = (await col.findOne({ id })) as RequestItem | null;
    if (!r) throw new Error("الطلب غير موجود");
    if (!canRespondRequest(me, r.kind)) throw new ForbiddenError("الرد على هذا الطلب خارج صلاحيتك");
    if (r.status !== "بانتظار الرد") throw new Error("تم الرد على هذا الطلب مسبقاً");

    const note = "note" in input && input.note?.trim() ? ` — ${input.note.trim()}` : "";
    let update: Partial<RequestItem> & Record<string, unknown> = {};
    let msg = "";
    let meeting: Meeting | null = null;

    if (input.action === "approve" || input.action === "reject") {
      update = { status: input.action === "approve" ? "موافق" : "مرفوض", detail: r.detail + note };
      msg = input.action === "approve" ? "تمت الموافقة على طلبك" : "رُفض طلبك";
    } else if (input.action === "schedule" || input.action === "propose") {
      if (!validISO(input.dayISO)) throw new Error("التاريخ غير صحيح");
      if (!/^\d{2}:\d{2}$/.test(input.time ?? "")) throw new Error("الوقت غير صحيح");
      const when = `${arDate(input.dayISO)} · ${input.time}`;
      if (input.action === "propose") {
        update = { detail: `${r.detail} · اقتُرح موعد: ${when}${note}` };
        msg = `اقتُرح موعد لطلبك: ${when}`;
      } else {
        update = { status: "موافق", detail: `${r.detail} · حُدّد الموعد: ${when}${note}` };
        msg = `حُدّد موعدك: ${when}`;
        const governor = await (await collections.users()).findOne({ role: "governor" });
        meeting = {
          id: "m" + Date.now(),
          title: r.title,
          kind: r.kind === "موعد لدى المحافظ" ? "مقابلة" : "اجتماع",
          day: arDate(input.dayISO),
          time: input.time,
          chairId: governor?.id ?? me.id,
          secretaryId: me.id,
          inviteeIds: [r.byId],
          confirmed: [],
          apologized: [],
          agenda: [r.title],
          minutesApproved: false,
          outcomes: [],
          status: "قادم",
          summary: r.detail,
        };
        await (await collections.meetings()).insertOne({ ...meeting });
      }
    } else {
      throw new Error("إجراء غير معروف");
    }

    await col.updateOne({ id }, { $set: update });
    await writeAudit(me.id, `ردّ على طلب (${r.kind}): ${msg}`, r.title, ipOf(request));
    await pushNotification({
      kind: r.kind === "حجز قاعة" ? "قاعة" : "مراسلة", title: msg, body: `«${r.title}»`,
      channel: "تنبيه التطبيق", toId: r.byId, link: { portal: "directorates", section: "requests" },
    });

    const after = await col.findOne({ id });
    return { ok: true, request: after ? clean(after) : null, meeting };
  });
}
