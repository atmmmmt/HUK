import { collections, pushNotification, writeAudit } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import type { Note } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    const input = await body<{ target: string; targetLabel: string; text: string; scope: Note["scope"]; mentions?: string[] }>(request);

    const text = input.text?.trim();
    if (!text) throw new Error("لا يمكن إضافة ملاحظة فارغة");
    if (text.length > 2000) throw new Error("الملاحظة أطول من الحد المسموح");

    // ملاحظة المحافظ تُسجَّل دائماً كتوجيه رسمي
    const scope: Note["scope"] = me.role === "governor" ? "توجيه المحافظ" : input.scope ?? "رسمية";

    const note: Note = {
      id: "t" + Date.now() + Math.floor(Math.random() * 1000),
      target: input.target,
      targetLabel: input.targetLabel,
      authorId: me.id,
      text,
      at: new Date().toLocaleString("ar-SY", { dateStyle: "short", timeStyle: "short" }),
      scope,
      mentions: input.mentions,
    };

    const col = await collections.notes();
    await col.insertOne(note);
    await writeAudit(me.id, "أضاف ملاحظة", input.targetLabel, ipOf(request));

    for (const id of input.mentions ?? []) {
      await pushNotification({
        kind: "تكليف",
        title: "أُشير إليك في ملاحظة",
        body: `${me.name} على «${input.targetLabel}»: ${text.slice(0, 90)}`,
        channel: "تنبيه التطبيق",
        toId: id,
      });
    }

    return { ok: true, note };
  });
}
