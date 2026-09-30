"use client";

import { useEffect, useState } from "react";

/** شاشة التشغيل: تظهر مرة واحدة في كل جلسة على الجوال، ثم تتلاشى */
export default function Splash() {
  const [phase, setPhase] = useState<"off" | "on" | "out">("off");

  useEffect(() => {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    try {
      if (sessionStorage.getItem("gov.splash")) return;
      sessionStorage.setItem("gov.splash", "1");
    } catch { /* محجوب */ }
    setPhase("on");
    const a = window.setTimeout(() => setPhase("out"), 1500);
    const b = window.setTimeout(() => setPhase("off"), 2100);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []);

  if (phase === "off") return null;
  return (
    <div className={`splash ${phase === "out" ? "out" : ""}`} aria-hidden>
      <div className="splash-mark">
        <img src="/branding/raqqa-mark-white.svg" alt="" width={84} height={84} />
      </div>
      <b>محافظة الرقة</b>
      <span>منظومة العمل التنفيذي</span>
      <i className="splash-line" />
    </div>
  );
}
