"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, TriangleAlert, User } from "lucide-react";
import { DarkStage } from "@/components/motion";
import { canAccessSection } from "@/lib/access";
import type { Person, Portal } from "@/lib/types";

function LoginForm() {
  const params = useSearchParams();
  const portal = params.get("portal");
  const next = params.get("next");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "تعذّر تسجيل الدخول");
      try { sessionStorage.removeItem("gov.usage.open"); } catch { /* محجوب */ }

      // الروابط القديمة تبقى صالحة، لكن اختيار البوابة ليس مطلوباً.
      // لا نقبل وجهة خارجية ولا قسماً لا يملكه الدور.
      const requested = next?.match(/^\/(diwan|directorates|admin)\/([a-z-]+)\/?(?:\?[^#]*)?(?:#.*)?$/);
      const safeNext = requested && data.user && canAccessSection(data.user as Person, requested[1] as Portal, requested[2]) ? next : null;
      const requestedHome = portal && ["diwan", "directorates", "admin"].includes(portal) && typeof data.homes?.[portal] === "string" ? data.homes[portal] : null;
      const home = safeNext ?? requestedHome ?? data.home;
      if (typeof home !== "string" || !/^\/(diwan|directorates|admin)\/[a-z-]+\/?(?:[?#]|$)/.test(home)) {
        throw new Error("لا توجد مساحة عمل مخصصة لهذا الحساب. راجع مدير النظام.");
      }
      // إعادة تحميل كاملة حتى لا يبقى Store الحساب السابق في الذاكرة.
      window.location.replace(home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تسجيل الدخول");
      setBusy(false);
    }
  }

  return (
    <section className="unified-login" aria-labelledby="login-title">
      <header className="unified-brand">
        <img src="/branding/raqqa-mark-white.svg" alt="" width={60} height={60} />
        <div><b>محافظة الرقة</b><span>Raqqa Governorate</span></div>
      </header>
      <div className="auth-card unified-auth-card">
        <div className="unified-intro">
          <span className="unified-kicker">منظومة العمل التنفيذي</span>
          <h1 id="login-title">تسجيل الدخول</h1>
          <p>أدخل بيانات حسابك للانتقال إلى مساحة عملك.</p>
        </div>
        <form onSubmit={submit} className="unified-form">
          <div className="field">
            <label htmlFor="username">اسم المستخدم</label>
            <div className="input-icon">
              <User size={19} aria-hidden="true" />
              <input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username}
                onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" required dir="ltr" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">كلمة المرور</label>
            <div className="input-icon">
              <LockKeyhole size={19} aria-hidden="true" />
              <input id="password" type={show ? "text" : "password"} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" required dir="ltr" />
              <button type="button" className="in-btn" onClick={() => setShow(!show)}
                aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={show}>
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>
          {error && <div className="unified-error" role="alert"><TriangleAlert size={18} /><span>{error}</span></div>}
          <button type="submit" className="btn primary unified-submit" disabled={busy} aria-busy={busy}>
            {busy ? "جارٍ التحقق…" : <>تسجيل الدخول <ArrowLeft size={19} /></>}
          </button>
        </form>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <DarkStage className="auth unified-auth">
      <Suspense fallback={<div className="auth-card"><div className="skel" style={{ height: 320 }} /></div>}>
        <LoginForm />
      </Suspense>
    </DarkStage>
  );
}
