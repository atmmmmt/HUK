"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Check, Landmark, Lock, LogOut, Network, ShieldCheck,
} from "lucide-react";
import { entityOf } from "@/lib/lookup";
import { portalsFor, reachLabel } from "@/lib/access";
import { useStore } from "@/lib/store";
import { DarkStage } from "@/components/motion";
import type { Portal } from "@/lib/types";

const cards: { portal: Portal; title: string; sub: string; icon: typeof Landmark; points: string[] }[] = [
  {
    portal: "diwan", title: "مديرية المحافظة", sub: "مكتب السيد المحافظ — الديوان المركزي", icon: Landmark,
    points: ["لوحة اليوم والمواعيد والقرارات المعلّقة", "الاجتماعات ومحاضرها ومخرجاتها", "الوارد والصادر والإحالات", "التكليفات الصادرة إلى المديريات"],
  },
  {
    portal: "directorates", title: "مديريات المحافظة", sub: "المديريات والمؤسسات والجهات التابعة", icon: Network,
    points: ["التكليفات الواردة من الديوان وحالتها", "المهام الداخلية وتوزيعها على الموظفين", "رفع الردود والتقارير والمرفقات", "طلب حجز قاعة أو موعد لدى المحافظ"],
  },
];

const landing: Record<Portal, string> = { diwan: "overview", directorates: "entities", admin: "entities" };

export default function Gate() {
  const router = useRouter();
  const { me, ready, anon, error, logout } = useStore();
  // قبل تسجيل الدخول تُعرض المساحات العامة فقط، ولوحة التحكم تبقى عبر رابطها المباشر.
  const allowed: Portal[] = ready ? portalsFor(me) : anon ? ["diwan", "directorates"] : [];

  function open(p: Portal) {
    if (!allowed.includes(p)) return;
    // قبل الدخول: ينتقل إلى تسجيل الدخول محمّلاً بمساحة العمل المختارة
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
    <DarkStage className="gate">
      <header className="gate-top">
        <div className="brand">
          <span className="brand-mark"><Building2 size={22} /></span>
          <div>
            <b>محافظة حلب</b>
            <span>منظومة العمل التنفيذي</span>
          </div>
        </div>
        <span className="tag-pill">{anon ? "اختر مساحة عملك للمتابعة" : "الإصدار 1.0 · بيئة عرض"}</span>
      </header>

      <section className="gate-body">
        <div className="gate-head">
          <p className="eyebrow">مرحباً بك</p>
          <h1>اختر <em>مساحة العمل</em> التي تريد الدخول إليها</h1>
          <p>البوابتان منفصلتان تماماً في البيانات والمستخدمين. العبور الوحيد بينهما هو التكليف الرسمي والرد عليه — عدا السيد المحافظ فيرى ما تحتهما بلا استثناء.</p>
        </div>

        <div className="gate-grid">
          {cards.map((c) => {
            const locked = !allowed.includes(c.portal);
            const Icon = c.icon;
            return (
              <button
                key={c.portal}
                className={`portal-card ${locked ? "locked" : ""}`}
                onClick={() => open(c.portal)}
                aria-disabled={locked}
              >
                {locked && <Lock size={17} className="pc-lock" />}
                <div className="pc-icon"><Icon size={26} /></div>
                <h2>{c.title}</h2>
                <p className="pc-sub">{c.sub}</p>
                <div className="pc-list">
                  {c.points.map((p) => (
                    <span key={p}><Check size={15} />{p}</span>
                  ))}
                </div>
                <span className="pc-go">
                  {locked ? "لا تملك صلاحية الدخول" : anon ? "تسجيل الدخول" : "الدخول"} <ArrowLeft size={17} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="gate-foot">
        {anon ? (
          <span className="who">
            <ShieldCheck size={15} style={{ color: "var(--gold)" }} />
            اختر مساحة العمل ثم أدخل باسم المستخدم وكلمة المرور
          </span>
        ) : (
          <div className="who">
            <span className="who-label">أنت داخل بصفة</span>
            <span className="who-chip">
              <span className="ava sm gold">{me.initials}</span>
              <span>
                <b style={{ fontSize: 13 }}>{me.name}</b>
                <small style={{ display: "block", fontSize: 11, color: "#9fb4d0" }}>{me.title}</small>
              </span>
            </span>
            <span className="chip gold" style={{ background: "rgba(201,163,78,.16)", color: "var(--gold-2)" }}>
              <ShieldCheck size={13} /> {reachLabel(me, entityOf(me.entityId).short)}
            </span>
            <button className="who-chip" onClick={() => void logout()}>
              <LogOut size={15} /> خروج
            </button>
          </div>
        )}
      </footer>
    </DarkStage>
  );
}
