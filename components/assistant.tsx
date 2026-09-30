"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Check, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import type Anthropic from "@anthropic-ai/sdk";
import { decisions, entities, entityOf, hallOf, meetings, people, personOf } from "@/lib/lookup";
import { canAdvance, seesAssignment } from "@/lib/access";
import { CONFIRM_TOOLS } from "@/lib/assistant-tools";
import { guideTopicText } from "@/lib/guide";
import { useStore } from "@/lib/store";
import type { AssignmentStatus, Note } from "@/lib/types";

type Msg = Anthropic.Beta.BetaMessageParam;
type Block = Anthropic.Beta.BetaContentBlock;
type ToolUse = Anthropic.Beta.BetaToolUseBlock;

/** ما يظهر في المحادثة — منفصل عن سجل الرسائل الذي يُرسل للنموذج */
type Item =
  | { kind: "user"; text: string }
  | { kind: "bot"; text: string }
  | { kind: "action"; text: string; ok: boolean }
  | { kind: "error"; text: string };

type Pending = { tool: ToolUse; label: string; resolve: (ok: boolean) => void };

const MAX_STEPS = 8;
const norm = (s: string) =>
  s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْـ]/g, "");

const SUGGESTIONS = [
  "شو التكليفات المتأخرة؟",
  "شو في عندي اليوم؟",
  "افتحلي القاعات",
  "كيف بعتمد قرار؟",
];

