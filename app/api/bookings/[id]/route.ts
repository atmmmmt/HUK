import { clean, collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canApproveBooking } from "@/lib/access";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    if (!canApproveBooking(me)) {
      throw new ForbiddenError("تأكيد الحجوزات من صلاحية مشرف القاعات، مع استثناء المحافظ أو نائبه");
    }

    const { id } = await params;
    const { status } = await body<{ status: Booking["status"] }>(request);
    if (!["مؤكد", "مرفوض", "بانتظار الموافقة", "منتهٍ"].includes(status)) {
      throw new Error("حالة حجز غير معروفة");
    }

    const col = await collections.bookings();
    const current = await col.findOne({ id });
    if (!current) throw new Error("الحجز غير موجود");

    await col.updateOne({ id }, { $set: { status } });
    await writeAudit(me.id, status === "مؤكد" ? "أكّد حجزاً" : "غيّر حالة حجز", current.title, ipOf(request));

    await pushNotification({
      kind: "قاعة",
      title: status === "مؤكد" ? "تم تأكيد حجزك" : "تحديث على طلب الحجز",
      body: `«${current.title}» — ${current.day} ${current.start}–${current.end} · الحالة: ${status}`,
      channel: "تنبيه التطبيق",
      toId: current.requesterId,
      link: { portal: "diwan", section: "halls" },
    });

    const after = await col.findOne({ id });
    return { ok: true, booking: after ? clean(after) : null };
  });
}
