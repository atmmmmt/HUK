import { collections } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canAccessSection, clearanceRank, seesAssignment } from "@/lib/access";
import { documentsCol, readFile } from "@/lib/documents";
import type { Assignment, Decision } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** تنزيل مستند — بعد التحقق من التصريح ونطاق الرؤية */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let me;
  try { me = await requireUser(); } catch { return new Response("انتهت الجلسة", { status: 401 }); }
  const { id } = await params;
  const doc = await (await documentsCol()).findOne({ id });
  if (!doc || clearanceRank(doc.classification) > clearanceRank(me.clearance)) return new Response("المستند غير موجود", { status: 404 });
  if (doc.assignmentId) {
    const a = await (await collections.assignments()).findOne({ id: doc.assignmentId });
    const people = await (await collections.users()).find({}, { projection: { passwordHash: 0 } }).toArray();
    if (!a || !seesAssignment(me, a as unknown as Assignment, { people })) return new Response("المستند غير موجود", { status: 404 });
  } else if (doc.decisionId) {
    const d = await (await collections.decisions()).findOne({ id: doc.decisionId }) as Decision | null;
    const canSeeDecision =
      canAccessSection(me, "diwan", "decisions") ||
      canAccessSection(me, "directorates", "decisions");
    if (!d || !canSeeDecision) return new Response("المستند غير موجود", { status: 404 });
    const leadership = ["governor", "deputy", "assistant", "secgen", "chief"].includes(me.role);
    if (!leadership && d.entityId !== me.entityId && d.submittedBy !== me.id) return new Response("المستند غير موجود", { status: 404 });
  } else if (doc.folderId) {
    const folder = await (await collections.files()).findOne({ id: doc.folderId });
    const ownsFolder = !!folder && (folder.ownerId === me.id || folder.entityId === me.entityId);
    if (!folder || (!canAccessSection(me, "diwan", "files") && !ownsFolder)) return new Response("المستند غير موجود", { status: 404 });
  } else if (!canAccessSection(me, "diwan", "files")) {
    return new Response("المستند غير موجود", { status: 404 });
  }

  const buf = await readFile(doc.fileId);
  const inline = new URL(request.url).searchParams.get("view") === "1";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
