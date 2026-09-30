import { clean, collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canManageMeetings } from "@/lib/access";
import { createAssignment } from "@/lib/ops";
import type { Assignment, Meeting, Priority } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Input =
  | { action: "approve_minutes" }
  | { action: "assign_outcomes"; items: { outcomeId: string; ownerId: string; priority: Priority; dueISO: string }[] };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    const { id } = await params;
    const input = await body<Input>(request);

    const col = await collections.meetings();
    const m = (await col.findOne({ id })) as Meeting | null;
    if (!m) throw new Error("الاجتماع غير موجود");
    const involved = m.chairId === me.id || m.secretaryId === me.id;
    if (!canManageMeetings(me) && !involved) throw new ForbiddenError("إدارة هذا الاجتماع خارج صلاحيتك");

    const created: Assignment[] = [];

    if (input.action === "approve_minutes") {
      if (m.minutesApproved) throw new Error("المحضر معتمد مسبقاً");
      if (m.status !== "منعقد" && m.status !== "جارٍ الآن") throw new Error("لا يُعتمد محضر اجتماع لم ينعقد بعد");
      await col.updateOne({ id }, { $set: { minutesApproved: true } });
      await writeAudit(me.id, "اعتمد محضر الاجتماع", m.title, ipOf(request));
      for (const pid of (m.inviteeIds ?? []).filter((p) => p !== me.id)) {
        await pushNotification({
          kind: "اجتماع", title: "اعتُمد محضر الاجتماع", body: `«${m.title}»`,
          channel: "تنبيه التطبيق", toId: pid, link: { portal: "diwan", section: "meetings" },
        });
      }
    } else if (input.action === "assign_outcomes") {
      const items = Array.isArray(input.items) ? input.items : [];
      if (!items.length) throw new Error("اختر مكلَّفاً لمخرج واحد على الأقل");
      const outcomes = [...(m.outcomes ?? [])];
      for (const it of items) {
        const k = outcomes.findIndex((o) => o.id === it.outcomeId);
        if (k === -1) throw new Error("مخرج غير موجود");
        if (outcomes[k].assignmentRef || outcomes[k].closed) continue;
        const a = await createAssignment(me.id, {
          title: outcomes[k].text,
          source: `مخرج اجتماع: ${m.title}`,
          ownerId: it.ownerId,
          priority: it.priority,
          dueISO: it.dueISO,
          closeCriteria: "تنفيذ مخرج الاجتماع وتوثيقه",
          meetingId: m.id,
        });
        outcomes[k] = { ...outcomes[k], assignmentRef: a.ref, ownerId: a.ownerId };
        created.push(a);
      }
      await col.updateOne({ id }, { $set: { outcomes } });
      await writeAudit(me.id, `حوّل ${created.length} من مخرجات الاجتماع إلى تكليفات`, m.title, ipOf(request));
    } else {
      throw new Error("إجراء غير معروف");
    }

    const after = await col.findOne({ id });
    const meeting = after ? clean(after) : null;
    return {
      ok: true,
      meeting: meeting && { ...meeting, outcomes: meeting.outcomes ?? [], inviteeIds: meeting.inviteeIds ?? [], confirmed: meeting.confirmed ?? [], apologized: meeting.apologized ?? [], agenda: meeting.agenda ?? [] },
      assignments: created,
    };
  });
}
