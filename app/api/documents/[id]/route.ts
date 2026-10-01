import { collections } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { clearanceRank, seesAssignment } from "@/lib/access";
import { documentsCol, readFile } from "@/lib/documents";
import type { Assignment } from "@/lib/types";

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
