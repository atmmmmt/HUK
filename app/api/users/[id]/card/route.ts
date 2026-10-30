import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { collections, writeAudit } from "@/lib/db";
import { ForbiddenError, requireUser } from "@/lib/session";
import { body, handle, ipOf } from "@/lib/api";
import { canManageSystem } from "@/lib/access";
import type { Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** حروف لا تتشابه عند القراءة من بطاقة مطبوعة (لا 0/O ولا 1/l/I) */
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newPassword() {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

/** إصدار بطاقة دخول: يُسجَّل اسم شاغل المنصب ورقمه وتُولَّد كلمة مرور جديدة تُسقط جلساته القديمة */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageSystem(me)) throw new ForbiddenError("إصدار بطاقات الدخول من صلاحية مدير النظام");
    const { id } = await params;
    if (id === me.id) throw new Error("لا تصدر بطاقة لحسابك من هنا");
    const input = await body<{ name: string; phone: string }>(request);

    const name = input.name?.trim();
    const phone = input.phone?.trim();
    if (!name || name.length < 3) throw new Error("اكتب اسم الشخص الكامل");
    if (!phone || phone.replace(/\D/g, "").length < 7) throw new Error("رقم الجوال غير صحيح");

    const users = await collections.users();
    const u = await users.findOne({ id });
    if (!u) throw new Error("الحساب غير موجود");

    const password = newPassword();
    const initials = name.replace(/^(السيد|د\.|م\.|أ\.)\s*/, "").trim().charAt(0) || "؟";
    await users.updateOne(
      { id },
      { $set: { name, phone, initials, namedByAdmin: true, contacted: true, passwordHash: await bcrypt.hash(password, 10) }, $inc: { sessionVersion: 1 } },
    );
    await writeAudit(me.id, "أصدر بطاقة دخول", u.username, ipOf(request));

    const person: Person & { active: boolean } = { ...stripCreds(u), name, phone, initials, namedByAdmin: true, contacted: true };
    return { ok: true, person, username: u.username, password };
  });
}

function stripCreds<T extends { passwordHash?: string; username?: string; _id?: unknown }>(u: T) {
  const { passwordHash: _h, username: _u, _id, ...rest } = u;
  return rest as unknown as Person & { active: boolean };
}
