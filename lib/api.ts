import "server-only";
import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "./session";

/** يلفّ معالج المسار ويحوّل الأخطاء إلى استجابات عربية واضحة */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "انتهت الجلسة — يرجى تسجيل الدخول" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    console.error("[api]", message);
    const isConn = /ECONNREFUSED|ENOTFOUND|ServerSelection|MONGODB_URI|timed out/i.test(message);
    return NextResponse.json(
      { error: isConn ? "تعذّر الاتصال بقاعدة البيانات — تأكّد من رابط MONGODB_URI" : message },
      { status: isConn ? 503 : 400 },
    );
  }
}

export async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("صيغة الطلب غير صحيحة");
  }
}

export function ipOf(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "—"
  );
}
