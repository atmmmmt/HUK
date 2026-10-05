"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Inbox, Send, X } from "lucide-react";
import { personOf } from "@/lib/lookup";
import { useStore } from "@/lib/store";
import type { Assignment, Note, Priority } from "@/lib/types";

/* ───────────── مؤشر ───────────── */

export function Kpi({
  label, value, meta, icon, tone = "navy", trend, href, onClick,
}: {
  label: string; value: string | number; meta?: string; icon: React.ReactNode;
  tone?: "navy" | "gold" | "danger" | "ok" | "warn"; trend?: "up" | "down";
  href?: string; onClick?: () => void;
}) {
  const [shown, setShown] = useState<string | number>(typeof value === "number" ? 0 : value);
  useEffect(() => {
    if (typeof value !== "number") { setShown(value); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 360;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const body = (
    <>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-value">{shown}</div>
      {meta && <div className={`kpi-meta ${trend ?? ""}`}>{meta}</div>}
    </>
  );
  const className = `kpi ${tone} ${href || onClick ? "interactive" : ""}`;
  if (href) return <Link href={href} className={className} aria-label={label}>{body}</Link>;
  if (onClick) return <button type="button" className={className} onClick={onClick} aria-label={label}>{body}</button>;
  return <div className={className}>{body}</div>;
}

/* ───────────── شريط تقدّم ───────────── */

export function Bar({ value }: { value: number }) {
  const tone = value >= 80 ? "ok" : value >= 40 ? "" : value > 0 ? "warn" : "danger";
  return (
    <div className="bar-row">
      <div className="bar"><i className={tone} style={{ width: `${value}%` }} /></div>
      <span className="bar-num">{value}%</span>
    </div>
  );
}

/* ───────────── صورة رمزية ───────────── */

export function Ava({ id, size }: { id: string; size?: "sm" | "lg" }) {
  const p = personOf(id);
  const tone = p.role === "governor" || p.role === "deputy" ? "gold" : p.role === "director" ? "teal" : p.role === "chief" ? "plum" : "";
  return <span className={`ava ${size ?? ""} ${tone}`} title={p.name}>{p.initials}</span>;
}

export function PersonLine({ id, sub }: { id: string; sub?: string }) {
  const p = personOf(id);
  return (
    <span className="ava-row">
      <Ava id={id} size="sm" />
      <span style={{ minWidth: 0 }}>
        <span className="t-main" style={{ display: "block", fontSize: 13 }}>{p.name}</span>
        <span className="t-sub">{sub ?? p.title}</span>
      </span>
    </span>
  );
}

export function AvaStack({ ids, max = 4 }: { ids: string[]; max?: number }) {
  const shown = ids.slice(0, max);
  const rest = ids.length - shown.length;
  return (
    <span className="ava-stack">
      {shown.map((id) => <Ava key={id} id={id} size="sm" />)}
      {rest > 0 && <span className="ava-more">+{rest}</span>}
    </span>
  );
}

/* ───────────── شارات الحالة ───────────── */

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    "مُغلق": "ok", "منعقد": "ok", "مؤكد": "ok", "موافق": "ok",
    "متأخر": "danger", "مرفوض": "danger",
    "قيد المراجعة": "warn", "بانتظار الموافقة": "warn", "بانتظار الرد": "warn", "مُعاد للتصحيح": "warn", "بانتظار التأكيد": "warn",
    "قيد التنفيذ": "info", "جارٍ الإعداد": "info",
    "جارٍ الآن": "gold", "مُسند": "navy", "مُستلَم": "navy", "جديد": "", "مُجمَّد": "", "قادم": "navy", "مؤجل": "",
  };
  const live = status === "جارٍ الآن";
  return <span className={`chip ${map[status] ?? ""} ${live ? "live" : ""}`}>{status}</span>;
}

export function PriorityChip({ p }: { p: Priority }) {
  const map: Record<Priority, string> = { "عادي": "", "هام": "info", "عاجل": "warn", "عاجل جداً": "danger" };
  return <span className={`chip ${map[p]}`}>{p}</span>;
}

export function ClassChip({ c }: { c: string }) {
  const map: Record<string, string> = { "عادي": "", "سرّي": "plum" };
  return <span className={`chip ${map[c] ?? ""}`}>{c}</span>;
}

/* ───────────── سلسلة الوصول ───────────── */

const chainSteps: { key: keyof Assignment["chain"]; label: string }[] = [
  { key: "sent", label: "أُرسل" },
  { key: "delivered", label: "وصل الجهاز" },
  { key: "read", label: "قُرئ" },
  { key: "acknowledged", label: "أُقرّ الاستلام" },
  { key: "started", label: "بدأ التنفيذ" },
  { key: "submitted", label: "سُلّم" },
];

export function Chain({ chain }: { chain: Assignment["chain"] }) {
  const firstMissing = chainSteps.findIndex((s) => !chain[s.key]);
  return (
    <div className="chain">
      {chainSteps.map((s, i) => {
        const at = chain[s.key];
        const now = i === firstMissing;
        return (
          <div key={s.key} className={`chain-step ${at ? "done" : now ? "now" : ""}`}>
            <b>{s.label}</b>
            <span>{at ?? (now ? "بالانتظار" : "—")}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── لوح جانبي ───────────── */

export function Sheet({
  title, sub, onClose, children, footer,
}: {
  title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!mounted) return null;

  // يُنقل إلى جسم الصفحة حتى لا تحبسه حركة العنصر الأب
  return createPortal(
    <div className="sheet-open">
      <div className="scrim" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="m-grab" aria-hidden />
        <div className="sheet-head">
          <div style={{ minWidth: 0 }}>
            <h3>{title}</h3>
            {sub && <p className="sub">{sub}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}

/* ───────────── لا يوجد ───────────── */

export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="empty">
      <Inbox size={38} />
      <b>{text}</b>
      {hint && <span className="tiny">{hint}</span>}
    </div>
  );
}

/* ───────────── تبويبات ───────────── */

export function Tabs({ items, value, onChange }: { items: { key: string; label: string; n?: number }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="tabs">
      {items.map((t) => (
        <button key={t.key} className={value === t.key ? "on" : ""} onClick={() => onChange(t.key)}>
          {t.label}{typeof t.n === "number" && <span className="n" style={{ opacity: .55, marginInlineStart: 6 }}>{t.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pills({ items, value, onChange }: { items: { key: string; label: string; n?: number }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="filters">
      {items.map((f) => (
        <button key={f.key} className={`pill ${value === f.key ? "on" : ""}`} onClick={() => onChange(f.key)}>
          {f.label}{typeof f.n === "number" && <span className="n">{f.n}</span>}
        </button>
      ))}
    </div>
  );
}

/* ───────────── لوح الملاحظات ───────────── */

export function NoteBoard({ target, targetLabel }: { target: string; targetLabel: string }) {
  const { notes, addNote, me } = useStore();
  const [text, setText] = useState("");
  const [scope, setScope] = useState<Note["scope"]>("رسمية");
  const list = notes.filter((n) => n.target === target);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    void addNote({ target, targetLabel, text: text.trim(), scope });
    setText("");
  }

  return (
    <div>
      <form onSubmit={submit} style={{ marginBottom: 12 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={me.role === "governor" ? "اكتب توجيهاً يُحفظ في سجل هذا العنصر…" : "اكتب ملاحظة…"}
            style={{ minHeight: 76 }}
          />
        </div>
        <div className="row between wrap">
          {me.role !== "governor" ? (
            <div className="row" style={{ gap: 6 }}>
              {(["خاصة", "الوحدة", "رسمية"] as Note["scope"][]).map((s) => (
                <button key={s} type="button" className={`pill ${scope === s ? "on" : ""}`} onClick={() => setScope(s)}>{s}</button>
              ))}
            </div>
          ) : <span className="chip gold">تُسجَّل كتوجيه المحافظ</span>}
          <button className="btn primary sm" type="submit"><Send size={14} /> إضافة</button>
        </div>
      </form>

      {list.length === 0 ? (
        <p className="muted tiny">لا ملاحظات بعد على هذا العنصر.</p>
      ) : (
        list.map((n) => (
          <div key={n.id} className={`note-item ${n.scope === "توجيه المحافظ" ? "governor" : ""}`}>
            <Ava id={n.authorId} size="sm" />
            <div className="note-body">
              <div className="note-top">
                <b>{personOf(n.authorId).name}</b>
                <span className={`chip ${n.scope === "توجيه المحافظ" ? "gold" : n.scope === "رسمية" ? "navy" : ""}`} style={{ fontSize: 11 }}>{n.scope}</span>
                <time>{n.at}</time>
              </div>
              <p className="note-text">{n.text}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ───────────── بطاقة قسم ───────────── */

export function Panel({
  title, icon, hint, action, children, flush,
}: {
  title: string; icon?: React.ReactNode; hint?: string; action?: React.ReactNode; children: React.ReactNode; flush?: boolean;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <h3>{icon}{title}</h3>
        {action ?? (hint && <span className="hint">{hint}</span>)}
      </div>
      <div className={`card-body ${flush ? "flush" : ""}`}>{children}</div>
    </section>
  );
}
