import { clean, collections, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canRegisterLetters, clearanceRank } from "@/lib/access";
import type { Letter } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** معالجة كتاب أو أرشفته */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    if (!canRegisterLetters(me)) throw new ForbiddenError("معالجة الكتب من صلاحية أمانة السر ومكتب المحافظ");
    const { id } = await params;
    const { action } = await body<{ action: "handle" | "archive" }>(request);

    const col = await collections.letters();
    const l = (await col.findOne({ id })) as Letter | null;
    if (!l || clearanceRank(l.classification) > clearanceRank(me.clearance)) throw new Error("الكتاب غير موجود");

    if (action === "handle") {
      if (l.handled) throw new Error("الكتاب معالَج مسبقاً");
      await col.updateOne({ id }, { $set: { handled: true } });
      await writeAudit(me.id, "علّم الكتاب معالَجاً", l.number, ipOf(request));
    } else if (action === "archive") {
      if (l.direction === "مؤرشف") throw new Error("الكتاب مؤرشف مسبقاً");
      await col.updateOne({ id }, { $set: { direction: "مؤرشف", handled: true } });
      await writeAudit(me.id, "أرشف الكتاب", l.number, ipOf(request));
    } else {
      throw new Error("إجراء غير معروف");
    }
    const after = await col.findOne({ id });
    return { ok: true, letter: after ? clean(after) : null };
  });
}
