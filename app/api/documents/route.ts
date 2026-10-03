import { collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { handle, ipOf } from "@/lib/api";
import { canApproveDecision, canIssueAssignment, canRegisterLetters, canSubmitDecision, clearanceRank, seesAssignment } from "@/lib/access";
import { ALLOWED, MAX_UPLOAD, documentsCol, storeFile, type DocumentMeta } from "@/lib/documents";
import { stampNow } from "@/lib/ops";
import type { Assignment, Classification, Decision } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** رفع مستند إلى مجلد في الأرشيف أو مرفقاً لتكليف */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    let form: FormData;
    try { form = await request.formData(); } catch { throw new Error("تعذّرت قراءة الملف — حاول مرة أخرى"); }

    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("اختر ملفاً");
    if (file.size > MAX_UPLOAD) throw new Error("حجم الملف أكبر من 8 ميغابايت");
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    const okType = ALLOWED.has(file.type) || [...ALLOWED.values()].includes(ext);
    if (!okType) throw new Error("نوع الملف غير مدعوم — المسموح: PDF، صور، Word، Excel، PowerPoint");

    const folderId = String(form.get("folderId") ?? "") || undefined;
    const assignmentId = String(form.get("assignmentId") ?? "") || undefined;
    const decisionId = String(form.get("decisionId") ?? "") || undefined;
    if (!folderId && !assignmentId && !decisionId) throw new Error("حدّد المجلد أو التكليف أو المعاملة");
    let classification: Classification = form.get("classification") === "سرّي" ? "سرّي" : "عادي";
    if (clearanceRank(classification) > clearanceRank(me.clearance)) throw new ForbiddenError("لا ترفع مستنداً بدرجة أعلى من تصريحك");

    let assignment: Assignment | null = null;
    let decision: Decision | null = null;
    if (decisionId) {
      decision = (await (await collections.decisions()).findOne({ id: decisionId })) as Decision | null;
      if (!decision) throw new Error("المعاملة غير موجودة");
      if (clearanceRank(decision.classification ?? "عادي") > clearanceRank(me.clearance)) throw new ForbiddenError("المعاملة محجوبة عن درجة تصريحك");
      const mine = decision.submittedBy === me.id || (me.role === "director" && decision.entityId === me.entityId);
      if (!mine && !canApproveDecision(me) && !(canSubmitDecision(me) && me.role !== "director")) throw new ForbiddenError("الإرفاق لرافع المعاملة وللديوان");
      if (decision.classification === "سرّي") classification = "سرّي";
    } else if (assignmentId) {
      assignment = (await (await collections.assignments()).findOne({ id: assignmentId })) as Assignment | null;
      if (!assignment) throw new Error("التكليف غير موجود");
      const people = await (await collections.users()).find({}, { projection: { passwordHash: 0 } }).toArray();
      if (!seesAssignment(me, assignment, { people })) throw new ForbiddenError("هذا التكليف خارج نطاق رؤيتك");
      const involved = [assignment.ownerId, assignment.issuerId, ...(assignment.partnerIds ?? [])].includes(me.id);
      if (!involved && !canIssueAssignment(me)) throw new ForbiddenError("الإرفاق للمكلَّف ومُصدِر التكليف والمشاركين");
      if (assignment.classification === "سرّي") classification = "سرّي";
    } else {
      const folder = await (await collections.files()).findOne({ id: folderId });
      if (!folder) throw new Error("المجلد غير موجود");
      if (clearanceRank(folder.classification) > clearanceRank(me.clearance)) throw new ForbiddenError("المجلد محجوب عن درجة تصريحك");
      const owner = folder.ownerId === me.id || folder.entityId === me.entityId;
      if (!owner && !canRegisterLetters(me) && !canIssueAssignment(me)) throw new ForbiddenError("الرفع إلى هذا المجلد لأصحابه وللديوان");
      if (folder.classification === "سرّي") classification = "سرّي";
    }

    const fileId = await storeFile(file);
    const doc: DocumentMeta = {
      id: "dc" + Date.now() + Math.floor(Math.random() * 1000),
      fileId,
      name: file.name.slice(0, 160),
      size: file.size,
      mime: file.type || "application/octet-stream",
      ...(folderId ? { folderId } : {}),
      ...(assignmentId ? { assignmentId } : {}),
      ...(decisionId ? { decisionId } : {}),
      uploadedBy: me.id,
      at: stampNow(),
      classification,
    };
    await (await documentsCol()).insertOne({ ...doc });

    const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} ك.ب` : `${(file.size / 1048576).toFixed(1)} م.ب`;
    if (assignment) {
      await (await collections.assignments()).updateOne({ id: assignment.id }, { $push: { attachments: { name: doc.name, size, docId: doc.id } } } as never);
      for (const pid of [assignment.ownerId, assignment.issuerId].filter((p) => p !== me.id)) {
        await pushNotification({
          kind: "تكليف", title: "مرفق جديد على تكليف", body: `«${doc.name}» على «${assignment.title}»`,
          channel: "تنبيه التطبيق", toId: pid, link: { portal: "diwan", section: "assignments" },
        });
      }
    } else if (folderId) {
      await (await collections.files()).updateOne({ id: folderId }, { $inc: { items: 1 }, $set: { updated: "الآن" } });
    }
    await writeAudit(me.id, decision ? "أرفق مستنداً بمعاملة" : assignment ? "أرفق مستنداً بتكليف" : "رفع مستنداً إلى الأرشيف", doc.name, ipOf(request));
    return { ok: true, document: doc, attachment: assignment ? { name: doc.name, size, docId: doc.id } : null };
  });
}
