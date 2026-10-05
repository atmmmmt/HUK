import { cleanAll, collections, db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { handle } from "@/lib/api";
import { clearanceRank, seesAssignment } from "@/lib/access";
import { runReviewSweep } from "@/lib/review";
import type { Assignment, DocFile, Letter, Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * كل ما تحتاجه الواجهة في طلب واحد — مُرشَّح على الخادم حسب صلاحية المستخدم.
 * الترشيح هنا هو خط الدفاع الحقيقي، لا إخفاء العناصر في المتصفح.
 */
export async function GET() {
  return handle(async () => {
    const me = await requireUser();

    // فحص المهل المنتهية وإرسال إشعارات المراجعة لمُصدِري التكليفات
    await runReviewSweep();

    const [
      rolesCol, entitiesCol, peopleCol, hallsCol, bookingsCol, assignmentsCol,
      meetingsCol, lettersCol, decisionsCol, delegationsCol, filesCol,
      notesCol, notifsCol, auditCol, requestsCol,
    ] = await Promise.all([
      collections.roles(), collections.entities(), collections.users(), collections.halls(),
      collections.bookings(), collections.assignments(), collections.meetings(), collections.letters(),
      collections.decisions(), collections.delegations(), collections.files(), collections.notes(),
      collections.notifications(), collections.audit(), collections.requests(),
    ]);

    const [
      roles, entities, rawPeople, halls, bookings, rawAssignments,
      meetings, letters, decisions, delegations, rawFiles, notes, notifications, audit, requests,
    ] = await Promise.all([
      rolesCol.find().toArray(),
      entitiesCol.find().toArray(),
      peopleCol.find({}, { projection: { passwordHash: 0, username: 0 } }).toArray(),
      hallsCol.find().toArray(),
      bookingsCol.find().toArray(),
      assignmentsCol.find().sort({ _id: -1 }).toArray(),
      meetingsCol.find().toArray(),
      lettersCol.find().toArray(),
      decisionsCol.find().toArray(),
      delegationsCol.find().toArray(),
      filesCol.find().toArray(),
      notesCol.find({ $or: [{ scope: { $ne: "خاصة" } }, { authorId: me.id }] }).sort({ _id: -1 }).limit(300).toArray(),
      notifsCol.find({ toId: me.id }).sort({ _id: -1 }).limit(150).toArray(),
      auditCol.find().sort({ _id: -1 }).limit(120).toArray(),
      requestsCol.find().toArray(),
    ]);

    const people = cleanAll(rawPeople) as unknown as Person[];
    const myRank = clearanceRank(me.clearance);

    // التكليفات: نطاق الدور + درجة التصريح
    // الحقول المصفوفية لا تصل ناقصة أبداً (سجلات قديمة أو مرحَّلة)
    const assignments = cleanAll(rawAssignments as unknown as Assignment[])
      .map((a) => ({ ...a, partnerIds: a.partnerIds ?? [], attachments: a.attachments ?? [], chain: a.chain ?? {} }))
      .filter((a) => seesAssignment(me, a, { entities: entities, people }));

    // الملفات: تُحجب فوق درجة التصريح
    const files = cleanAll(rawFiles as unknown as DocFile[]).map((f) =>
      clearanceRank(f.classification) > myRank
        ? { ...f, name: "ملف محجوب", ownerId: "", items: 0, locked: true }
        : { ...f, locked: false },
    );

    // المراسلات السرّية لا تُرسل أصلاً لمن لا يملك التصريح
    const visibleLetters = cleanAll(letters as unknown as Letter[])
      .filter((l) => clearanceRank(l.classification) <= myRank);

    const isAdmin = me.role === "admin" || me.role === "governor";
    const esc = await (await db()).collection("settings").findOne({ id: "escalation" });
    // المستندات: ما يسمح به التصريح، ومرفقات التكليفات المرئية فقط
    const visibleIds = new Set(assignments.map((a) => a.id));
    const documents = cleanAll(await (await db()).collection("documents").find({}, { projection: { fileId: 0 } }).toArray())
      .filter((d) => clearanceRank(String(d.classification)) <= myRank && (!d.assignmentId || visibleIds.has(String(d.assignmentId))));

    return {
      me: cleanAll([me])[0],
      roles: cleanAll(roles),
      entities: cleanAll(entities),
      people,
      halls: cleanAll(halls),
      bookings: cleanAll(bookings),
      assignments,
      // الحقول الجماعية مضمونة دائماً حتى لو خُزّن اجتماع قديم دونها
      meetings: cleanAll(meetings).map((m) => ({
        ...m,
        outcomes: m.outcomes ?? [], inviteeIds: m.inviteeIds ?? [], confirmed: m.confirmed ?? [],
        apologized: m.apologized ?? [], agenda: m.agenda ?? [],
      })),
      letters: visibleLetters,
      decisions: cleanAll(decisions).filter((d) => clearanceRank(String(d.classification ?? "عادي")) <= myRank),
      delegations: cleanAll(delegations),
      files,
      notes: cleanAll(notes).filter((n) => n.scope !== "خاصة" || n.authorId === me.id),
      notifications: cleanAll(notifications).filter((n) => n.toId === me.id),
      audit: isAdmin ? cleanAll(audit) : [],
      requests: cleanAll(requests),
      documents,
      settings: { escalationLevels: Array.isArray(esc?.levels) ? (esc.levels as number[]) : null },
    };
  });
}
