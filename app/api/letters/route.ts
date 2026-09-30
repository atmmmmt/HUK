import { collections, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canRegisterLetters } from "@/lib/access";
import type { Letter } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** قيد كتاب وارد أو صادر برقم تسلسلي */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canRegisterLetters(me)) throw new ForbiddenError("قيد الكتب من صلاحية أمانة السر ومكتب المحافظ");
    const input = await body<Pick<Letter, "direction" | "party" | "subject" | "referredTo" | "action" | "classification"> & { dueHours?: number }>(request);
    if (input.direction !== "وارد" && input.direction !== "صادر") throw new Error("اتجاه الكتاب غير صحيح");
    const subject = input.subject?.trim();
    const party = input.party?.trim();
    if (!subject || !party) throw new Error("الموضوع والجهة مطلوبان");

    const col = await collections.letters();
    const year = new Date().getFullYear();
    const prefix = input.direction === "وارد" ? "و" : "ص";
    const count = await col.countDocuments({ direction: input.direction });
    const letter: Letter = {
      id: "l" + Date.now(),
      number: `${prefix}/${String(count + 1).padStart(4, "0")}/${year}`,
      direction: input.direction,
      party,
      date: new Date().toLocaleDateString("ar-SY-u-nu-latn", { day: "2-digit", month: "long", year: "numeric" }),
      subject,
      referredTo: input.referredTo?.trim() || "—",
      action: input.action?.trim() || "للاطلاع",
      registrarId: me.id,
      classification: input.classification === "سرّي" ? "سرّي" : "عادي",
      ...(input.dueHours ? { dueHours: Math.max(1, Math.min(720, Math.round(input.dueHours))) } : {}),
      handled: input.direction === "صادر",
    };
    await col.insertOne({ ...letter });
    await writeAudit(me.id, `قيّد كتاباً ${letter.direction}اً`, letter.number, ipOf(request));
    return { ok: true, letter };
  });
}
