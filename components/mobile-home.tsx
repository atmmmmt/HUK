"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays, Check, DoorOpen, Inbox, ListTodo, RotateCcw, Stamp, StickyNote, TriangleAlert,
} from "lucide-react";
import { decisions, entityOf, letters } from "@/lib/lookup";
import { todaySchedule } from "@/lib/constants";
import { seesAssignment } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { Decision } from "@/lib/types";

const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ } };

/** مركز القيادة على الجوال: حلقة الإنجاز، الإجراءات السريعة، ورزمة القرارات القابلة للسحب */
export default function MobileToday() {
  const { assignments, me, decisionIds, resolveDecision } = useStore();
  const visible = assignments.filter((a) => seesAssignment(me, a));
  const open = visible.filter((a) => a.status !== "مُغلق");
  const late = visible.filter((a) => a.status === "متأخر" || a.escalation >= 2);
  const pct = open.length ? Math.round(open.reduce((s, a) => s + a.progress, 0) / open.length) : 100;
  const now = todaySchedule.find((s) => s.tone === "now");
  const next = todaySchedule.find((s) => s.tone !== "done" && s.tone !== "now");
  const canApprove = me.role === "governor" || me.role === "deputy" || me.role === "chief";
  const pending = decisions.filter((d) => decisionIds.includes(d.id) && d.awaiting === "governor");
  const unhandled = letters.filter((l) => !l.handled).length;

  return (
    <div className="m-today">
      <section className="mt-hero">
        <Ring value={pct} />
        <div className="mt-stats">
          <Link href="/diwan/assignments/" className="mt-stat"><b>{open.length}</b><span>تكليف مفتوح</span></Link>
          <Link href="/diwan/assignments/" className="mt-stat danger"><b>{late.length}</b><span>متأخر ومصعَّد</span></Link>
          <Link href="/diwan/correspondence/" className="mt-stat"><b>{unhandled}</b><span>كتاب وارد</span></Link>
        </div>
      </section>

      <nav className="mt-quick" aria-label="إجراءات سريعة">
        {[
          { href: "/diwan/decisions/", icon: Stamp, label: "القرارات", n: pending.length },
          { href: "/diwan/assignments/", icon: ListTodo, label: "التكليفات" },
          { href: "/diwan/calendar/", icon: CalendarDays, label: "التقويم" },
          { href: "/diwan/halls/", icon: DoorOpen, label: "القاعات" },
          { href: "/diwan/correspondence/", icon: Inbox, label: "الوارد", n: unhandled },
          { href: "/diwan/notes/", icon: StickyNote, label: "الملاحظات" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="mt-q" onClick={() => buzz(6)}>
            <span className="mt-q-ico"><q.icon size={21} />{q.n ? <i>{q.n}</i> : null}</span>
            <span>{q.label}</span>
          </Link>
        ))}
      </nav>

      {(now || next) && (
        <Link href="/diwan/calendar/" className="mt-now">
          <span className={`mt-now-dot ${now ? "live" : ""}`} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <small>{now ? "يجري الآن" : "التالي"} · <span className="ltr">{(now ?? next)!.time}</span></small>
            <b>{(now ?? next)!.title}</b>
            <em>{(now ?? next)!.place}</em>
          </span>
        </Link>
      )}

      {canApprove && pending.length > 0 && (
        <DecisionStack items={pending} onResolve={resolveDecision} />
      )}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setV(value)); return () => cancelAnimationFrame(t); }, [value]);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="mt-ring">
      <svg viewBox="0 0 128 128" width="128" height="128">
        <circle cx="64" cy="64" r={r} className="mt-ring-bg" />
        <circle
          cx="64" cy="64" r={r} className="mt-ring-fg"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="mt-ring-txt"><b>{value}<small>%</small></b><span>متوسط الإنجاز</span></div>
    </div>
  );
}

/* ───────── رزمة القرارات: اسحب يساراً للاعتماد، يميناً للإعادة ───────── */

function DecisionStack({
  items, onResolve,
}: {
  items: Decision[]; onResolve: (id: string, action: "approve" | "return") => Promise<void>;
}) {
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<0 | 1 | -1>(0);
  const start = useRef<number | null>(null);
  const top = items[0];

  async function commit(dir: 1 | -1) {
    if (fly) return;
    buzz(dir === 1 ? 18 : 10);
    setFly(dir);
    const id = top.id;
    window.setTimeout(async () => {
      try { await onResolve(id, dir === 1 ? "approve" : "return"); } catch { /* الرسالة من المتجر */ }
      setFly(0); setDx(0);
    }, 260);
  }

  const onDown = (e: React.PointerEvent) => { if (!fly) { start.current = e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); } };
  const onMove = (e: React.PointerEvent) => { if (start.current !== null) setDx(e.clientX - start.current); };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    // في الواجهة العربية: السحب نحو اليسار = اعتماد
    if (dx < -110) void commit(1);
    else if (dx > 110) void commit(-1);
    else setDx(0);
  };

  const x = fly ? -fly * 520 : dx;
  const hint = dx < -40 ? "approve" : dx > 40 ? "return" : "";

  return (
    <section className="mt-deck">
      <div className="mt-deck-head">
        <b>بانتظار قراركم</b>
        <span>{items.length} معاملة · اسحب البطاقة</span>
      </div>
      <div className="mt-stack">
        {items.slice(1, 3).reverse().map((d, i, arr) => (
          <div key={d.id} className="mt-card ghost" style={{ transform: `translateY(${(arr.length - i) * 10}px) scale(${1 - (arr.length - i) * 0.05})` }} />
        ))}
        <div
          key={top.id}
          className={`mt-card ${hint}`}
          style={{
            transform: `translateX(${x}px) rotate(${x / 22}deg)`,
            transition: start.current !== null ? "none" : "transform .35s cubic-bezier(.22,1,.36,1)",
          }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        >
          <span className="mt-stamp ok">اعتماد</span>
          <span className="mt-stamp back">إعادة</span>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className={`chip ${d_tone(top)}`}>{top.priority}</span>
            <span className="tiny muted">{top.age}</span>
          </div>
          <h3>{top.title}</h3>
          <p className="tiny muted" style={{ marginTop: 6 }}>{entityOf(top.entityId).name} · {top.source}</p>
          {top.amount && <div className="mt-amount">{top.amount}</div>}
        </div>
      </div>
      <div className="mt-deck-actions">
        <button className="mt-act back" onClick={() => void commit(-1)} aria-label="إعادة"><RotateCcw size={22} /></button>
        <button className="mt-act ok" onClick={() => void commit(1)} aria-label="اعتماد"><Check size={26} /></button>
      </div>
      <p className="mt-deck-tip"><TriangleAlert size={13} /> كل قرار يُسجَّل في سجل التدقيق باسمكم</p>
    </section>
  );
}

function d_tone(d: Decision) {
  return d.priority === "عاجل جداً" ? "danger" : d.priority === "عاجل" ? "warn" : "navy";
}
