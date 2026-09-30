import { writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canIssueAssignment } from "@/lib/access";
import { createAssignment, type NewAssignment } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** إصدار تكليف جديد */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canIssueAssignment(me)) throw new ForbiddenError(`صفتك «${me.title}» لا تملك إصدار التكليفات`);
    const input = await body<NewAssignment>(request);
    const a = await createAssignment(me.id, input);
    await writeAudit(me.id, "أصدر تكليفاً جديداً", a.ref, ipOf(request));
    return { ok: true, assignment: a };
  });
}
