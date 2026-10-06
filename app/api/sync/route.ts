import { clean, collections } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { handle } from "@/lib/api";
import { assignmentQueryFor, canAccessSection, seesAssignment } from "@/lib/access";
import type { Assignment, Meeting, Note, Notification, Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cleanAll = <T extends object>(docs: T[]) => docs.map((d) => clean(d));

/**
 * مزامنة خفيفة للجوال/PWA.
 * لا تعيد تحميل كامل bootstrap كل عدة ثوانٍ؛ فقط البيانات التي يجب أن تصل فوراً.
 */
export async function GET() {
  return handle(async () => {
    const me = await requireUser();
    const [peopleCol, assignmentsCol, notesCol, notificationsCol, meetingsCol] = await Promise.all([
      collections.users(),
      collections.assignments(),
      collections.notes(),
      collections.notifications(),
      collections.meetings(),
    ]);

    const [rawPeople, rawAssignments, rawNotes, rawNotifications, rawMeetings] = await Promise.all([
      peopleCol.find({}, { projection: { passwordHash: 0, username: 0 } }).toArray(),
      assignmentsCol.find(assignmentQueryFor(me)).sort({ _id: -1 }).toArray(),
      notesCol.find({ $or: [{ scope: { $ne: "خاصة" } }, { authorId: me.id }] }).sort({ _id: -1 }).limit(300).toArray(),
      notificationsCol.find({ toId: me.id }).sort({ _id: -1 }).limit(150).toArray(),
      meetingsCol.find().sort({ _id: -1 }).limit(100).toArray(),
    ]);

    const people = cleanAll(rawPeople) as unknown as Person[];
    const assignments = cleanAll(rawAssignments as unknown as Assignment[])
      .map((a) => ({ ...a, partnerIds: a.partnerIds ?? [], attachments: a.attachments ?? [], chain: a.chain ?? {} }))
      .filter((a) => seesAssignment(me, a, { people }));

    const canSeeMeetings =
      canAccessSection(me, "diwan", "meetings") ||
      canAccessSection(me, "directorates", "meetings");

    const meetings = (canSeeMeetings ? cleanAll(rawMeetings as unknown as Meeting[]) : [])
      .map((m) => ({
        ...m,
        outcomes: m.outcomes ?? [],
        inviteeIds: m.inviteeIds ?? [],
        confirmed: m.confirmed ?? [],
        apologized: m.apologized ?? [],
        agenda: m.agenda ?? [],
      }))
      .filter((m) =>
        ["governor", "deputy", "assistant", "secgen", "chief", "registry"].includes(me.role) ||
        m.chairId === me.id ||
        m.secretaryId === me.id ||
        (m.inviteeIds ?? []).includes(me.id)
      );

    const visibleAssignmentIds = new Set(assignments.map((a) => a.id));
    const visibleMeetingIds = new Set(meetings.map((m) => m.id));
    const notes = cleanAll(rawNotes as unknown as Note[]).filter((n) => {
      if (n.scope === "خاصة") return n.authorId === me.id;
      if (n.authorId === me.id) return true;
      return visibleAssignmentIds.has(n.target) || visibleMeetingIds.has(n.target);
    });
    const notifications = cleanAll(rawNotifications as unknown as Notification[]);

    return { ok: true, assignments, notes, notifications, meetings };
  });
}
