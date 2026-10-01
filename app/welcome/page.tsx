"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, BellRing, Check, LayoutGrid, Network } from "lucide-react";

/** المقدمة: ثلاث شاشات قصيرة، خفيفة، تُسحب بالإصبع */
const steps = [
  {
    icon: LayoutGrid,
    title: "كل العمل في مكان واحد",
    body: "المهام والاجتماعات والقاعات والمراسلات — تعرف في كل لحظة ما أُنجز وما تأخّر ومن المسؤول.",
    points: ["لكل تكليف مالك وموعد ومعيار إغلاق", "لكل عمل أثر مسجّل باسم صاحبه"],
  },
  {
    icon: Network,
    title: "الديوان والمديريات",
    body: "لكل جهة مساحتها، والعبور بينهما بالتكليف الرسمي والرد عليه. والسيد المحافظ يرى الجميع.",
    points: ["مديرية المحافظة: مكتب المحافظ والديوان", "مديريات المحافظة: المديريات والمناطق والأحياء"],
  },
  {
    icon: BellRing,
    title: "متابعة لحظة بلحظة",
    body: "تعرف من استلم ومن تأخّر، ويصلك إشعار عند انتهاء أي مهلة لتراجع المكلَّف.",
    points: ["العاجل: رد خلال 24 ساعة", "الهام: خلال 48 ساعة"],
  },
];

export default function Welcome() {
  const router = useRouter();
  const [next] = useState(() => {
    if (typeof window === "undefined") return "/";
    return new URLSearchParams(window.location.search).get("next") ?? "/";
  });
  const [i, setI] = useState(0);
  const x0 = useRef<number | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;
  const Icon = step.icon;

  function finish() {
    try { localStorage.setItem("gov.welcomed", "1"); } catch { /* محجوب */ }
    router.push(next);
  }

  // السحب: نحو اليسار للتالي ونحو اليمين للسابق (واجهة عربية)
  const onTouchStart = (e: React.TouchEvent) => { x0.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (x0.current === null) return;
    const dx = e.changedTouches[0].clientX - x0.current;
    x0.current = null;
    if (dx < -50 && !last) setI(i + 1);
    else if (dx > 50 && i > 0) setI(i - 1);
  };

  return (
    <main className="onb" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="onb-top">
        <span className="onb-brand">
          <img src="/icons/icon.svg" alt="" width={34} height={34} />
          <b>محافظة الرقة</b>
        </span>
        {!last && <button className="onb-skip" onClick={finish}>تخطّي</button>}
      </header>

      <section className="onb-body" key={i}>
        <div className="onb-art"><Icon size={44} strokeWidth={1.6} /></div>
        <h1>{step.title}</h1>
        <p>{step.body}</p>
        <ul>
          {step.points.map((p) => <li key={p}><Check size={15} />{p}</li>)}
        </ul>
      </section>

      <footer className="onb-foot">
        <div className="onb-dots" role="tablist" aria-label="الخطوات">
          {steps.map((s, k) => (
            <button key={s.title} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={`الخطوة ${k + 1}`} aria-selected={k === i} role="tab" />
          ))}
        </div>
        <button className="onb-next" onClick={last ? finish : () => setI(i + 1)}>
          {last ? "ابدأ العمل" : "التالي"} <ArrowLeft size={18} />
        </button>
      </footer>
    </main>
  );
}
