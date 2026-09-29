"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, Building2, Check, ClipboardCheck, DoorOpen, Network, ShieldCheck,
} from "lucide-react";
import { DarkStage } from "@/components/motion";

const steps = [
  {
    kicker: "مرحباً بك",
    title: ["منظومة العمل التنفيذي", "لمحافظة حلب"],
    body: "مساحة واحدة تجمع المهام والاجتماعات والقاعات والمراسلات، فتعرف في كل لحظة ما أُنجز وما تأخّر ومن المسؤول.",
    points: [
      "لكل تكليف مالك وموعد ومعيار إغلاق واضح",
      "لكل عمل أثر مسجّل باسم صاحبه",
      "لا شيء يضيع بين الورق والمجموعات",
    ],
    art: "portals" as const,
  },
  {
    kicker: "بوابتان منفصلتان",
    title: ["الديوان والمديريات", "كلٌّ في مساحته"],
    body: "مدير المديرية لا يرى الديوان ولا المديريات الأخرى. والعبور الوحيد بينهما هو التكليف الرسمي والرد عليه — عدا السيد المحافظ فيرى ما تحتهما بلا استثناء.",
    points: [
      "مديرية المحافظة: مكتب السيد المحافظ والديوان المركزي",
      "مديريات المحافظة: المديريات المركزية والمناطق والأحياء",
      "لوحة التحكم: الجهات والأدوار والصلاحيات",
    ],
    art: "split" as const,
  },
  {
    kicker: "المتابعة حسب الوصول",
    title: ["تعرف مَن استلم", "ومَن تأخّر"],
    body: "لكل تكليف سلسلة وصول كاملة: أُرسل، وصل الجهاز، قُرئ، أُقرّ الاستلام، بدأ التنفيذ، سُلّم. وعند انتهاء المهلة يصلك إشعار مراجعة لتراجع المكلَّف.",
    points: [
      "العاجل: رد خلال 24 ساعة · الهام: 48 ساعة",
      "العادي: جدول زمني يُحدَّد عند الإسناد",
      "إشعار على الجوال في كل خطوة",
    ],
    art: "chain" as const,
  },
];

export default function Welcome() {
  const router = useRouter();
  const [next] = useState(() => {
    if (typeof window === "undefined") return "/";
    return new URLSearchParams(window.location.search).get("next") ?? "/";
  });
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;

  function finish() {
    try { localStorage.setItem("gov.welcomed", "1"); } catch { /* محجوب */ }
    router.push(next);
  }

  return (
    <DarkStage className="wel">
      <nav className="wel-nav">
        <div className="brand">
          <span className="brand-mark"><Building2 size={22} /></span>
          <span>
            <b>محافظة حلب</b>
            <span>منظومة العمل التنفيذي</span>
          </span>
        </div>
        <button className="wel-skip" onClick={finish}>تخطّي المقدمة</button>
      </nav>

      <section className="wel-stage">
        <div className="wel-copy" key={i}>
          <span className="step-n" style={{ animation: "riseSm .5s var(--e-out) both" }}>
            <span>{i + 1}</span>
            <span style={{ opacity: .5 }}>/ {steps.length}</span>
            <span style={{ marginInlineStart: 8 }}>{step.kicker}</span>
          </span>

          <h1 style={{ animation: "rise .6s .05s var(--e-out) both" }}>
            {step.title[0]}
            <br />
            <em>{step.title[1]}</em>
          </h1>

          <p style={{ animation: "rise .6s .12s var(--e-out) both" }}>{step.body}</p>

          <ul className="wel-points" style={{ animation: "rise .6s .2s var(--e-out) both" }}>
            {step.points.map((p) => (
              <li key={p}><Check size={16} />{p}</li>
            ))}
          </ul>

          <div className="wel-actions" style={{ animation: "rise .6s .28s var(--e-out) both" }}>
            {last ? (
              <button className="btn gold lg" onClick={finish}>
                ابدأ العمل <ArrowLeft size={18} />
              </button>
            ) : (
              <button className="btn gold lg" onClick={() => setI(i + 1)}>
                التالي <ArrowLeft size={18} />
              </button>
            )}
            {i > 0 && (
              <button className="btn ghost lg" style={{ background: "transparent", borderColor: "rgba(255,255,255,.2)", color: "#c9d8ea" }} onClick={() => setI(i - 1)}>
                <ArrowRight size={18} /> السابق
              </button>
            )}
          </div>
        </div>

        <div className="wel-art plx" data-depth="0.35" key={`art-${i}`}>
          <Art kind={step.art} />
        </div>
      </section>

      <div className="wel-dots">
        {steps.map((s, k) => (
          <button
            key={s.kicker}
            className={k === i ? "on" : ""}
            onClick={() => setI(k)}
            aria-label={`الخطوة ${k + 1}`}
          />
        ))}
      </div>
    </DarkStage>
  );
}

