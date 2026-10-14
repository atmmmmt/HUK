import { writeUsageEvent } from "@/lib/db";
import { destroySession, requireUser } from "@/lib/session";
import { handle } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    const me = await requireUser();
    await writeUsageEvent(me.id, "logout", { path: "/logout" }).catch(() => {});
    await destroySession();
    return { ok: true };
  });
}
