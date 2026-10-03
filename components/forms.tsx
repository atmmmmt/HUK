"use client";

import { useState } from "react";
import { CalendarClock, Check, FileText, Search, Users, Inbox, MailQuestion, Paperclip, Plus, Send, Stamp, UserPlus, X } from "lucide-react";
import { entities, entityOf, halls, people, roles } from "@/lib/lookup";
import { useStore } from "@/lib/store";
import type { Classification, Letter, MeetingOutcome, Priority, RequestItem, RoleKey } from "@/lib/types";
import { Sheet } from "@/components/ui";

const PRIORITIES: Priority[] = ["عادي", "هام", "عاجل", "عاجل جداً"];

/** تاريخ بعد عدد من الأيام بصيغة yyyy-mm-dd */
export function isoIn(days: number) {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** المهلة الافتراضية لكل أولوية، كما في قواعد التصعيد */
const defaultDays: Record<Priority, number> = { "عاجل جداً": 1, "عاجل": 1, "هام": 2, "عادي": 5 };

/** قائمة المكلَّفين مجمّعة حسب الجهة */
export function OwnerSelect({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  const { people } = useStore();
  const active = people.filter((p) => (p as { active?: boolean }).active !== false && p.role !== "governor" && p.role !== "admin");
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— اختر المكلَّف —</option>
      {entities.map((e) => {
        const list = active.filter((p) => p.entityId === e.id);
        if (!list.length) return null;
        return (
          <optgroup key={e.id} label={e.name}>
            {list.map((p) => <option key={p.id} value={p.id}>{p.name}{p.name !== p.title ? ` — ${p.title}` : ""}</option>)}
          </optgroup>
        );
      })}
    </select>
  );
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, after: () => void) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); after(); } catch { /* الرسالة تظهر من المتجر */ } finally { setBusy(false); }
  };
  return { busy, run };
}

/* ───────── تكليف جديد ───────── */

