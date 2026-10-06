import { collections, pushNotification, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canAccessSection, canRaiseRequest } from "@/lib/access";
import type { RequestItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: RequestItem["kind"][] = ["حجز قاعة", "موعد لدى المحافظ", "طلب اجتماع", "تمديد مهلة"];

/** رفع طلب من جهة تابعة إلى الديوان */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canRaiseRequest(me)) throw new ForbiddenError("رفع الطلبات إلى الديوان من صلاحية الجهات التابعة");
    const input = await body<{ kind: RequestItem["kind"]; title: string; detail: string }>(request);
    if (!KINDS.includes(input.kind)) throw new Error("نوع الطلب غير صحيح");
    const title = input.title?.trim();
    if (!title) throw new Error("موضوع الطلب مطلوب");

    const r: RequestItem = {
      id: "r" + Date.now() + Math.floor(Math.random() * 1000),
      kind: input.kind,
      title,
      entityId: me.entityId,
      byId: me.id,
      at: "الآن",
      status: "بانتظار الرد",
      detail: input.detail?.trim() || "—",
    };
    await (await collections.requests()).insertOne({ ...r });
    await writeAudit(me.id, `رفع طلباً: ${r.kind}`, r.title, ipOf(request));

    // كل طلب يصل إلى الاختصاص المسؤول عنه، لا إلى قسم عام لا يخصه.
    const users = await collections.users();
    const targetRoles = r.kind === "حجز قاعة" ? ["halls"] : ["chief"];
    const targets = await users.find({ role: { $in: targetRoles }, active: true }).toArray();
    for (const t of targets) {
      const preferredSection =
        r.kind === "حجز قاعة" ? "halls" :
        r.kind === "موعد لدى المحافظ" ? "calendar" :
        r.kind === "طلب اجتماع" ? "meetings" :
        "assignments";
      const section = canAccessSection(t, "diwan", preferredSection)
        ? preferredSection
        : canAccessSection(t, "diwan", "overview")
          ? "overview"
          : null;
      await pushNotification({
        kind: r.kind === "حجز قاعة" ? "قاعة" : "مراسلة",
        title: `طلب جديد: ${r.kind}`, body: `«${r.title}» من ${me.title}.`,
        channel: "تنبيه التطبيق", toId: t.id,
        ...(section ? { link: { portal: "diwan" as const, section } } : {}),
      });
    }
    return { ok: true, request: r };
  });
}
