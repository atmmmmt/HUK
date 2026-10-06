import bcrypt from "bcryptjs";
import { collections, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canManageSystem } from "@/lib/access";
import type { Classification, Person, RoleKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: RoleKey[] = ["governor", "deputy", "assistant", "secgen", "chief", "followup", "director", "head", "employee", "area", "registry", "protocol", "halls", "admin"];

/** إنشاء حساب جديد — من لوحة التحكم */
export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageSystem(me)) throw new ForbiddenError("إنشاء الحسابات من صلاحية مدير النظام");
    const input = await body<{ name: string; title: string; username: string; password: string; role: RoleKey; entityId: string; unit?: string; clearance?: Classification; phone?: string }>(request);

    const name = input.name?.trim();
    const title = input.title?.trim() || name;
    const username = input.username?.trim().toLowerCase();
    if (!name) throw new Error("الاسم المعروض مطلوب");
    if (!username || !/^[a-z][a-z0-9._-]{2,31}$/.test(username)) throw new Error("اسم المستخدم: أحرف إنكليزية صغيرة وأرقام ونقطة، من 3 إلى 32 حرفاً");
    if (!input.password || input.password.length < 8) throw new Error("كلمة المرور 8 أحرف على الأقل");
    if (!ROLES.includes(input.role)) throw new Error("الدور غير صحيح");
    if (input.role === "governor" && await (await collections.users()).findOne({ role: "governor", active: { $ne: false } })) {
      throw new ForbiddenError("يوجد حساب محافظ فعّال مسبقاً؛ لا يمكن إنشاء محافظ ثانٍ من لوحة النظام");
    }

    const entity = await (await collections.entities()).findOne({ id: input.entityId });
    if (!entity) throw new Error("الجهة غير موجودة");

    const users = await collections.users();
    if (await users.findOne({ username })) throw new Error("اسم المستخدم مستخدم مسبقاً");

    const person: Person = {
      id: "p" + Date.now().toString().slice(-7),
      name, title,
      entityId: entity.id,
      ...(input.unit?.trim() ? { unit: input.unit.trim() } : {}),
      role: input.role,
      phone: input.phone?.trim() || "—",
      ext: "—",
      office: "—",
      duties: [],
      clearance: input.clearance === "سرّي" ? "سرّي" : "عادي",
      avgResponseHours: 0,
      initials: name.replace(/^(السيد|د\.|م\.|أ\.)\s*/, "").trim().charAt(0) || "؟",
    } as Person;

    await users.insertOne({ ...person, username, passwordHash: await bcrypt.hash(input.password, 10), active: true });
    await (await collections.entities()).updateOne({ id: entity.id }, { $inc: { staffCount: 1 } });
    await writeAudit(me.id, `أنشأ حساباً (${input.role})`, username, ipOf(request));
    return { ok: true, person: { ...person, active: true } };
  });
}
