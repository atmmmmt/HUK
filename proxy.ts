import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const key = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me",
);

const PUBLIC = ["/login", "/api/auth/login", "/api/health", "/offline.html"];
// شاشة اختيار مساحة العمل: تُفتح قبل تسجيل الدخول
const PUBLIC_EXACT = ["/", "/welcome"];

/**
 * فحص مبدئي للجلسة قبل الوصول إلى الصفحات.
 * التحقق الفعلي من الصلاحيات يجري في طبقة البيانات داخل كل مسار API.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const clean = pathname.replace(/\/$/, "") || "/";

  if (
    PUBLIC_EXACT.includes(clean) ||
    PUBLIC.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("gov_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, key, { algorithms: ["HS256"] });
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "انتهت الجلسة — يرجى تسجيل الدخول" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
