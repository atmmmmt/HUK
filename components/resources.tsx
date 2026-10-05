"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck, CalendarClock, CheckCircle2, Clock3, DoorOpen, Flag, FolderOpen, IdCard, Layers,
  ListChecks, Lock, MapPin, MessageSquare, Phone, Plus, Search, ShieldCheck, StickyNote, TriangleAlert, Users, XCircle,
  UploadCloud,
} from "lucide-react";
import { delegations, docFiles, entityOf, halls, people, personOf, roleOf } from "@/lib/lookup";
import { actionLabels, bookingRank, bookingRankLabel, clearanceRank, reachLabel } from "@/lib/access";
import { useStore } from "@/lib/store";
import { DocList, UploadButton } from "@/components/upload";
import type { Action, Hall, Person } from "@/lib/types";
import {
  Ava, Bar, ClassChip, Empty, Kpi, NoteBoard, Panel, PersonLine, Pills, Sheet, StatusChip, Tabs,
} from "@/components/ui";

/* ═══════════════════════ القاعات ═══════════════════════ */

const dayOrder = ["اليوم", "غداً", "بعد غد"];

export function Halls() {
  const { bookings, setBookingStatus, me, toast } = useStore();
  const [day, setDay] = useState("اليوم");
  const [open, setOpen] = useState<Hall | null>(null);
  const canApprove = ["halls", "chief", "governor", "deputy", "registry"].includes(me.role);

  const ofDay = bookings.filter((b) => b.day === day);
  const pending = bookings.filter((b) => b.status === "بانتظار الموافقة");

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-4">
        <Kpi label="القاعات المسجّلة" value={halls.length} icon={<DoorOpen size={17} />} />
        <Kpi label="حجوزات اليوم" value={bookings.filter((b) => b.day === "اليوم" && b.status === "مؤكد").length} icon={<CalendarClock size={17} />} tone="gold" />
        <Kpi label="بانتظار الموافقة" value={pending.length} icon={<Clock3 size={17} />} tone="warn" />
        <Kpi label="متوسط الإشغال" value={Math.round(halls.reduce((s, h) => s + h.occupancy, 0) / halls.length)} meta="٪ من ساعات الدوام" icon={<Layers size={17} />} tone="ok" />
      </div>

      <div className="lock-note">
        <ShieldCheck size={17} />
        <span>
          <b>منع التعارض:</b> النظام يرفض أي طلب يتقاطع زمنياً مع حجز مؤكد على القاعة نفسها، ويقترح بدائل.
        </span>
      </div>

      <Panel title="سلّم الأولوية عند تعارض حجزين" icon={<ShieldCheck size={17} />} hint="المعتمد من مكتب السيد المحافظ">
        <div className="row wrap" style={{ gap: 8, alignItems: "center" }}>
          {["السيد المحافظ", "نائب المحافظ", "معاون المحافظ", "الأمين العام", "المدراء المركزيون"].map((t, i) => (
            <span key={t} className="row" style={{ gap: 8 }}>
              <span className={`chip ${i === 0 ? "gold" : i < 3 ? "navy" : ""}`}>
                <b style={{ marginInlineEnd: 4 }}>{i + 1}</b> {t}
              </span>
              {i < 4 && <span className="dot-sep">‹</span>}
            </span>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          عند تعارض موعدين على القاعة نفسها تُقدَّم الجهة الأعلى في السلّم، ويُنبَّه صاحب الحجز الآخر ويُعرض عليه بديل قبل أي تعديل.
        </p>
      </Panel>

      <Pills value={day} onChange={setDay} items={dayOrder.map((d) => ({ key: d, label: d, n: bookings.filter((b) => b.day === d).length }))} />

      <Panel title={`تقويم القاعات — ${day}`} icon={<CalendarClock size={17} />} hint="كل القاعات في شريط واحد" flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th style={{ minWidth: 180 }}>القاعة</th><th>الحجوزات</th></tr></thead>
            <tbody>
              {halls.map((h) => {
                const rows = ofDay.filter((b) => b.hallId === h.id);
                return (
                  <tr key={h.id}>
                    <td>
                      <button className="t-main" style={{ textAlign: "right" }} onClick={() => setOpen(h)}>{h.name}</button>
                      <div className="t-sub">{h.capacity} مقعد · {h.protocol}</div>
                    </td>
                    <td>
                      {rows.length === 0 ? <span className="tiny muted">متاحة طوال اليوم</span> : (
                        <div className="row wrap" style={{ gap: 8 }}>
                          {rows.map((b) => (
                            <div
                              key={b.id}
                              className="card pad"
                              style={{
                                padding: "9px 13px", minWidth: 210,
                                borderColor: b.status === "مرفوض" ? "#f0c9c4" : b.protocolPriority ? "var(--gold)" : undefined,
                                background: b.status === "مرفوض" ? "var(--danger-bg)" : b.protocolPriority ? "var(--gold-soft)" : undefined,
                                opacity: b.status === "مرفوض" ? .75 : 1,
                              }}
                            >
                              <div className="row between" style={{ gap: 8, marginBottom: 4 }}>
                                <b className="ltr tiny" style={{ fontWeight: 700 }}>{b.start}–{b.end}</b>
                                <StatusChip status={b.status} />
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{b.title}</div>
                              <div className="tiny muted">{entityOf(b.entityId).short} · {b.attendees} شخصاً</div>
                              <span className={`chip ${bookingRank(personOf(b.requesterId).role) < 5 ? "gold" : ""}`} style={{ marginTop: 6 }}>
                                {bookingRankLabel(personOf(b.requesterId).role)}
                              </span>
                              {canApprove && b.status === "بانتظار الموافقة" && (
                                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                                  <button className="btn gold sm" onClick={() => { setBookingStatus(b.id, "مؤكد"); toast("تم تأكيد الحجز وإشعار الطالب"); }}>
                                    <CheckCircle2 size={13} /> تأكيد
                                  </button>
                                  <button className="btn ghost sm" onClick={() => { setBookingStatus(b.id, "مرفوض"); toast("رُفض الحجز مع إشعار الطالب", "warn"); }}>
                                    <XCircle size={13} /> رفض
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid g-3">
        {halls.map((h) => (
          <button key={h.id} className="card hover pad" style={{ textAlign: "right" }} onClick={() => setOpen(h)}>
            <div className="row between wrap" style={{ gap: 8, marginBottom: 10 }}>
              <span className={`chip ${h.protocol === "تشريفات" ? "gold" : h.protocol === "رسمية" ? "navy" : ""}`}>{h.protocol}</span>
              <span className="chip">{h.capacity} مقعد</span>
            </div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>{h.name}</h3>
            <p className="tiny muted" style={{ marginBottom: 12 }}>{h.building} · {h.floor} · {h.layout}</p>
            <div className="mini-label" style={{ marginBottom: 5 }}>الإشغال الشهري</div>
            <Bar value={h.occupancy} />
          </button>
        ))}
      </div>

      {open && <HallSheet h={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function HallSheet({ h, onClose }: { h: Hall; onClose: () => void }) {
  const { bookings } = useStore();
  const rows = bookings.filter((b) => b.hallId === h.id);
  return (
    <Sheet title={h.name} sub={`${h.building} · ${h.floor}`} onClose={onClose}>
      <div className="grid" style={{ gap: 14 }}>
        <div className="card pad">
          <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
            <span className={`chip ${h.protocol === "تشريفات" ? "gold" : "navy"}`}>{h.protocol}</span>
            <span className="chip">{h.capacity} مقعد</span>
            <span className="chip">{h.layout}</span>
          </div>
          <div className="grid" style={{ gap: 10 }}>
            <div className="row between"><span className="tiny muted">المشرف</span><PersonLine id={h.supervisorId} /></div>
            <div className="row between"><span className="tiny muted">أوقات الإتاحة</span><span style={{ fontSize: 13 }}>{h.hours}</span></div>
            <div className="row between"><span className="tiny muted">سياسة الحجز</span><span style={{ fontSize: 13 }}>{h.policy}</span></div>
          </div>
          <div className="sep" />
          <div className="mini-label" style={{ marginBottom: 7 }}>التجهيزات</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {h.equipment.map((e) => <span key={e} className="chip">{e}</span>)}
          </div>
        </div>

        <Panel title="الحجوزات" icon={<CalendarClock size={17} />} hint={`${rows.length} حجز`}>
          {rows.length === 0 ? <Empty text="لا حجوزات" /> : (
            <div className="grid" style={{ gap: 9 }}>
              {rows.map((b) => (
                <div key={b.id} className="row between card pad" style={{ padding: 11 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 13 }}>{b.title}</b>
                    <div className="tiny muted">{b.day} · <span className="ltr">{b.start}–{b.end}</span> · {b.attendees} شخصاً</div>
                  </div>
                  <StatusChip status={b.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {rows.some((b) => b.prep.length > 0) && (
          <Panel title="قوائم التجهيز" icon={<ListChecks size={17} />}>
            {rows.filter((b) => b.prep.length).map((b) => (
              <div key={b.id} style={{ marginBottom: 12 }}>
                <b style={{ fontSize: 13 }}>{b.title}</b>
                <div className="grid" style={{ gap: 6, marginTop: 7 }}>
                  {b.prep.map((p) => (
                    <div key={p.label} className="row" style={{ gap: 8 }}>
                      <CheckCircle2 size={15} style={{ color: p.done ? "var(--ok)" : "var(--line)" }} />
                      <span className="tiny" style={{ textDecoration: p.done ? "line-through" : undefined, color: p.done ? "var(--muted)" : undefined }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Panel>
        )}

        <Panel title="الملاحظات" icon={<MessageSquare size={17} />}>
          <NoteBoard target={h.id} targetLabel={h.name} />
        </Panel>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════ الوفود ═══════════════════════ */

export function Delegations() {
  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-2">
        {delegations.map((d) => (
          <div key={d.id} className="card pad hover">
            <div className="row between wrap" style={{ gap: 8, marginBottom: 10 }}>
              <span className="chip gold"><Flag size={13} /> وفد رسمي</span>
              <StatusChip status={d.status} />
            </div>
            <h3 style={{ fontSize: 17, marginBottom: 5 }}>{d.name}</h3>
            <p className="tiny muted" style={{ marginBottom: 12 }}>{d.purpose}</p>

            <div className="grid" style={{ gap: 8, marginBottom: 12 }}>
              <div className="row between"><span className="tiny muted">الوصول</span><b style={{ fontSize: 13 }}>{d.arrival}</b></div>
              <div className="row between"><span className="tiny muted">المغادرة</span><b style={{ fontSize: 13 }}>{d.departure}</b></div>
              <div className="row between"><span className="tiny muted">مسؤول المراسم</span><PersonLine id={d.hostId} /></div>
            </div>

            <div className="mini-label" style={{ marginBottom: 5 }}>جاهزية الترتيبات</div>
            <Bar value={d.progress} />

            <div className="sep" />
            <div className="mini-label" style={{ marginBottom: 8 }}>البرنامج</div>
            <div className="tline">
              {d.program.map((p) => (
                <div key={p.time} className="tline-item" style={{ paddingBottom: 12 }}>
                  <b style={{ fontSize: 13.5 }}>{p.item}</b>
                  <p><span className="ltr" style={{ display: "inline-block" }}>{p.time}</span> · {p.place}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ الملفات ═══════════════════════ */

export function Files() {
  const { me, documents, files: live } = useStore();
  const [kind, setKind] = useState("الكل");
  const [openId, setOpenId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const kinds = ["الكل", ...Array.from(new Set(live.map((f) => f.kind)))];
  const myRank = clearanceRank(me.clearance);
  const list = live.filter((f) => kind === "الكل" || f.kind === kind);
  const open = live.find((f) => f.id === openId) ?? null;
  const writable = live.filter((f) => clearanceRank(f.classification) <= myRank);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="lock-note">
        <Lock size={17} />
        <span>
          درجة تصريحك «{me.clearance}». النظام يعتمد <b>درجتين فقط</b>: <b>عادي</b> يطّلع عليه كل من يخصّه العمل،
          و<b>سرّي</b> لا يفتحه إلا من يملك تصريحاً سرّياً — ويظهر لغيره محجوباً باسم مطموس.
        </span>
      </div>

      <div className="row between wrap" style={{ gap: 12 }}>
        <Pills value={kind} onChange={setKind} items={kinds.map((k) => ({ key: k, label: k }))} />
        <button className="btn gold btn-add" onClick={() => setPicking(true)}><UploadCloud size={16} /> رفع مستند</button>
      </div>

      <div className="grid g-3">
        {list.map((f) => {
          const locked = clearanceRank(f.classification) > myRank;
          return (
            <button key={f.id} className="card pad hover" style={{ opacity: locked ? .72 : 1, textAlign: "right" }} onClick={() => !locked && setOpenId(f.id)} disabled={locked}>
              <div className="row between wrap" style={{ gap: 8, marginBottom: 10 }}>
                <span className="chip navy"><FolderOpen size={13} /> {f.kind}</span>
                <ClassChip c={f.classification} />
              </div>
              <h3 style={{ fontSize: 15.5, marginBottom: 4, filter: locked ? "blur(4px)" : undefined }}>{f.name}</h3>
              <p className="tiny muted"><span className="t-ref">{f.ref}</span> · {f.items} مستنداً · {f.updated}</p>
              <div className="sep" />
              {locked ? (
                <div className="row" style={{ gap: 8, color: "var(--warn)" }}>
                  <Lock size={15} /><span className="tiny">محجوب — يتطلب تصريح «{f.classification}»</span>
                </div>
              ) : (
                <div className="row between">
                  <PersonLine id={f.ownerId} />
                  <span className="chip">{entityOf(f.entityId).short}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <Sheet
          title={open.name}
          sub={`${open.ref} · ${open.kind} · ${entityOf(open.entityId).short}`}
          onClose={() => setOpenId(null)}
          footer={<UploadButton target={{ folderId: open.id }} classification={open.classification} label="رفع مستند إلى هذا المجلد" />}
        >
          <DocList docs={documents.filter((d) => d.folderId === open.id)} empty="لا مستندات مرفوعة في هذا المجلد بعد — ارفع أول مستند من الزر في الأسفل." />
        </Sheet>
      )}

      {picking && (
        <Sheet title="رفع مستند" sub="اختر المجلد الذي يُحفظ فيه المستند" onClose={() => setPicking(false)}>
          <div className="grid" style={{ gap: 8 }}>
            {writable.map((f) => (
              <button key={f.id} className="card pad hover" style={{ padding: 13, textAlign: "right" }} onClick={() => { setPicking(false); setOpenId(f.id); }}>
                <div className="row between">
                  <b style={{ fontSize: 14 }}><FolderOpen size={14} style={{ verticalAlign: -2 }} /> {f.name}</b>
                  <ClassChip c={f.classification} />
                </div>
                <span className="tiny muted">{f.kind} · {f.items} مستنداً</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ═══════════════════════ الأشخاص ═══════════════════════ */

export function People() {
  const { assignments } = useStore();
  const [open, setOpen] = useState<Person | null>(null);
  const [q, setQ] = useState("");

  const list = people.filter((p) => !q || p.name.includes(q) || p.title.includes(q) || entityOf(p.entityId).short.includes(q));

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <label className="top-search" style={{ width: "100%", maxWidth: 420, marginInlineStart: 0 }}>
        <IdCard size={16} />
        <input placeholder="بحث بالاسم أو الصفة أو الجهة…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <div className="grid g-3">
        {list.map((p) => {
          const load = assignments.filter((a) => a.ownerId === p.id && a.status !== "مُغلق").length;
          return (
            <button key={p.id} className="card hover pad" style={{ textAlign: "right" }} onClick={() => setOpen(p)}>
              <div className="row" style={{ gap: 12, marginBottom: 12 }}>
                <Ava id={p.id} size="lg" />
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 15, display: "block" }}>{p.name}</b>
                  <span className="tiny muted">{p.title}</span>
                </div>
              </div>
              <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
                <span className="chip navy">{entityOf(p.entityId).short}</span>
                {p.unit && <span className="chip">{p.unit}</span>}
              </div>
              <div className="row between">
                <span className="tiny muted">مهام مفتوحة</span>
                <span className={`chip ${load > 2 ? "warn" : "ok"}`}>{load}</span>
              </div>
            </button>
          );
        })}
      </div>

      {open && <PersonSheet p={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PersonSheet({ p, onClose }: { p: Person; onClose: () => void }) {
  const { assignments } = useStore();
  const role = roleOf(p.role);
  if (!role) return null;
  const mine = assignments.filter((a) => a.ownerId === p.id);
  const deputy = people.find((x) => x.deputyOf === p.id);

  return (
    <Sheet title={p.name} sub={p.title} onClose={onClose}>
      <div className="grid" style={{ gap: 14 }}>
        <div className="card pad">
          <div className="row" style={{ gap: 14, marginBottom: 14 }}>
            <Ava id={p.id} size="lg" />
            <div>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="chip gold">{role.title}</span>
                <span className="chip navy">{entityOf(p.entityId).short}</span>
                <ClassChip c={p.clearance} />
              </div>
              <p className="tiny muted" style={{ marginTop: 7 }}>نطاق الرؤية: {reachLabel(p)}</p>
            </div>
          </div>
          <div className="grid" style={{ gap: 9 }}>
            <div className="row between"><span className="tiny muted"><Phone size={13} style={{ verticalAlign: -2 }} /> الجوال</span><b className="ltr" style={{ fontSize: 13 }}>{p.phone}</b></div>
            <div className="row between"><span className="tiny muted">الهاتف الداخلي</span><b className="ltr" style={{ fontSize: 13 }}>{p.ext}</b></div>
            <div className="row between"><span className="tiny muted"><MapPin size={13} style={{ verticalAlign: -2 }} /> المكتب</span><span style={{ fontSize: 13 }}>{p.office}</span></div>
            <div className="row between"><span className="tiny muted">متوسط زمن الاستجابة</span><span className="chip ok">{p.avgResponseHours} ساعة</span></div>
            {deputy && <div className="row between"><span className="tiny muted">ينوب عنه</span><PersonLine id={deputy.id} /></div>}
          </div>
        </div>

        <Panel title="المهام الدائمة" icon={<ListChecks size={17} />}>
          <ul className="grid" style={{ gap: 8 }}>
            {p.duties.map((d) => (
              <li key={d} className="row" style={{ gap: 9, alignItems: "flex-start" }}>
                <CheckCircle2 size={15} style={{ color: "var(--gold)", marginTop: 3 }} />
                <span style={{ fontSize: 13.5 }}>{d}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="صلاحيات دوره" icon={<ShieldCheck size={17} />} hint={role.scope}>
          <p className="tiny muted" style={{ marginBottom: 11 }}>{role.summary}</p>
          <div className="row wrap" style={{ gap: 6 }}>
            {(Object.keys(actionLabels) as Action[]).map((a) => {
              const g = role.grants[a];
              return (
                <span key={a} className={`chip ${g === "full" ? "ok" : g === "partial" ? "warn" : ""}`} style={{ opacity: g === "none" ? .5 : 1 }}>
                  {actionLabels[a]} {g === "full" ? "✓" : g === "partial" ? "جزئي" : "✕"}
                </span>
              );
            })}
          </div>
        </Panel>

        <Panel title="المهام الجارية" icon={<ListChecks size={17} />} hint={`${mine.length} تكليف`}>
          {mine.length === 0 ? <p className="muted tiny">لا مهام مسندة حالياً.</p> : (
            <div className="grid" style={{ gap: 10 }}>
              {mine.map((a) => (
                <div key={a.id} className="card pad" style={{ padding: 12 }}>
                  <div className="row between wrap" style={{ gap: 8, marginBottom: 6 }}>
                    <b style={{ fontSize: 13.5 }}>{a.title}</b>
                    <StatusChip status={a.status} />
                  </div>
                  <div className="row between wrap" style={{ gap: 8 }}>
                    <span className="t-ref">{a.ref}</span>
                    <span className="tiny muted">يستحق {a.due}</span>
                  </div>
                  <div style={{ marginTop: 8 }}><Bar value={a.progress} /></div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="الملاحظات" icon={<MessageSquare size={17} />}>
          <NoteBoard target={p.id} targetLabel={p.name} />
        </Panel>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════ الملاحظات ═══════════════════════ */

export function Notes() {
  const { notes, addNote, me, toast } = useStore();
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const target = `personal:${me.id}`;
  const mine = notes
    .filter((n) => n.authorId === me.id && n.target === target && n.scope === "خاصة")
    .filter((n) => !query.trim() || n.text.toLowerCase().includes(query.trim().toLowerCase()));

  const save = async () => {
    const value = text.trim();
    if (!value) return toast("اكتب الملاحظة أولاً", "warn");
    await addNote({ target, targetLabel: "ملاحظاتي", text: value, scope: "خاصة" });
    setText("");
    setCreating(false);
  };

  return (
    <div className="personal-notes">
      <div className="personal-notes-tools">
        <label className="notes-search">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في ملاحظاتك…" />
        </label>
        <button className="btn gold notes-add" onClick={() => setCreating(true)}>
          <Plus size={17} /> ملاحظة جديدة
        </button>
      </div>

      <p className="personal-notes-private">
        <Lock size={14} /> هذه المساحة شخصية وخاصة بك، ولا تظهر لباقي مستخدمي المنظومة.
      </p>

      {mine.length === 0 ? (
        <Empty text={query ? "لا توجد نتيجة مطابقة" : "لا توجد ملاحظات شخصية بعد"} hint={query ? "جرّب كلمة بحث أخرى" : "اضغط «ملاحظة جديدة» ودوّن أي شيء تريد الرجوع إليه لاحقاً"} />
      ) : (
        <div className="notes-grid">
          {mine.map((n) => {
            const rows = n.text.split("\n");
            const title = rows[0].slice(0, 72);
            const body = rows.slice(1).join("\n").trim();
            return (
              <article key={n.id} className="personal-note-card">
                <StickyNote size={18} />
                <div>
                  <h3>{title}</h3>
                  {body && <p>{body}</p>}
                  <time>{n.at}</time>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {creating && (
        <Sheet title="ملاحظة جديدة" sub="خاصة بك فقط" onClose={() => { setCreating(false); setText(""); }} footer={
          <>
            <button className="btn gold" onClick={() => void save()}>حفظ الملاحظة</button>
            <button className="btn ghost" onClick={() => { setCreating(false); setText(""); }}>إلغاء</button>
          </>
        }>
          <div className="field note-editor-field">
            <label htmlFor="personal-note-text">اكتب ملاحظتك</label>
            <textarea
              id="personal-note-text"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"العنوان في السطر الأول\nثم اكتب التفاصيل التي تريد الاحتفاظ بها…"}
            />
          </div>
        </Sheet>
      )}
    </div>
  );
}
