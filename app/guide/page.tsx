"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, ChevronDown, Search, Sparkles } from "lucide-react";
import { guideTopics, roleGuides, topicsFor, type GuideTopic } from "@/lib/guide";
import { useStore } from "@/lib/store";

const norm = (s: string) =>
  s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْـ]/g, "");

export default function GuidePage() {
  const { me, ready } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>("start");

  const role = ready ? me.role : null;
  const mine = role ? topicsFor(role) : guideTopics;
  const rest = role ? guideTopics.filter((t) => !mine.includes(t)) : [];

  const match = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return null;
    return guideTopics.filter((t) => norm([t.title, t.summary, ...t.steps, ...(t.tips ?? [])].join(" ")).includes(n));
  }, [q]);

  const card = role ? roleGuides[role] : null;

  return (
    <div className="guide">
      <header className="guide-hero">
        <Link href="/" className="guide-back"><ArrowLeft size={16} style={{ transform: "scaleX(-1)" }} /> المنظومة</Link>
        <span className="guide-badge"><BookOpen size={15} /> دليل الاستخدام</span>
        <h1>كل ما تحتاجه لتعمل بالمنظومة</h1>
        <p>اختر الموضوع، أو اسأل المساعد الذكي ✦ من أي شاشة وهو يدلّك وينفّذ عنك.</p>
        <label className="guide-search">
          <Search size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الدليل… مثلاً: اعتماد، قاعة، تكليف" />
        </label>
      </header>

      <main className="guide-body">
        {card && !match && (
          <section className="guide-role">
            <small>دورك في المنظومة</small>
            <b>{me.name} · {card.title}</b>
            <ul>{card.daily.map((d) => <li key={d}>{d}</li>)}</ul>
          </section>
        )}

        {match ? (
          <>
            <h2 className="guide-h">نتائج البحث ({match.length})</h2>
            {match.length === 0 && <p className="guide-empty">لا نتائج — جرّب كلمة أخرى أو اسأل المساعد الذكي.</p>}
            {match.map((t) => <Topic key={t.id} t={t} open={true} onToggle={() => {}} />)}
          </>
        ) : (
          <>
            <h2 className="guide-h">{role ? "ما يخصّك" : "المواضيع"}</h2>
            {mine.map((t) => <Topic key={t.id} t={t} open={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)} />)}
            {rest.length > 0 && (
              <>
                <h2 className="guide-h muted-h">أقسام لا تخصّ دورك مباشرة</h2>
                {rest.map((t) => <Topic key={t.id} t={t} open={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)} />)}
              </>
            )}
          </>
        )}

        <p className="guide-foot"><Sparkles size={14} /> ما وجدت جوابك؟ اضغط زر المساعد الذكي في أي شاشة واكتب سؤالك.</p>
      </main>
    </div>
  );
}

function Topic({ t, open, onToggle }: { t: GuideTopic; open: boolean; onToggle: () => void }) {
  return (
    <article className={`guide-topic ${open ? "open" : ""}`}>
      <button className="guide-topic-head" onClick={onToggle} aria-expanded={open}>
        <span>
          <b>{t.title}</b>
          <small>{t.summary}</small>
        </span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="guide-topic-body">
          <ol>{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          {t.tips && <ul className="guide-tips">{t.tips.map((s) => <li key={s}>{s}</li>)}</ul>}
          {t.where && (
            <Link href={`/${t.where.portal}/${t.where.section}/`} className="guide-go">
              افتح القسم <ArrowLeft size={15} />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
