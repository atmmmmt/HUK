import { collections } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { body, handle } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    const { id, all } = await body<{ id?: string; all?: boolean }>(request);
    const col = await collections.notifications();

    if (all) {
      await col.updateMany({ toId: me.id, read: false }, { $set: { read: true } });
      return { ok: true };
    }
    if (!id) throw new Error("لم يُحدَّد الإشعار");
    // لا يعلّم المستخدم إلا إشعاراته
    await col.updateOne({ id, toId: me.id }, { $set: { read: true } });
    return { ok: true };
  });
}
