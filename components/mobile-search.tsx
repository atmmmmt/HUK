"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CalendarDays, ListTodo, Search, User, X } from "lucide-react";
import { entities, entityOf, meetings, people } from "@/lib/lookup";
import { seesAssignment } from "@/lib/access";
import { useStore } from "@/lib/store";

/** يطبّع النص العربي حتى يجد «احمد» كلمة «أحمد» */
const norm = (s: string) =>
  s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْـ]/g, "");

type Hit = { key: string; href: string; icon: typeof User; title: string; sub: string; group: string };

/** بحث شامل بملء الشاشة: التكليفات والأشخاص والجهات والاجتماعات من أول حرف */
export default function MobileSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { assignments, me } = useStore();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = window.setTimeout(() => input.current?.focus(), 120);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [open, onClose]);

  const hits = useMemo<Hit[]>(() => {
    const n = norm(q.trim());
    if (!n) return [];
    const has = (...xs: (string | undefined)[]) => xs.some((x) => x && norm(x).includes(n));
    const out: Hit[] = [];
    assignments.filter((a) => seesAssignment(me, a) && has(a.title, a.ref, a.source)).slice(0, 6).forEach((a) =>
      out.push({ key: a.id, href: "/diwan/assignments/", icon: ListTodo, title: a.title, sub: `${a.ref} · ${entityOf(a.entityId).short} · ${a.status}`, group: "التكليفات" }));
    people.filter((p) => has(p.name, p.title, p.unit)).slice(0, 5).forEach((p) =>
      out.push({ key: p.id, href: "/diwan/people/", icon: User, title: p.name, sub: `${p.title} · ${entityOf(p.entityId).short}`, group: "الأشخاص" }));
    entities.filter((e) => has(e.name, e.short)).slice(0, 4).forEach((e) =>
      out.push({ key: e.id, href: "/directorates/entities/", icon: Building2, title: e.name, sub: e.kind, group: "الجهات" }));
    meetings.filter((m) => has(m.title, m.kind)).slice(0, 4).forEach((m) =>
      out.push({ key: m.id, href: "/diwan/meetings/", icon: CalendarDays, title: m.title, sub: `${m.day} · ${m.time}`, group: "الاجتماعات" }));
    return out;
  }, [q, assignments, me]);

  if (!open) return null;
  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    <div className="msearch" role="dialog" aria-label="بحث">
      <div className="msearch-bar">
        <label>
          <Search size={18} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن تكليف، شخص، جهة…" enterKeyHint="search" />
          {q && <button onClick={() => setQ("")} aria-label="مسح"><X size={16} /></button>}
        </label>
        <button className="msearch-cancel" onClick={onClose}>إلغاء</button>
      </div>

      <div className="msearch-body">
        {!q.trim() && (
          <div className="msearch-hint">
            <b>ابحث في كل المنظومة</b>
            <div className="msearch-chips">
              {["الطرق", "المياه", "خلية الأزمة", "الصحة", "موازنة"].map((s) => (
                <button key={s} onClick={() => setQ(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {q.trim() && hits.length === 0 && <div className="msearch-empty">لا نتائج لـ «{q}»</div>}
        {groups.map((g) => (
          <section key={g}>
            <div className="msearch-group">{g}</div>
            <div className="msearch-list">
              {hits.filter((h) => h.group === g).map((h) => (
                <Link key={h.group + h.key} href={h.href} className="msearch-item" onClick={onClose}>
                  <span className="msearch-ico"><h.icon size={17} /></span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <b>{h.title}</b>
                    <small>{h.sub}</small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
