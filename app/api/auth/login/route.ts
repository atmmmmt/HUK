import bcrypt from "bcryptjs";
import { collections, writeAudit, writeUsageEvent } from "@/lib/db";
import { createSession } from "@/lib/session";
import { homeSectionFor, portalsFor } from "@/lib/access";
import { body, handle, ipOf } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const { username, password } = await body<{ username: string; password: string }>(request);

    if (!username?.trim() || !password) {
      throw new Error("أدخل اسم المستخدم وكلمة المرور");
    }

    const users = await collections.users();
    const user = await users.findOne({ username: username.trim().toLowerCase() });

    // نفس الرسالة في الحالتين حتى لا يُكشف وجود الحساب من عدمه
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
    if (!user.active) {
      throw new Error("هذا الحساب معطّل — راجع مدير النظام");
    }

    await Promise.all([
      createSession(user),
      writeUsageEvent(user.id, "login", { path: "/login" }).catch(() => {}),
      writeAudit(user.id, "سجّل الدخول", user.username, ipOf(request)),
    ]);

    const homes = Object.fromEntries(
      portalsFor(user).map((portal) => {
        const section = homeSectionFor(user, portal);
        return [portal, section ? `/${portal}/${section}/` : null];
      }),
    );
    const firstHome = Object.values(homes).find((x): x is string => typeof x === "string") ?? "/";

    return {
      ok: true,
      user: { id: user.id, name: user.name, title: user.title, role: user.role, entityId: user.entityId },
      homes,
      home: firstHome,
    };
  });
}