export default function Assistant() {
  const store = useStore();
  const live = useRef(store);
  live.current = store;
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const history = useRef<Msg[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [items, busy, pending]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => field.current?.focus(), 250);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [open]);

  if (!store.ready || pathname?.startsWith("/login")) return null;

  const push = (it: Item) => setItems((xs) => [...xs, it]);

  /* ───────── تنفيذ الأدوات بجلسة المستخدم ───────── */

  function describe(t: ToolUse): string {
    const i = t.input as Record<string, string>;
    const { assignments, bookings } = live.current;
    switch (t.name) {
      case "advance_assignment": {
        const a = assignments.find((x) => x.id === i.assignment_id);
        return `نقل التكليف «${a?.title ?? i.assignment_id}» إلى «${i.to_status}»`;
      }
      case "resolve_decision": {
        const d = decisions.find((x) => x.id === i.decision_id);
        return `${i.action === "approve" ? "اعتماد" : "إعادة"} المعاملة «${d?.title ?? i.decision_id}»`;
      }
      case "set_booking_status": {
        const b = bookings.find((x) => x.id === i.booking_id);
        return `${i.status === "مؤكد" ? "الموافقة على" : "رفض"} حجز «${b?.title ?? i.booking_id}»`;
      }
      case "add_note":
        return `إضافة ملاحظة (${i.scope}): «${String(i.text).slice(0, 90)}»`;
      default:
        return t.name;
    }
  }

  async function run(t: ToolUse): Promise<string> {
    const i = t.input as Record<string, string>;
    const s = live.current;
    const me = s.me;
    const visible = s.assignments.filter((a) => seesAssignment(me, a));

    switch (t.name) {
      case "read_guide":
        return guideTopicText(String(i.topic_id)) ?? "لا يوجد موضوع بهذا المعرّف";
      case "navigate": {
        const path = String(i.path || "/");
        if (!path.startsWith("/")) return "مسار غير صالح";
        router.push(path.endsWith("/") ? path : path + "/");
        if (window.matchMedia("(max-width: 900px)").matches) setOpen(false);
        return `فُتحت الشاشة ${path}`;
      }
      case "search": {
        const n = norm(String(i.query ?? ""));
        const has = (...xs: (string | undefined)[]) => xs.some((x) => x && norm(x).includes(n));
        const out = [
          ...visible.filter((a) => has(a.title, a.ref, a.source)).slice(0, 8).map((a) => `تكليف ${a.id} | ${a.ref} | ${a.title} | ${entityOf(a.entityId).short} | ${a.status}`),
          ...people.filter((p) => has(p.name, p.title)).slice(0, 6).map((p) => `شخص ${p.id} | ${p.name} | ${p.title} | ${entityOf(p.entityId).short} | هاتف ${p.phone ?? "—"} تحويلة ${p.ext ?? "—"}`),
          ...entities.filter((e) => has(e.name, e.short)).slice(0, 5).map((e) => `جهة ${e.id} | ${e.name} | ${e.kind}`),
          ...meetings.filter((m) => has(m.title, m.kind)).slice(0, 5).map((m) => `اجتماع ${m.id} | ${m.title} | ${m.day} ${m.time} | ${m.status}`),
        ];
        return out.length ? out.join("\n") : "لا نتائج";
      }
      case "list_assignments": {
        let list = visible;
        const st = String(i.status ?? "").trim();
        if (st === "متأخر") list = list.filter((a) => a.status === "متأخر" || a.escalation >= 2);
        else if (st) list = list.filter((a) => a.status === st);
        const en = norm(String(i.entity ?? "").trim());
        if (en) list = list.filter((a) => norm(entityOf(a.entityId).name + " " + entityOf(a.entityId).short).includes(en));
        if (!list.length) return "لا تكليفات مطابقة";
        return list.slice(0, 30).map((a) => {
          const next = (["مُستلَم", "قيد التنفيذ", "قيد المراجعة", "مُغلق", "مُعاد للتصحيح"] as AssignmentStatus[]).filter((to) => canAdvance(me, a, to));
          return `${a.id} | ${a.ref} | ${a.title} | ${entityOf(a.entityId).short} | المكلّف ${personOf(a.ownerId).name} | ${a.status} | ${a.progress}% | الاستحقاق ${a.due} | الأولوية ${a.priority}${next.length ? ` | يمكنك نقله إلى: ${next.join("، ")}` : ""}`;
        }).join("\n");
      }
      case "advance_assignment": {
        const a = s.assignments.find((x) => x.id === i.assignment_id);
        if (!a) return "خطأ: التكليف غير موجود";
        if (!canAdvance(me, a, i.to_status)) return `خطأ: صلاحية «${me.title}» لا تسمح بنقل هذا التكليف إلى «${i.to_status}»`;
        await s.advance(a.id, i.to_status as AssignmentStatus);
        return `تم: التكليف «${a.title}» أصبح «${i.to_status}»`;
      }
      case "list_decisions": {
        const list = decisions.filter((d) => s.decisionIds.includes(d.id));
        if (!list.length) return "لا معاملات بانتظار الاعتماد";
        return list.map((d) => `${d.id} | ${d.title} | ${entityOf(d.entityId).short} | ${d.priority} | ${d.age}${d.amount ? ` | ${d.amount}` : ""}`).join("\n");
      }
      case "resolve_decision": {
        const d = decisions.find((x) => x.id === i.decision_id);
        if (!d) return "خطأ: المعاملة غير موجودة";
        await s.resolveDecision(d.id, i.action as "approve" | "return");
        return `تم: ${i.action === "approve" ? "اعتُمدت" : "أُعيدت"} المعاملة «${d.title}»`;
      }
      case "list_meetings":
        return meetings.map((m) => `${m.id} | ${m.title} | ${m.kind} | ${m.day} ${m.time} | ${m.status}${m.hallId ? ` | ${hallOf(m.hallId)?.name ?? ""}` : ""}`).join("\n") || "لا اجتماعات";
      case "list_bookings":
        return s.bookings.map((b) => `${b.id} | ${b.title} | ${hallOf(b.hallId)?.name ?? b.hallId} | ${b.day} ${b.start}-${b.end} | ${b.status} | الطالب ${personOf(b.requesterId).name}`).join("\n") || "لا حجوزات";
      case "set_booking_status": {
        const b = s.bookings.find((x) => x.id === i.booking_id);
        if (!b) return "خطأ: الحجز غير موجود";
        await s.setBookingStatus(b.id, i.status as "مؤكد" | "مرفوض");
        return `تم: الحجز «${b.title}» أصبح «${i.status}»`;
      }
      case "list_notifications": {
        const mine = s.notifications.filter((n) => n.toId === me.id);
        return mine.slice(0, 15).map((n) => `${n.read ? "مقروء" : "جديد"} | ${n.title} | ${n.body} | ${n.at}`).join("\n") || "لا إشعارات";
      }
      case "mark_all_notifications_read":
        await s.markAllRead();
        return "تم تعليم كل الإشعارات مقروءة";
      case "add_note": {
        if (i.scope === "توجيه المحافظ" && me.role !== "governor") return "خطأ: «توجيه المحافظ» للسيد المحافظ وحده";
        const about = String(i.about || "عام");
        await s.addNote({ target: "general", targetLabel: about, text: String(i.text), scope: i.scope as Note["scope"] });
        return `تمت إضافة الملاحظة (${i.scope})`;
      }
      default:
        return `خطأ: أداة غير معروفة ${t.name}`;
    }
  }

  function confirm(tool: ToolUse): Promise<boolean> {
    return new Promise((resolve) => setPending({ tool, label: describe(tool), resolve }));
  }

  /* ───────── حلقة المحادثة ───────── */

  async function loop() {
    setBusy(true);
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const res = await fetch("/api/assistant/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.current, page: window.location.pathname }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { push({ kind: "error", text: data?.error ?? "تعذّر الوصول إلى المساعد" }); return; }

        const content = data.content as Block[];
        // يُعاد المحتوى كما هو (بما فيه كتل التفكير) حتى تبقى المحادثة صالحة
        history.current.push({ role: "assistant", content: content as Anthropic.Beta.BetaContentBlockParam[] });

        const text = content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        if (text) push({ kind: "bot", text });

        if (data.stop_reason === "refusal") { push({ kind: "error", text: "لا أستطيع المساعدة في هذا الطلب." }); return; }
        if (data.stop_reason !== "tool_use") return;

        const uses = content.filter((b): b is ToolUse => b.type === "tool_use");
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const u of uses) {
          if (CONFIRM_TOOLS.has(u.name)) {
            const ok = await confirm(u);
            setPending(null);
            if (!ok) {
              push({ kind: "action", text: `أُلغي: ${describe(u)}`, ok: false });
              results.push({ type: "tool_result", tool_use_id: u.id, content: "رفض المستخدم تنفيذ هذا الإجراء", is_error: true });
              continue;
            }
          }
          try {
            const out = await run(u);
            const failed = out.startsWith("خطأ");
            if (CONFIRM_TOOLS.has(u.name)) push({ kind: "action", text: out, ok: !failed });
            results.push({ type: "tool_result", tool_use_id: u.id, content: out, is_error: failed || undefined });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "تعذّر التنفيذ";
            if (CONFIRM_TOOLS.has(u.name)) push({ kind: "action", text: `تعذّر: ${msg}`, ok: false });
            results.push({ type: "tool_result", tool_use_id: u.id, content: `خطأ: ${msg}`, is_error: true });
          }
        }
        history.current.push({ role: "user", content: results });
      }
      push({ kind: "error", text: "توقّفت هنا — الطلب يحتاج خطوات كثيرة. جرّب تقسيمه." });
    } catch {
      push({ kind: "error", text: "انقطع الاتصال — حاول مرة أخرى." });
    } finally {
      setBusy(false);
    }
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    push({ kind: "user", text: t });
    history.current.push({ role: "user", content: t });
    void loop();
  }

  function reset() {
    if (busy) return;
    history.current = [];
    setItems([]);
  }

  return (
    <>
      <button className={`ai-fab ${open ? "hide" : ""}`} onClick={() => setOpen(true)} aria-label="المساعد الذكي">
        <Sparkles size={22} />
      </button>

      {open && (
        <div className="ai-wrap" role="dialog" aria-label="المساعد الذكي">
          <div className="ai-scrim" onClick={() => setOpen(false)} />
          <section className="ai-panel">
            <header className="ai-head">
              <span className="ai-avatar"><Sparkles size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>المساعد الذكي</b>
                <small>يعمل بصلاحياتك · كل إجراء يحتاج تأكيدك</small>
              </span>
              {items.length > 0 && (
                <button className="ai-icon" onClick={reset} aria-label="محادثة جديدة" disabled={busy}><RotateCcw size={17} /></button>
              )}
              <button className="ai-icon" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={19} /></button>
            </header>

            <div className="ai-body" ref={scroller}>
              {items.length === 0 && (
                <div className="ai-hello">
                  <b>أهلاً {store.me.name?.split(" ").slice(0, 2).join(" ")} 👋</b>
                  <p>قلّي شو بدك، وأنا بدوّر وبفتحلك الشاشة وبنفّذ عنك.</p>
                  <div className="ai-sugs">
                    {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
                  </div>
                </div>
              )}
              {items.map((it, k) => (
                <div key={k} className={`ai-msg ${it.kind} ${it.kind === "action" && !it.ok ? "bad" : ""}`}>
                  {it.kind === "action" && (it.ok ? <Check size={15} /> : <X size={15} />)}
                  <span>{it.text}</span>
                </div>
              ))}
              {pending && (
                <div className="ai-confirm">
                  <small>يحتاج تأكيدك</small>
                  <b>{pending.label}</b>
                  <div className="ai-confirm-row">
                    <button className="ok" onClick={() => pending.resolve(true)}><Check size={16} /> تأكيد</button>
                    <button onClick={() => pending.resolve(false)}>إلغاء</button>
                  </div>
                </div>
              )}
              {busy && !pending && <div className="ai-typing"><Loader2 size={16} /> يفكّر…</div>}
            </div>

            <form className="ai-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
              <textarea
                ref={field}
                value={input}
                rows={1}
                placeholder="اكتب طلبك…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                disabled={!!pending}
              />
              <button type="submit" disabled={!input.trim() || busy} aria-label="إرسال"><ArrowUp size={19} /></button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
