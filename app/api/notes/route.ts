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

    // صفحة «ملاحظاتي» شخصية حتى للمحافظ؛ أما الملاحظات المرتبطة بعناصر العمل
    // فتبقى توجيهاً رسمياً عندما يكتبها المحافظ.
    const personalTarget = input.target === `personal:${me.id}`;
    if (input.target.startsWith("personal:") && !personalTarget) throw new Error("لا يمكن الكتابة في ملاحظات مستخدم آخر");
    const scope: Note["scope"] = personalTarget ? "خاصة" : me.role === "governor" ? "توجيه المحافظ" : input.scope ?? "رسمية";

    const note: Note = {
      id: "t" + Date.now() + Math.floor(Math.random() * 1000),
      target: input.target,
      targetLabel: input.targetLabel,
      authorId: me.id,
      text,
      at: new Date().toLocaleString("ar-SY-u-nu-latn", { dateStyle: "short", timeStyle: "short" }),
      scope,
      mentions: input.mentions,
    };

    const col = await collections.notes();
    await col.insertOne(note);
    await writeAudit(me.id, "أضاف ملاحظة", input.targetLabel, ipOf(request));

    // ملاحظة على تكليف تصل إلى أطرافه (إلا الخاصة)
    const notified = new Set<string>([me.id]);
    if (scope !== "خاصة") {
      const a = await (await collections.assignments()).findOne({ id: input.target });
      if (a) {
        for (const pid of [a.ownerId, a.issuerId, ...(a.partnerIds ?? [])]) {
          if (!pid || notified.has(pid)) continue;
          notified.add(pid);
          await pushNotification({
            kind: "تكليف",
            title: scope === "توجيه المحافظ" ? "توجيه من السيد المحافظ" : "ملاحظة جديدة على تكليف",
            body: `${me.title} على «${a.title}»: ${text.slice(0, 90)}`,
            channel: "تنبيه التطبيق",
            toId: pid,
            link: { portal: pid === a.ownerId ? "directorates" : "diwan", section: pid === a.ownerId ? "inbox" : "assignments", itemId: a.id },
            urgent: scope === "توجيه المحافظ",
          });
        }
      }
    }

    for (const id of input.mentions ?? []) {
      if (!id || notified.has(id)) continue;
      notified.add(id);
      const a = await (await collections.assignments()).findOne({ id: input.target });
      await pushNotification({
        kind: "تكليف",
        title: "أُشير إليك في ملاحظة",
        body: `${me.title} على «${input.targetLabel}»: ${text.slice(0, 90)}`,
        channel: "تنبيه التطبيق",
        toId: id,
        ...(a ? { link: { portal: id === a.ownerId ? "directorates" as const : "diwan" as const, section: id === a.ownerId ? "inbox" : "assignments", itemId: a.id } } : {}),
      });
    }

    return { ok: true, note };
  });
}
