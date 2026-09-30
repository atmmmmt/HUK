"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, TriangleAlert, User,
} from "lucide-react";
import { DarkStage } from "@/components/motion";

const portalNames = {
  diwan: "مديرية المحافظة — الديوان",
  directorates: "مديريات المحافظة",
  admin: "لوحة التحكم",
} as const;

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
    <div
      className="auth-card"
      style={{
        width: "min(390px, 100%)",
        padding: "28px 30px 30px",
        borderRadius: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
        <div
          className="auth-crest"
          style={{ width: 52, height: 52, marginBottom: 0, borderRadius: 13, flex: "none", padding: 5, overflow: "hidden" }}
        >
          <img src="/icons/icon.svg" alt="محافظة الرقة" style={{ width: "100%", height: "100%", display: "block", borderRadius: 9 }} />
        </div>
        {portal && (
          <Link
            href="/"
            className="back-link"
            style={{ marginBottom: 0, padding: 0, whiteSpace: "nowrap" }}
          >
            <ArrowRight size={14} /> تغيير مساحة العمل
          </Link>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            margin: "0 0 8px",
            color: "var(--gold-700)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {portal ? portalNames[portal] : "محافظة الرقة"}
        </p>
        <h1 style={{ fontSize: 25, marginBottom: 8 }}>منظومة العمل التنفيذي</h1>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.85 }}>
          أدخل بيانات حسابك للوصول إلى مساحة عملك وفق صلاحياتك.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 17 }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="username" style={{ display: "block", marginBottom: 7, fontSize: 13, fontWeight: 600 }}>
            اسم المستخدم
          </label>
          <div className="input-icon" style={{ minHeight: 48, borderRadius: 10 }}>
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
              style={{ height: 46 }}
            />
          </div>
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="password" style={{ display: "block", marginBottom: 7, fontSize: 13, fontWeight: 600 }}>
            كلمة المرور
          </label>
          <div className="input-icon" style={{ minHeight: 48, borderRadius: 10 }}>
            <LockKeyhole size={17} />
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              style={{ height: 46 }}
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
          <div
            className="lock-note"
            style={{ background: "var(--danger-bg)", borderColor: "#f2cdc8", color: "#8c2a1e", margin: 0 }}
          >
            <TriangleAlert size={16} style={{ color: "var(--danger)" }} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn primary"
          style={{ width: "100%", height: 46, borderRadius: 9, marginTop: 2, justifyContent: "center", gap: 8 }}
          disabled={busy}
        >
          {busy ? "جارٍ التحقق…" : <>دخول <ArrowLeft size={17} /></>}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <DarkStage className="auth">
      <Suspense fallback={<div className="auth-card"><div className="skel" style={{ height: 320 }} /></div>}>
        <LoginForm />
      </Suspense>
    </DarkStage>
  );
}
