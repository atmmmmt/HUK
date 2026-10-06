import { collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canAccessSection, seesAssignment } from "@/lib/access";
import type { Assignment, Meeting, Note } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    const input = await body<{ target: string; targetLabel: string; text: string; scope: Note["scope"]; mentions?: string[] }>(request);

    const text = input.text?.trim();
    if (!text) throw new Error("لا يمكن إضافة ملاحظة فارغة");
    if (text.length > 2000) throw new Error("الملاحظة أطول من الحد المسموح");

    // صفحة «ملاحظاتي» شخصية حتى للمحافظ؛ أما الملاحظات المرتبطة بعناصر العمل
    // فتبقى توجيهاً رسمياً عندما يكتبها المحافظ.
    const personalTarget = input.target === `personal:${me.id}`;
    if (input.target.startsWith("personal:") && !personalTarget) throw new Error("لا يمكن الكتابة في ملاحظات مستخدم آخر");
    const scope: Note["scope"] = personalTarget ? "خاصة" : me.role === "governor" ? "توجيه المحافظ" : input.scope ?? "رسمية";

    // لا يجوز استعمال API الملاحظات للوصول إلى عنصر خارج نطاق المستخدم.
    let assignment: Assignment | null = null;
    if (!personalTarget) {
      assignment = (await (await collections.assignments()).findOne({ id: input.target })) as Assignment | null;
      if (assignment) {
        const people = await (await collections.users()).find({}, { projection: { passwordHash: 0, username: 0 } }).toArray();
        if (!seesAssignment(me, assignment, { people })) throw new ForbiddenError("هذا التكليف خارج نطاق رؤيتك");
      } else {
        const meeting = (await (await collections.meetings()).findOne({ id: input.target })) as Meeting | null;
        const hall = await (await collections.halls()).findOne({ id: input.target });
        const delegation = await (await collections.delegations()).findOne({ id: input.target });
        const folder = await (await collections.files()).findOne({ id: input.target });
        const person = await (await collections.users()).findOne({ id: input.target }, { projection: { passwordHash: 0, username: 0 } });
        const entity = await (await collections.entities()).findOne({ id: input.target });

        if (meeting) {
          const canSeeMeeting =
            canAccessSection(me, "diwan", "meetings") ||
            canAccessSection(me, "directorates", "meetings");
          const involved =
            meeting.chairId === me.id ||
            meeting.secretaryId === me.id ||
            (meeting.inviteeIds ?? []).includes(me.id);
          const broad = ["governor", "deputy", "assistant", "secgen", "chief", "registry", "protocol"].includes(me.role);
          if (!canSeeMeeting || (!broad && !involved)) throw new ForbiddenError("هذا الاجتماع خارج نطاقك");
        } else if (hall) {
          if (!canAccessSection(me, "diwan", "halls")) throw new ForbiddenError("القاعات خارج اختصاص دورك");
        } else if (delegation) {
          if (!canAccessSection(me, "diwan", "delegations")) throw new ForbiddenError("الوفود خارج اختصاص دورك");
        } else if (folder) {
          if (!canAccessSection(me, "diwan", "files") && folder.ownerId !== me.id) throw new ForbiddenError("هذا الملف خارج نطاقك");
        } else if (person) {
          const canSeePeople =
            canAccessSection(me, "diwan", "people") ||
            (canAccessSection(me, "directorates", "structure") && person.entityId === me.entityId);
          if (!canSeePeople) throw new ForbiddenError("هذا الشخص خارج نطاقك");
        } else if (entity) {
          const broad = ["governor", "deputy", "secgen", "followup"].includes(me.role);
          const canSeeEntity =
            canAccessSection(me, "directorates", "entities") ||
            canAccessSection(me, "directorates", "performance");
          if (!canSeeEntity || (!broad && entity.id !== me.entityId)) throw new ForbiddenError("هذه الجهة خارج نطاقك");
        } else if (input.target === "general") {
          if (!["governor", "deputy", "assistant", "secgen", "chief", "followup"].includes(me.role)) {
            throw new ForbiddenError("الملاحظات العامة الرسمية خارج اختصاص دورك");
          }
        } else {
          throw new ForbiddenError("العنصر المرتبط بالملاحظة غير متاح ضمن صلاحياتك");
        }
      }
    }

    const note: Note = {
      id: "t" + Date.now() + Math.floor(Math.random() * 1000),
      target: input.target,
      targetLabel: input.targetLabel,
      authorId: me.id,
      text,
      at: new Date().toLocaleString("ar-SY-u-nu-latn", { dateStyle: "short", timeStyle: "short" }),
      scope,
      mentions: input.mentions,
    };

    const col = await collections.notes();
    const users = await collections.users();
    await col.insertOne(note);
    await writeAudit(me.id, "أضاف ملاحظة", input.targetLabel, ipOf(request));

    // ملاحظة على تكليف تصل إلى أطرافه (إلا الخاصة)
    const notified = new Set<string>([me.id]);
    if (scope !== "خاصة") {
      const a = assignment;
      if (a) {
        for (const pid of [a.ownerId, a.issuerId, ...(a.partnerIds ?? [])]) {
          if (!pid || notified.has(pid)) continue;
          notified.add(pid);
          const recipient = await users.findOne({ id: pid });
          const recipientLink = recipient && canAccessSection(recipient, "diwan", "assignments")
            ? { portal: "diwan" as const, section: "assignments", itemId: a.id }
            : recipient && canAccessSection(recipient, "directorates", "inbox")
              ? { portal: "directorates" as const, section: "inbox", itemId: a.id }
              : undefined;
          await pushNotification({
            kind: "تكليف",
            title: scope === "توجيه المحافظ" ? "توجيه من السيد المحافظ" : "ملاحظة جديدة على تكليف",
            body: `${me.title} على «${a.title}»: ${text.slice(0, 90)}`,
            channel: "تنبيه التطبيق",
            toId: pid,
            ...(recipientLink ? { link: recipientLink } : {}),
            urgent: scope === "توجيه المحافظ",
          });
        }
      }
    }

    for (const id of input.mentions ?? []) {
      if (!id || notified.has(id)) continue;
      notified.add(id);
      const a = assignment;
      const recipient = await users.findOne({ id });
      const recipientLink = a && recipient && canAccessSection(recipient, "diwan", "assignments")
        ? { portal: "diwan" as const, section: "assignments", itemId: a.id }
        : a && recipient && canAccessSection(recipient, "directorates", "inbox")
          ? { portal: "directorates" as const, section: "inbox", itemId: a.id }
          : undefined;
      await pushNotification({
        kind: "تكليف",
        title: "أُشير إليك في ملاحظة",
        body: `${me.title} على «${input.targetLabel}»: ${text.slice(0, 90)}`,
        channel: "تنبيه التطبيق",
        toId: id,
        ...(recipientLink ? { link: recipientLink } : {}),
      });
    }

    return { ok: true, note };
  });
}
