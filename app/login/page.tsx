"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, TriangleAlert, User,
} from "lucide-react";

const portalNames = {
  diwan: "مديرية المحافظة — الديوان",
  directorates: "مديريات المحافظة",
  admin: "لوحة التحكم",
} as const;
import { DarkStage } from "@/components/motion";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const portal = params.get("portal") as "diwan" | "directorates" | "admin" | null;

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
      let seen = "0";
      try { seen = localStorage.getItem("gov.welcomed") ?? "0"; } catch { /* محجوب */ }
      const home = portal ? `/${portal}/${portal === "diwan" ? "overview" : "entities"}/` : next ?? "/";
      router.replace(seen === "1" ? home : "/welcome/?next=" + encodeURIComponent(home));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تسجيل الدخول");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-crest"><Building2 size={26} /></div>
      {portal ? (
        <>
          <Link href="/" className="back-link"><ArrowRight size={15} /> تغيير مساحة العمل</Link>
          <p className="eyebrow">{portalNames[portal]}</p>
        </>
      ) : (
        <p className="eyebrow">محافظة حلب</p>
      )}
      <h1>منظومة العمل التنفيذي</h1>
      <p className="muted" style={{ marginBottom: 26 }}>
        أدخل بيانات حسابك للوصول إلى مساحة عملك وفق صلاحياتك.
      </p>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="username">اسم المستخدم</label>
          <div className="input-icon">
            <User size={17} />
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="governor"
              required
              autoFocus
              dir="ltr"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">كلمة المرور</label>
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
            />
            <button
              type="button"
              className="in-btn"
              onClick={() => setShow(!show)}
              aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="lock-note" style={{ background: "var(--danger-bg)", borderColor: "#f2cdc8", color: "#8c2a1e", marginBottom: 14 }}>
            <TriangleAlert size={16} style={{ color: "var(--danger)" }} />
            <span>{error}</span>
          </div>
        )}

        <button className="btn primary" style={{ width: "100%", height: 44 }} disabled={busy}>
          {busy ? "جارٍ التحقق…" : <>دخول <ArrowLeft size={17} /></>}
        </button>
      </form>

      <div className="sep" />
      <div className="grid" style={{ gap: 9 }}>
        <span className="row tiny muted" style={{ gap: 8 }}><ShieldCheck size={15} style={{ color: "var(--gold)" }} /> جلسة مؤمّنة تنتهي تلقائياً بعد ثماني ساعات</span>
        <span className="row tiny muted" style={{ gap: 8 }}><CheckCircle2 size={15} style={{ color: "var(--gold)" }} /> كل عملية دخول تُسجَّل في سجل التدقيق</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <DarkStage className="auth">
      <Suspense fallback={<div className="auth-card"><div className="skel" style={{ height: 320 }} /></div>}>
        <LoginForm />
      </Suspense>
      <footer className="auth-foot">تصميم وتنفيذ · ProoTech Agency</footer>
    </DarkStage>
  );
}