function Art({ kind }: { kind: "portals" | "split" | "chain" }) {
  if (kind === "portals") {
    return (
      <>
        <div className="art-card a pop" style={{ animationDelay: ".15s" }}>
          <span className="art-chip" style={{ background: "var(--gold-100)", color: "var(--gold-700)" }}>
            <ClipboardCheck size={12} /> تكليف
          </span>
          <b style={{ display: "block", fontSize: 13.5, margin: "10px 0 6px" }}>دراسة شبكة الطرق الشمالية</b>
          <div className="bar"><i style={{ width: "45%" }} /></div>
          <span style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8, display: "block" }}>م. أحمد مصطفى · يستحق 30 أيلول</span>
        </div>

        <div className="art-card b pop" style={{ animationDelay: ".3s" }}>
          <span className="art-chip" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
            <Check size={12} /> مُغلق
          </span>
          <b style={{ display: "block", fontSize: 13.5, margin: "10px 0 6px" }}>تجهيز قاعة المؤتمرات</b>
          <div className="bar"><i className="ok" style={{ width: "100%" }} /></div>
        </div>

        <div className="art-card c pop" style={{ animationDelay: ".45s" }}>
          <span className="art-chip" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>متأخر</span>
          <b style={{ display: "block", fontSize: 13.5, margin: "10px 0 0" }}>مراجعة العقود القانونية</b>
        </div>
      </>
    );
  }

  if (kind === "split") {
    return (
      <>
        <div className="art-card a pop" style={{ animationDelay: ".15s", width: 240 }}>
          <span className="art-chip" style={{ background: "var(--navy-100)", color: "var(--navy-700)" }}>
            <Building2 size={12} /> الديوان
          </span>
          <b style={{ display: "block", fontSize: 13.5, margin: "10px 0 8px" }}>مديرية المحافظة</b>
          {["التقويم والمواعيد", "الاجتماعات والمخرجات", "الوارد والصادر"].map((t) => (
            <div key={t} style={{ fontSize: 11.5, color: "var(--muted)", padding: "3px 0" }}>· {t}</div>
          ))}
        </div>

        <div className="art-card b pop" style={{ animationDelay: ".3s", width: 240 }}>
          <span className="art-chip" style={{ background: "var(--gold-100)", color: "var(--gold-700)" }}>
            <Network size={12} /> المديريات
          </span>
          <b style={{ display: "block", fontSize: 13.5, margin: "10px 0 8px" }}>مديريات المحافظة</b>
          {["الوارد إلينا", "المهام الداخلية", "الردود والتقارير"].map((t) => (
            <div key={t} style={{ fontSize: 11.5, color: "var(--muted)", padding: "3px 0" }}>· {t}</div>
          ))}
        </div>

        <div className="art-card c pop" style={{ animationDelay: ".45s", width: 200, insetInlineStart: "26%" }}>
          <span className="art-chip" style={{ background: "var(--plum-bg)", color: "var(--plum)" }}>
            <ShieldCheck size={12} /> المحافظ
          </span>
          <b style={{ display: "block", fontSize: 12.5, margin: "8px 0 0", lineHeight: 1.6 }}>يرى البوابتين معاً بلا استثناء</b>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="art-card a pop" style={{ animationDelay: ".15s", width: 272 }}>
        <b style={{ display: "block", fontSize: 13, marginBottom: 12 }}>سلسلة الوصول</b>
        {[
          { t: "أُرسل", ok: true },
          { t: "وصل الجهاز", ok: true },
          { t: "قُرئ", ok: true },
          { t: "أُقرّ الاستلام", ok: false },
        ].map((s) => (
          <div key={s.t} className="row" style={{ gap: 9, padding: "5px 0" }}>
            <span style={{
              width: 9, height: 9, borderRadius: "50%", flex: "none",
              background: s.ok ? "var(--ok)" : "var(--gold)",
            }} />
            <span style={{ fontSize: 12, color: s.ok ? "var(--ok)" : "var(--ink)", fontWeight: s.ok ? 600 : 700 }}>{s.t}</span>
          </div>
        ))}
      </div>

      <div className="art-card b pop" style={{ animationDelay: ".3s", width: 236 }}>
        <span className="art-chip" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
          <Bell size={12} /> مراجعة مستحقة
        </span>
        <b style={{ display: "block", fontSize: 12.5, margin: "10px 0 0", lineHeight: 1.65 }}>
          انتهت المهلة — راجع المكلَّف: ما الذي أُنجز؟
        </b>
      </div>

      <div className="art-card c pop" style={{ animationDelay: ".45s", width: 190 }}>
        <span className="art-chip" style={{ background: "var(--teal-bg)", color: "var(--teal)" }}>
          <DoorOpen size={12} /> قاعة
        </span>
        <b style={{ display: "block", fontSize: 12.5, margin: "8px 0 0" }}>حجز مؤكد · 10:00</b>
      </div>
    </>
  );
}
