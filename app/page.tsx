"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Landmark, Lock, Network } from "lucide-react";
import { portalsFor } from "@/lib/access";
import { useStore } from "@/lib/store";
import { DarkStage } from "@/components/motion";
import type { Portal } from "@/lib/types";

const cards: { portal: Portal; title: string; sub: string; icon: typeof Landmark; points: string[] }[] = [
  {
    portal: "diwan",
    title: "مديرية المحافظة",
    sub: "مكتب السيد المحافظ — الديوان المركزي",
    icon: Landmark,
    points: ["المواعيد والزيارات", "الاجتماعات والمحاضر", "القرارات والتوجيهات", "الملفات والمراسلات"],
  },
  {
    portal: "directorates",
    title: "مديريات المحافظة",
    sub: "المديريات والمؤسسات والجهات التابعة",
    icon: Network,
    points: ["التعليمات واللوائح", "المهام والردود", "الطلبات والتقارير", "متابعة تنفيذ التوجيهات"],
  },
];

const landing: Record<Portal, string> = { diwan: "overview", directorates: "entities", admin: "entities" };

export default function Gate() {
  const router = useRouter();
  const { me, ready, anon, error } = useStore();
  const allowed: Portal[] = ready ? portalsFor(me) : anon ? ["diwan", "directorates"] : [];

  function open(p: Portal) {
    if (!allowed.includes(p)) return;
    if (anon) { router.push(`/login/?portal=${p}`); return; }
    router.push(`/${p}/${landing[p]}/`);
  }

  if (!ready && !anon) {
    return (
      <div className="boot">
        <div className="boot-inner">
          <div className="boot-spin" />
          <b>جارٍ تحميل بيانات المحافظة…</b>
          {error && <p className="muted tiny" style={{ marginTop: 8 }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <DarkStage className="gate gate-citadel">
      <header className="gate-top gate-top-official">
        <div className="official-brand" aria-label="محافظة الرقة">
          <img src="/branding/raqqa-mark-white.svg" alt="" className="official-brand-mark" />
          <span className="official-brand-copy">
            <b>محافظة الرقة</b>
            <small>Raqqa Governorate</small>
          </span>
        </div>
      </header>

      <div className="gate-flag" aria-label="علم الجمهورية العربية السورية">
        <span className="flag-pole" />
        <span className="flag-cloth">
          <span className="flag-green" />
          <span className="flag-white"><i>★</i><i>★</i><i>★</i></span>
          <span className="flag-black" />
        </span>
      </div>

      <section className="gate-body gate-body-citadel">
        <div className="gate-head gate-head-hero">
          <p className="eyebrow">مرحباً بك في</p>
          <h1>منظومة العمل التنفيذي</h1>
          <p>اختر البوابة المناسبة للدخول إلى منظومة العمل التنفيذي</p>
        </div>

        <div className="gate-grid gate-grid-showcase">
          {cards.map((c) => {
            const locked = !allowed.includes(c.portal);
            const Icon = c.icon;
            return (
              <button
                key={c.portal}
                className={`portal-card portal-card-showcase ${locked ? "locked" : ""}`}
                onClick={() => open(c.portal)}
                aria-disabled={locked}
              >
                {locked && <Lock size={17} className="pc-lock" />}
                <div className="pc-icon-showcase"><Icon size={30} /></div>
                <div className="pc-titles">
                  <h2>{c.title}</h2>
                  <p className="pc-sub">{c.sub}</p>
                </div>
                <div className="pc-divider" />
                <div className="pc-list pc-list-showcase">
                  {c.points.map((p) => (
                    <span key={p}><Check size={15} />{p}</span>
                  ))}
                </div>
                <span className="pc-go pc-go-showcase">
                  {locked ? "لا تملك صلاحية الدخول" : anon ? "تسجيل الدخول" : "الدخول"} <ArrowLeft size={18} />
                </span>
              </button>
            );
          })}
        </div>

        <p className="gate-secure">
          <Lock size={13} /> بوابة رسمية آمنة · كل دخول يُسجَّل في سجل التدقيق
        </p>
      </section>
    </DarkStage>
  );
}