export function NewAssignmentSheet({ onClose }: { onClose: () => void }) {
  const { issueAssignment, toast, people } = useStore();
  const { busy, run } = useSubmit();
  const [title, setTitle] = useState("");
  const [ownerId, setOwner] = useState("");
  const [priority, setPriority] = useState<Priority>("هام");
  const [dueISO, setDue] = useState(isoIn(defaultDays["هام"]));
  const [closeCriteria, setCriteria] = useState("");
  const [source, setSource] = useState("توجيه السيد المحافظ");
  const [classification, setClass] = useState<Classification>("عادي");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim()) return toast("اكتب عنوان التكليف", "warn");
    if (!ownerId) return toast("اختر المكلَّف", "warn");
    void run(() => issueAssignment({ title, ownerId, priority, dueISO, closeCriteria, source, classification }), onClose);
  }

  return (
    <Sheet
      title="تكليف جديد"
      sub="يصل إشعار فوري إلى المكلَّف، وتبدأ المهلة من لحظة الإسناد"
      onClose={onClose}
      footer={
        <>
          <button className="btn gold" onClick={() => submit()} disabled={busy}><Send size={16} /> {busy ? "جارٍ الإصدار…" : "إصدار التكليف"}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="as-title">عنوان التكليف</label>
          <input id="as-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: إعداد تقرير جاهزية الشبكة قبل الشتاء" />
        </div>
        <div className="field">
          <label htmlFor="as-owner">المكلَّف</label>
          <OwnerSelect id="as-owner" value={ownerId} onChange={setOwner} />
          {ownerId && <div className="hint-text">الجهة: {entityOf(people.find((p) => p.id === ownerId)?.entityId ?? "").name}</div>}
        </div>
        <div className="field">
          <label htmlFor="as-pr">الأولوية</label>
          <select id="as-pr" value={priority} onChange={(e) => { const p = e.target.value as Priority; setPriority(p); setDue(isoIn(defaultDays[p])); }}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="hint-text">العاجل: رد خلال 24 ساعة · الهام: 48 ساعة · العادي: جدول زمني يُحدَّد هنا</div>
        </div>
        <div className="field">
          <label htmlFor="as-due">تاريخ الاستحقاق</label>
          <input id="as-due" type="date" value={dueISO} min={isoIn(0)} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="as-cc">معيار الإغلاق</label>
          <input id="as-cc" value={closeCriteria} onChange={(e) => setCriteria(e.target.value)} placeholder="مثال: تقرير فني معتمد + جدول كميات" />
        </div>
        <div className="field">
          <label htmlFor="as-src">المصدر</label>
          <select id="as-src" value={source} onChange={(e) => setSource(e.target.value)}>
            {["توجيه السيد المحافظ", "قرار اجتماع", "كتاب وارد", "خطة سنوية", "طلب مجلس المحافظة"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="as-cl">درجة السرّية</label>
          <select id="as-cl" value={classification} onChange={(e) => setClass(e.target.value as Classification)}>
            <option value="عادي">عادي</option>
            <option value="سرّي">سرّي</option>
          </select>
        </div>
      </form>
    </Sheet>
  );
}

/* ───────── تحديد موعد أو اقتراح وقت ───────── */

export function SlotSheet({
  title, sub, cta, onSubmit, onClose,
}: {
  title: string; sub: string; cta: string;
  onSubmit: (dayISO: string, time: string, note: string) => Promise<void>; onClose: () => void;
}) {
  const { busy, run } = useSubmit();
  const [day, setDay] = useState(isoIn(1));
  const [time, setTime] = useState("10:00");
  const [note, setNote] = useState("");
  const submit = (e?: React.FormEvent) => { e?.preventDefault(); void run(() => onSubmit(day, time, note), onClose); };

  return (
    <Sheet
      title={title}
      sub={sub}
      onClose={onClose}
      footer={
        <>
          <button className="btn primary" onClick={() => submit()} disabled={busy}><CalendarClock size={16} /> {busy ? "جارٍ الحفظ…" : cta}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="sl-day">اليوم</label>
          <input id="sl-day" type="date" value={day} min={isoIn(0)} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sl-time">الوقت</label>
          <input id="sl-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sl-note">ملاحظة لصاحب الطلب <span className="muted tiny">(اختياري)</span></label>
          <input id="sl-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: في مكتب السيد المحافظ" />
        </div>
      </form>
    </Sheet>
  );
}

/* ───────── طلب جديد إلى الديوان ───────── */

export function NewRequestSheet({ onClose }: { onClose: () => void }) {
  const { raiseRequest, toast } = useStore();
  const { busy, run } = useSubmit();
  const [kind, setKind] = useState<RequestItem["kind"]>("موعد لدى المحافظ");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const hints: Record<RequestItem["kind"], string> = {
    "حجز قاعة": "القاعة المطلوبة، اليوم، الوقت، وعدد الحضور",
    "موعد لدى المحافظ": "المدة المطلوبة وموضوع العرض",
    "طلب اجتماع": "الجهات المشاركة والموعد المقترح",
    "تمديد مهلة": "رقم التكليف، المدة الإضافية، والمبرر",
  };
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return toast("اكتب موضوع الطلب", "warn");
    void run(() => raiseRequest({ kind, title, detail }), onClose);
  };

  return (
    <Sheet
      title="طلب جديد إلى الديوان"
      sub="يصل إلى مكتب السيد المحافظ ويُتابَع حتى الرد"
      onClose={onClose}
      footer={
        <>
          <button className="btn gold" onClick={() => submit()} disabled={busy}><MailQuestion size={16} /> {busy ? "جارٍ الرفع…" : "رفع الطلب"}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="rq-kind">نوع الطلب</label>
          <select id="rq-kind" value={kind} onChange={(e) => setKind(e.target.value as RequestItem["kind"])}>
            {(Object.keys(hints) as RequestItem["kind"][]).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rq-title">الموضوع</label>
          <input id="rq-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: عرض خطة صيانة الشبكة" />
        </div>
        <div className="field">
          <label htmlFor="rq-detail">التفاصيل</label>
          <textarea id="rq-detail" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={hints[kind]} />
        </div>
      </form>
    </Sheet>
  );
}

/* ───────── قيد كتاب ───────── */

export function NewLetterSheet({ onClose, direction: initial = "وارد" }: { onClose: () => void; direction?: "وارد" | "صادر" }) {
  const { registerLetter, toast } = useStore();
  const { busy, run } = useSubmit();
  const [direction, setDirection] = useState<"وارد" | "صادر">(initial);
  const [party, setParty] = useState("");
  const [subject, setSubject] = useState("");
  const [referredTo, setReferred] = useState("");
  const [action, setAction] = useState("للاطلاع");
  const [classification, setClass] = useState<Classification>("عادي");
  const [dueHours, setDueHours] = useState(48);
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!party.trim() || !subject.trim()) return toast("الجهة والموضوع مطلوبان", "warn");
    void run(() => registerLetter({ direction, party, subject, referredTo, action, classification, dueHours: direction === "وارد" ? dueHours : undefined } as Pick<Letter, "direction" | "party" | "subject" | "referredTo" | "action" | "classification"> & { dueHours?: number }), onClose);
  };

  return (
    <Sheet
      title="قيد كتاب"
      sub="يُعطى رقماً تسلسلياً تلقائياً ويُسجَّل في سجل التدقيق"
      onClose={onClose}
      footer={
        <>
          <button className="btn gold" onClick={() => submit()} disabled={busy}><Inbox size={16} /> {busy ? "جارٍ القيد…" : "قيد الكتاب"}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="lt-dir">الاتجاه</label>
          <select id="lt-dir" value={direction} onChange={(e) => setDirection(e.target.value as "وارد" | "صادر")}>
            <option value="وارد">وارد</option>
            <option value="صادر">صادر</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="lt-party">{direction === "وارد" ? "الجهة المرسِلة" : "الجهة المرسَل إليها"}</label>
          <input id="lt-party" value={party} onChange={(e) => setParty(e.target.value)} placeholder="مثال: وزارة الإدارة المحلية" />
        </div>
        <div className="field">
          <label htmlFor="lt-sub">الموضوع</label>
          <input id="lt-sub" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lt-ref">الإحالة إلى</label>
          <input id="lt-ref" value={referredTo} onChange={(e) => setReferred(e.target.value)} placeholder="مثال: مديرية الخدمات الفنية" />
        </div>
        <div className="field">
          <label htmlFor="lt-act">الإجراء المطلوب</label>
          <select id="lt-act" value={action} onChange={(e) => setAction(e.target.value)}>
            {["للاطلاع", "للدراسة والرد", "للتنفيذ", "للعرض على السيد المحافظ", "للحفظ"].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {direction === "وارد" && (
          <div className="field">
            <label htmlFor="lt-due">مهلة المعالجة (ساعات)</label>
            <input id="lt-due" type="number" min={1} max={720} value={dueHours} onChange={(e) => setDueHours(Number(e.target.value))} />
          </div>
        )}
        <div className="field">
          <label htmlFor="lt-cl">درجة السرّية</label>
          <select id="lt-cl" value={classification} onChange={(e) => setClass(e.target.value as Classification)}>
            <option value="عادي">عادي</option>
            <option value="سرّي">سرّي</option>
          </select>
        </div>
      </form>
    </Sheet>
  );
}

/* ───────── حساب جديد ───────── */

export function NewUserSheet({ onClose }: { onClose: () => void }) {
  const { createUser, toast, me } = useStore();
  const { busy, run } = useSubmit();
  const [role, setRole] = useState<RoleKey>("director");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [entityId, setEntity] = useState(entities.find((e) => e.id !== "e0")?.id ?? "");
  const [unit, setUnit] = useState("");
  const [clearance, setClearance] = useState<Classification>("عادي");
  const [phone, setPhone] = useState("");
  const units = entities.find((e) => e.id === entityId)?.units ?? [];

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || !username.trim() || password.length < 8) return toast("الاسم واسم المستخدم وكلمة مرور من 8 أحرف مطلوبة", "warn");
    void run(() => createUser({ name, title: title || name, username, password, role, entityId, unit, clearance, phone }), onClose);
  };

  return (
    <Sheet
      title="حساب جديد"
      sub="يُنشأ الحساب مفعّلاً، ويدخل صاحبه باسم المستخدم وكلمة المرور"
      onClose={onClose}
      footer={
        <>
          <button className="btn gold" onClick={() => submit()} disabled={busy}><UserPlus size={16} /> {busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <form onSubmit={submit} autoComplete="off">
        <div className="field">
          <label htmlFor="us-role">الدور</label>
          <select id="us-role" value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
            {roles.filter((r) => r.key !== "governor" || me.role === "governor").map((r) => <option key={r.key} value={r.key}>{r.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="us-name">الاسم المعروض</label>
          <input id="us-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مدير النقل" />
        </div>
        <div className="field">
          <label htmlFor="us-title">الصفة الرسمية</label>
          <input id="us-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مدير مديرية النقل" />
        </div>
        <div className="field">
          <label htmlFor="us-ent">الجهة</label>
          <select id="us-ent" value={entityId} onChange={(e) => { setEntity(e.target.value); setUnit(""); }}>
            {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        {units.length > 0 && (
          <div className="field">
            <label htmlFor="us-unit">الوحدة <span className="muted tiny">(اختياري)</span></label>
            <select id="us-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">— كامل الجهة —</option>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="us-user">اسم المستخدم</label>
          <input id="us-user" dir="ltr" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="transport.director" autoCapitalize="none" />
        </div>
        <div className="field">
          <label htmlFor="us-pass">كلمة المرور</label>
          <input id="us-pass" dir="ltr" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 أحرف على الأقل" autoCapitalize="none" />
        </div>
        <div className="field">
          <label htmlFor="us-cl">درجة التصريح</label>
          <select id="us-cl" value={clearance} onChange={(e) => setClearance(e.target.value as Classification)}>
            <option value="عادي">عادي</option>
            <option value="سرّي">سرّي</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="us-ph">الجوال <span className="muted tiny">(اختياري)</span></label>
          <input id="us-ph" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </form>
    </Sheet>
  );
}

/* ───────── إسناد مخرجات الاجتماع ───────── */

export function AssignOutcomes({ meetingId, outcomes, onDone }: { meetingId: string; outcomes: MeetingOutcome[]; onDone: () => void }) {
  const { assignOutcomes, toast } = useStore();
  const { busy, run } = useSubmit();
  const pending = outcomes.filter((o) => !o.assignmentRef && !o.closed);
  const [rows, setRows] = useState(() => pending.map((o) => ({ outcomeId: o.id, ownerId: o.ownerId ?? "", priority: "هام" as Priority, dueISO: isoIn(2) })));

  if (!pending.length) return <p className="tiny muted">كل المخرجات مُسندة أو مغلقة.</p>;

  const set = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const submit = () => {
    const items = rows.filter((r) => r.ownerId);
    if (!items.length) return toast("اختر مكلَّفاً لمخرج واحد على الأقل", "warn");
    void run(() => assignOutcomes(meetingId, items), onDone);
  };

  return (
    <div className="grid" style={{ gap: 12 }}>
      {pending.map((o, i) => (
        <div key={o.id} className="card pad" style={{ padding: 13 }}>
          <p style={{ fontSize: 13.5, marginBottom: 10, fontWeight: 600 }}>{o.text}</p>
          <div className="field" style={{ marginBottom: 10 }}>
            <OwnerSelect value={rows[i].ownerId} onChange={(v) => set(i, { ownerId: v })} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <select value={rows[i].priority} onChange={(e) => { const p = e.target.value as Priority; set(i, { priority: p, dueISO: isoIn(defaultDays[p]) }); }}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <input type="date" value={rows[i].dueISO} min={isoIn(0)} onChange={(e) => set(i, { dueISO: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn gold" onClick={submit} disabled={busy}><Plus size={16} /> {busy ? "جارٍ الإسناد…" : "إسناد المخرجات كتكليفات"}</button>
    </div>
  );
}

/* ───────── معاملة جديدة إلى صندوق التوقيع (مع مرفقات) ───────── */

const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.pptx,.txt";
const kb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} ك.ب` : `${(n / 1048576).toFixed(1)} م.ب`);

export function NewDecisionSheet({ onClose }: { onClose: () => void }) {
  const { me, submitDecision, toast } = useStore();
  const { busy, run } = useSubmit();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [priority, setPriority] = useState<Priority>("هام");
  const [awaiting, setAwaiting] = useState<"governor" | "deputy" | "assistant">("governor");
  const [entityId, setEntityId] = useState(me.entityId);
  const [classification, setClass] = useState<Classification>("عادي");
  const [files, setFiles] = useState<File[]>([]);
  const isDirector = me.role === "director";

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = "";
    const big = chosen.filter((f) => f.size > 8 * 1024 * 1024);
    if (big.length) toast(`أكبر من 8 ميغابايت: ${big.map((f) => f.name).join("، ")}`, "warn");
    setFiles((prev) => [...prev, ...chosen.filter((f) => f.size <= 8 * 1024 * 1024)].slice(0, 10));
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return toast("عنوان المعاملة مطلوب", "warn");
    void run(() => submitDecision({ title, note, amount, priority, awaiting, entityId: isDirector ? undefined : entityId, classification }, files), onClose);
  };

  return (
    <Sheet
      title="معاملة جديدة للتوقيع"
      sub="تصل إلى صندوق التوقيع مع مرفقاتها ويُشعَر صاحب الاعتماد"
      onClose={onClose}
      footer={
        <>
          <button className="btn gold" onClick={() => submit()} disabled={busy}><Stamp size={16} /> {busy ? (files.length ? "جارٍ الرفع…" : "جارٍ الإرسال…") : "رفع للتوقيع"}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="dc-title">عنوان المعاملة</label>
          <input id="dc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: الموافقة على عقد صيانة شبكة المياه" />
        </div>
        <div className="field">
          <label htmlFor="dc-note">ملخّص أو ملاحظة</label>
          <textarea id="dc-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ما المطلوب اعتماده ولماذا" />
        </div>

        <div className="field">
          <label>المرفقات</label>
          <div className="att-pick">
            {files.map((f, i) => (
              <div key={f.name + i} className="att-file">
                <FileText size={16} />
                <span><b>{f.name}</b><small>{kb(f.size)}</small></span>
                <button type="button" className="icon-btn" aria-label={`إزالة ${f.name}`} onClick={() => setFiles(files.filter((_, k) => k !== i))}><X size={15} /></button>
              </div>
            ))}
            <label className="att-add">
              <input type="file" multiple accept={DOC_ACCEPT} hidden onChange={pick} />
              <Paperclip size={16} /> {files.length ? "إرفاق ملف آخر" : "إرفاق ملف (كتاب، عقد، مخطط…)"}
            </label>
            <small className="tiny muted">PDF، صور، Word، Excel — حتى 8 ميغابايت للملف و10 ملفات</small>
          </div>
        </div>

        <div className="field">
          <label htmlFor="dc-to">يُرفع إلى</label>
          <select id="dc-to" value={awaiting} onChange={(e) => setAwaiting(e.target.value as typeof awaiting)}>
            <option value="governor">السيد المحافظ</option>
            <option value="deputy">نائب المحافظ</option>
            <option value="assistant">معاون المحافظ</option>
          </select>
        </div>
        {!isDirector && (
          <div className="field">
            <label htmlFor="dc-ent">الجهة صاحبة المعاملة</label>
            <select id="dc-ent" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              {entities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="dc-pr">الأولوية</label>
          <select id="dc-pr" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {(["عادي", "هام", "عاجل", "عاجل جداً"] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dc-amt">القيمة المالية (إن وُجدت)</label>
          <input id="dc-amt" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 95 مليون ل.س" />
        </div>
        <div className="field">
          <label htmlFor="dc-cl">درجة السرّية</label>
          <select id="dc-cl" value={classification} onChange={(e) => setClass(e.target.value as Classification)}>
            <option value="عادي">عادي</option>
            {me.clearance === "سرّي" && <option value="سرّي">سرّي</option>}
          </select>
        </div>
      </form>
    </Sheet>
  );
}

/* ───────── اجتماع جديد ودعوة المشاركين ───────── */

const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function NewMeetingSheet({ onClose, preset = [] }: { onClose: () => void; preset?: string[] }) {
  const { me, scheduleMeeting, toast } = useStore();
  const { busy, run } = useSubmit();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("اجتماع عمل");
  const [dateISO, setDate] = useState(localISO(tomorrow));
  const [time, setTime] = useState("10:00");
  const [place, setPlace] = useState<string>(halls[0]?.id ?? "online");
  const [invited, setInvited] = useState<string[]>(preset.filter((x) => x !== me.id));
  const [q, setQ] = useState("");
  const [agenda, setAgenda] = useState("");
  const [summary, setSummary] = useState("");

  const others = people.filter((p) => p.id !== me.id && (p as { active?: boolean }).active !== false);
  const quick = (["deputy", "assistant", "secgen", "chief"] as RoleKey[])
    .map((r) => others.find((p) => p.role === r)).filter(Boolean) as typeof others;
  const shown = q.trim()
    ? others.filter((p) => `${p.title} ${p.name} ${entityOf(p.entityId).name}`.includes(q.trim()))
    : others.filter((p) => invited.includes(p.id) || ["deputy", "assistant", "secgen", "chief", "director"].includes(p.role));
  const toggle = (id: string) => setInvited((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return toast("عنوان الاجتماع مطلوب", "warn");
    if (!invited.length) return toast("اختر مدعوّاً واحداً على الأقل", "warn");
    void run(() => scheduleMeeting({
      title, kind, dateISO, time, online: place === "online", hallId: place === "online" ? undefined : place,
      inviteeIds: invited, agenda: agenda.split("\n").map((x) => x.trim()).filter(Boolean), summary,
    }), onClose);
  };

  return (
    <Sheet
      title="اجتماع جديد"
      sub="تصل الدعوة فوراً إلى المدعوين بإشعار، ويؤكّدون الحضور أو يعتذرون"
      onClose={onClose}
      footer={
        <>
          <button className="btn gold" onClick={() => submit()} disabled={busy}><Send size={16} /> {busy ? "جارٍ الإرسال…" : `إرسال الدعوة${invited.length ? ` (${invited.length})` : ""}`}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="mt-title">عنوان الاجتماع</label>
          <input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: متابعة مشاريع الخدمات الفنية" />
        </div>

        <div className="field">
          <label>المدعوون</label>
          {quick.length > 0 && (
            <div className="mt-quick">
              {quick.map((p) => (
                <button type="button" key={p.id} className={`mt-chip ${invited.includes(p.id) ? "on" : ""}`} onClick={() => toggle(p.id)}>
                  {invited.includes(p.id) && <Check size={14} />} {p.title}
                </button>
              ))}
            </div>
          )}
          <div className="mt-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منصب أو جهة…" />
          </div>
          <div className="mt-people">
            {shown.slice(0, 40).map((p) => (
              <label key={p.id} className={`mt-person ${invited.includes(p.id) ? "on" : ""}`}>
                <input type="checkbox" checked={invited.includes(p.id)} onChange={() => toggle(p.id)} />
                <span><b>{p.title}</b><small>{entityOf(p.entityId).short}</small></span>
              </label>
            ))}
            {!shown.length && <small className="tiny muted">لا نتائج</small>}
          </div>
          <small className="tiny muted"><Users size={12} style={{ verticalAlign: -2 }} /> {invited.length ? `${invited.length} مدعو` : "لم تختر أحداً بعد"}</small>
        </div>

        <div className="mt-row">
          <div className="field">
            <label htmlFor="mt-date">التاريخ</label>
            <input id="mt-date" type="date" min={localISO(new Date())} value={dateISO} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mt-time">الساعة</label>
            <input id="mt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="mt-place">المكان</label>
          <select id="mt-place" value={place} onChange={(e) => setPlace(e.target.value)}>
            {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            <option value="online">اتصال مرئي</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="mt-kind">نوع الاجتماع</label>
          <select id="mt-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {["اجتماع عمل", "اللجنة التنفيذية", "خلية الأزمة", "متابعة مشاريع", "تنسيقي"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mt-agenda">جدول الأعمال (بند في كل سطر)</label>
          <textarea id="mt-agenda" rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder={"مراجعة نسب الإنجاز\nالعقبات والحلول"} />
        </div>
        <div className="field">
          <label htmlFor="mt-sum">ملاحظة للمدعوين (اختياري)</label>
          <input id="mt-sum" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
      </form>
    </Sheet>
  );
}
