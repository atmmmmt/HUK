import { collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canAccessSection, canScheduleMeeting } from "@/lib/access";
import { validISO } from "@/lib/ops";
import type { Meeting } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Input = {
  title?: string; kind?: string; dateISO?: string; time?: string; hallId?: string; online?: boolean;
  inviteeIds?: string[]; agenda?: string[]; summary?: string;
};

/** «10:30» ← «10:30 ص» */
function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = ((h + 11) % 12) + 1;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "ص" : "م"}`;
}

/** جدولة اجتماع جديد ودعوة المشاركين — يصلهم إشعار ويؤكّدون أو يعتذرون */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canScheduleMeeting(me)) throw new ForbiddenError("جدولة الاجتماعات خارج صلاحية دورك");
    const input = await body<Input>(request);

    const title = input.title?.trim().slice(0, 200);
    if (!title) throw new Error("عنوان الاجتماع مطلوب");
    if (!validISO(input.dateISO)) throw new Error("حدّد تاريخ الاجتماع");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(input.dateISO + "T12:00:00") < today) throw new Error("لا يُجدول اجتماع في تاريخ مضى");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.time))) throw new Error("حدّد ساعة الاجتماع");

    const users = await collections.users();
    const ids = [...new Set((input.inviteeIds ?? []).map(String))].filter((x) => x !== me.id).slice(0, 60);
    if (!ids.length) throw new Error("اختر مدعوّاً واحداً على الأقل");
    const found = await users.find(
      { id: { $in: ids }, active: { $ne: false } },
      { projection: { passwordHash: 0, username: 0 } },
    ).toArray();
    if (found.length !== ids.length) throw new Error("أحد المدعوين غير موجود أو موقوف");

    let hallId: string | undefined;
    if (!input.online && input.hallId) {
      const hall = await (await collections.halls()).findOne({ id: input.hallId });
      if (!hall) throw new Error("القاعة غير موجودة");
      hallId = input.hallId;
    }

    const day = new Date(input.dateISO + "T12:00:00").toLocaleDateString("ar-SY-u-nu-latn", { day: "numeric", month: "long" });
    const meeting: Meeting & { dateISO: string; createdBy: string } = {
      id: "m" + Date.now() + Math.floor(Math.random() * 1000),
      title,
      kind: input.kind?.trim().slice(0, 60) || "اجتماع عمل",
      day,
      dateISO: input.dateISO,
      time: timeLabel(String(input.time)),
      ...(hallId ? { hallId } : {}),
      online: !!input.online,
      chairId: me.id,
      secretaryId: me.id,
      inviteeIds: [me.id, ...ids],
      confirmed: [me.id],
      apologized: [],
      agenda: (input.agenda ?? []).map((a) => String(a).trim().slice(0, 200)).filter(Boolean).slice(0, 20),
      minutesApproved: false,
      outcomes: [],
      status: "قادم",
      summary: input.summary?.trim().slice(0, 500) || "",
      createdBy: me.id,
    };
    await (await collections.meetings()).insertOne({ ...meeting });

    const where = meeting.online ? "اتصال مرئي" : hallId ? String((await (await collections.halls()).findOne({ id: hallId }))?.name ?? "") : "";
    for (const pid of ids) {
      const recipient = found.find((p) => p.id === pid);
      const link = recipient && canAccessSection(recipient, "diwan", "meetings")
        ? { portal: "diwan" as const, section: "meetings" }
        : recipient && canAccessSection(recipient, "directorates", "meetings")
          ? { portal: "directorates" as const, section: "meetings" }
          : undefined;
      await pushNotification({
        kind: "اجتماع",
        title: "دعوة إلى اجتماع",
        body: `«${title}» — ${day} · ${meeting.time}${where ? ` · ${where}` : ""}. الدعوة من ${me.title}.`,
        channel: "تنبيه التطبيق", toId: pid, ...(link ? { link } : {}), urgent: true,
      });
    }
    await writeAudit(me.id, "جدول اجتماعاً ودعا المشاركين", title, ipOf(request));
    return { ok: true, meeting };
  });
}
