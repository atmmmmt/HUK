"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock, ArrowLeft, BadgeCheck, CalendarDays, CheckCircle2, ClipboardList, Clock3, DoorOpen,
  FileCheck2, Gavel, Inbox, ListTodo, MapPin, MessageSquare, Paperclip, Repeat2, Stamp, TriangleAlert,
  Users, Video,
} from "lucide-react";
import { decisions, entities, entityOf, hallOf, letters, meetings } from "@/lib/lookup";
import { lifecycle, todaySchedule } from "@/lib/constants";
import { seesAssignment, slaLabel } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { Assignment, Meeting } from "@/lib/types";
import {
  AvaStack, Ava, Bar, Chain, ClassChip, Empty, Kpi, NoteBoard, Panel, PersonLine, Pills, PriorityChip,
  Sheet, StatusChip, Tabs,
} from "@/components/ui";
import MobileToday from "@/components/mobile-home";

/* ═══════════════════════ لوحة اليوم ═══════════════════════ */

export function Overview() {
  const { assignments, me, notes } = useStore();
  const visible = assignments.filter((a) => seesAssignment(me, a));
  const late = visible.filter((a) => a.status === "متأخر" || a.escalation >= 2);
  const review = visible.filter((a) => a.status === "قيد المراجعة");
  const open = visible.filter((a) => a.status !== "مُغلق");
  const unhandled = letters.filter((l) => !l.handled);
  const directives = notes.filter((n) => n.scope === "توجيه المحافظ");
  // ما أصدرتَه أنت وانتهت مهلته — تراجعه مع المكلَّف
  const myReviews = visible.filter(
    (a) => a.issuerId === me.id && a.status !== "مُغلق" && (a.status === "متأخر" || a.reviewNotified),
  );

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <MobileToday />
      <div className="grid g-5">
        <Kpi label="مواعيد اليوم" value={todaySchedule.length} meta="اجتماع واحد جارٍ الآن" icon={<CalendarDays size={17} />} tone="navy" />
        <Kpi label="التكليفات المفتوحة" value={open.length} meta={`${review.length} بانتظار الاعتماد`} icon={<ListTodo size={17} />} tone="gold" />
        <Kpi label="متأخرة ومصعَّدة" value={late.length} meta="تحتاج تدخلاً اليوم" icon={<TriangleAlert size={17} />} tone="danger" trend="down" />
        <Kpi label="بانتظار قراركم" value={decisions.filter((d) => d.awaiting === "governor").length} meta={`من أصل ${decisions.length} معاملة`} icon={<Stamp size={17} />} tone="warn" />
        <Kpi label="كتب غير مُعالَجة" value={unhandled.length} meta="وردت ولم تُحَل بعد" icon={<Inbox size={17} />} tone="navy" />
      </div>

      <div className="split">
        <div className="grid" style={{ gap: 16 }}>
          <Panel title="برنامج اليوم" icon={<Clock3 size={17} />} hint="بتوقيت المحافظة">
            <div className="tline">
              {todaySchedule.map((s) => (
                <div key={s.time} className={`tline-item ${s.tone === "done" ? "dim" : ""}`}>
                  <div className="row between wrap" style={{ gap: 8 }}>
                    <b>{s.title}</b>
                    <span className={`chip ${s.tone === "now" ? "gold live" : s.tone === "done" ? "ok" : "navy"}`}>{s.status}</span>
                  </div>
                  <p><span className="ltr" style={{ display: "inline-block" }}>{s.time}</span> · {s.place}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="التكليفات المتأخرة والمصعَّدة"
            icon={<TriangleAlert size={17} />}
            hint={`${late.length} تكليف`}
            flush
          >
            {late.length === 0 ? <Empty text="لا تكليفات متأخرة" hint="كل الجهات ضمن المواعيد" /> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>التكليف</th><th>الجهة</th><th>المكلَّف</th><th>الاستحقاق</th><th>الإنجاز</th></tr>
                  </thead>
                  <tbody>
                    {late.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="t-main">{a.title}</div>
                          <div className="t-sub"><span className="t-ref">{a.ref}</span> · <PriorityChipInline p={a.priority} /></div>
                        </td>
                        <td>{entityOf(a.entityId).short}</td>
                        <td><PersonLine id={a.ownerId} /></td>
                        <td className="tiny">{a.due}</td>
                        <td style={{ minWidth: 130 }}><Bar value={a.progress} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="التزام الجهات بالمواعيد" icon={<BadgeCheck size={17} />} hint="آخر 30 يوماً">
            <div className="grid" style={{ gap: 12 }}>
              {[...entities].sort((a, b) => b.compliance - a.compliance).map((e) => (
                <div key={e.id} className="compliance-row">
                  <span className="cr-name">{e.short}</span>
                  <div className="cr-bar"><Bar value={e.compliance} /></div>
                  <span className="cr-meta tiny muted">{e.openTasks} مفتوح · {e.lateTasks} متأخر</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          {myReviews.length > 0 && (
            <Panel title="مراجعة مستحقة" icon={<AlarmClock size={17} />} hint="انتهت مهلتها — راجع المكلَّف">
              <div className="grid" style={{ gap: 10 }}>
                {myReviews.map((a) => (
                  <div key={a.id} className="card pad" style={{ padding: 13, background: "var(--warn-bg)", borderColor: "#f0dcb4" }}>
                    <b style={{ fontSize: 13.5, display: "block", marginBottom: 6 }}>{a.title}</b>
                    <div className="row between wrap" style={{ gap: 8 }}>
                      <PersonLine id={a.ownerId} />
                      <span className="chip warn">استحق {a.due}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="بانتظار اعتمادكم" icon={<Stamp size={17} />} hint={`${decisions.length} معاملة`}>
            <div className="grid" style={{ gap: 10 }}>
              {decisions.slice(0, 4).map((d) => (
                <div key={d.id} className="card hover pad" style={{ padding: 13 }}>
                  <div className="row between" style={{ gap: 8, marginBottom: 6 }}>
                    <b style={{ fontSize: 13.5 }}>{d.title}</b>
                    <PriorityChipInline p={d.priority} />
                  </div>
                  <p className="tiny muted">{d.source} · {d.age}{d.amount ? ` · ${d.amount}` : ""}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="توجيهات السيد المحافظ" icon={<MessageSquare size={17} />} hint="آخر ما صدر">
            {directives.length === 0 ? <p className="muted tiny">لا توجيهات مسجّلة.</p> : directives.map((n) => (
              <div key={n.id} className="note-item governor">
                <Ava id={n.authorId} size="sm" />
                <div className="note-body">
                  <div className="note-top"><b>{n.targetLabel}</b><time>{n.at}</time></div>
                  <p className="note-text">{n.text}</p>
                </div>
              </div>
            ))}
          </Panel>

          <Panel title="الاجتماعات القادمة" icon={<Users size={17} />}>
            <div className="grid" style={{ gap: 10 }}>
              {meetings.filter((m) => m.status !== "منعقد").slice(0, 4).map((m) => (
                <div key={m.id} className="row between" style={{ gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--line-2)" }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 13.5, display: "block" }}>{m.title}</b>
                    <span className="tiny muted">{m.day} · {m.time} · {m.hallId ? hallOf(m.hallId)?.name ?? "قاعة" : "اتصال مرئي"}</span>
                  </div>
                  <StatusChip status={m.status} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PriorityChipInline({ p }: { p: Assignment["priority"] }) {
  return <PriorityChip p={p} />;
}

/* ═══════════════════════ التقويم والمواعيد ═══════════════════════ */

export function Calendar() {
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const load = [3, 5, 2, 4, 1];

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <Panel title="الأسبوع الجاري" icon={<CalendarDays size={17} />} hint="عدد المواعيد في كل يوم">
        <div className="grid week-strip" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
          {days.map((d, i) => (
            <div key={d} className={`card hover pad ${i === 1 ? "" : ""}`} style={{ padding: 14, borderColor: i === 1 ? "var(--gold)" : undefined, background: i === 1 ? "var(--gold-soft)" : undefined }}>
              <div className="mini-label">{d}</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{load[i]}</div>
              <div className="tiny muted">موعد</div>
              <div className="spark" style={{ height: 34, marginTop: 8 }}>
                {Array.from({ length: load[i] }).map((_, k) => (
                  <i key={k} className={i === 1 ? "gold" : ""} style={{ height: `${40 + k * 14}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="split">
        <Panel title="برنامج اليوم بالتفصيل" icon={<Clock3 size={17} />} flush>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>الوقت</th><th>الموعد</th><th>المكان</th><th>الحالة</th></tr></thead>
              <tbody>
                {todaySchedule.map((s) => (
                  <tr key={s.time}>
                    <td className="ltr t-ref" style={{ fontSize: 13 }}>{s.time}</td>
                    <td className="t-main">{s.title}</td>
                    <td className="tiny muted">{s.place}</td>
                    <td><StatusChip status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="طلبات المقابلة" icon={<Users size={17} />} hint="بانتظار التحديد">
          <div className="grid" style={{ gap: 12 }}>
            {[
              { who: "p12", sub: "عرض خطة معالجة الانقطاعات", need: "30 دقيقة" },
              { who: "p8", sub: "المصادقة على التصميم الأساسي لحي النور", need: "20 دقيقة" },
              { who: "p16", sub: "جاهزية فرق الإنقاذ قبل الموسم", need: "15 دقيقة" },
            ].map((r) => (
              <div key={r.who} className="card pad hover" style={{ padding: 13 }}>
                <PersonLine id={r.who} />
                <p className="tiny" style={{ margin: "8px 0" }}>{r.sub}</p>
                <div className="row between">
                  <span className="chip">{r.need}</span>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn ghost sm">اقتراح وقت</button>
                    <button className="btn primary sm">تحديد</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════ الاجتماعات ═══════════════════════ */

export function Meetings() {
  const [open, setOpen] = useState<Meeting | null>(null);
  const [tab, setTab] = useState("all");
  const list = meetings.filter((m) => (tab === "all" ? true : tab === "upcoming" ? m.status !== "منعقد" : m.status === "منعقد"));

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="row between wrap" style={{ gap: 12 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "all", label: "الكل", n: meetings.length },
            { key: "upcoming", label: "قادمة وجارية", n: meetings.filter((m) => m.status !== "منعقد").length },
            { key: "done", label: "منعقدة", n: meetings.filter((m) => m.status === "منعقد").length },
          ]}
        />
        <span className="lock-note" style={{ padding: "8px 13px" }}>
          <TriangleAlert size={15} />
          لا يُغلق الاجتماع إدارياً ما دام فيه مخرج واحد غير مُسند أو غير مُغلق
        </span>
      </div>

      <div className="grid g-2">
        {list.map((m) => {
          const pending = m.outcomes.filter((o) => !o.closed).length;
          return (
            <button key={m.id} className="card hover pad" style={{ textAlign: "right" }} onClick={() => setOpen(m)}>
              <div className="row between wrap" style={{ gap: 8, marginBottom: 8 }}>
                <span className="chip navy">{m.kind}</span>
                <StatusChip status={m.status} />
              </div>
              <h3 style={{ fontSize: 16.5, marginBottom: 6 }}>{m.title}</h3>
              <p className="tiny muted" style={{ marginBottom: 12 }}>{m.summary}</p>

              <div className="row wrap" style={{ gap: 14, marginBottom: 12 }}>
                <span className="row tiny muted" style={{ gap: 6 }}><CalendarDays size={14} /> {m.day} · {m.time}</span>
                <span className="row tiny muted" style={{ gap: 6 }}>
                  {m.online ? <Video size={14} /> : <MapPin size={14} />}
                  {m.online ? "اتصال مرئي" : hallOf(m.hallId ?? "")?.name ?? "قاعة"}
                </span>
              </div>

              <div className="row between">
                <AvaStack ids={m.inviteeIds} />
                <span className={`chip ${pending ? "warn" : "ok"}`}>
                  {pending ? `${pending} مخرج معلّق` : "كل المخرجات مُسندة"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <Sheet
          title={open.title}
          sub={`${open.kind} · ${open.day} · ${open.time}`}
          onClose={() => setOpen(null)}
          footer={
            <>
              <button className="btn primary"><FileCheck2 size={16} /> اعتماد المحضر</button>
              <button className="btn ghost"><Repeat2 size={16} /> تحويل المخرجات إلى تكليفات</button>
            </>
          }
        >
          <div className="grid" style={{ gap: 14 }}>
            <div className="card pad">
              <div className="row wrap" style={{ gap: 10, marginBottom: 12 }}>
                <StatusChip status={open.status} />
                <span className="chip">{open.online ? "اتصال مرئي" : hallOf(open.hallId ?? "")?.name ?? "قاعة"}</span>
                <span className={`chip ${open.minutesApproved ? "ok" : "warn"}`}>
                  {open.minutesApproved ? "المحضر معتمد" : "المحضر غير معتمد"}
                </span>
              </div>
              <div className="grid" style={{ gap: 10 }}>
                <div className="row between"><span className="tiny muted">رئيس الجلسة</span><PersonLine id={open.chairId} /></div>
                <div className="row between"><span className="tiny muted">أمين السر</span><PersonLine id={open.secretaryId} /></div>
              </div>
            </div>

            <Panel title="جدول الأعمال" icon={<ClipboardList size={17} />}>
              <ol className="grid" style={{ gap: 8 }}>
                {open.agenda.map((a, i) => (
                  <li key={a} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                    <span className="chip navy" style={{ minWidth: 26, justifyContent: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: 13.5 }}>{a}</span>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel title="الحضور والتأكيد" icon={<Users size={17} />} hint={`${open.confirmed.length}/${open.inviteeIds.length} أكّدوا`}>
              <div className="grid" style={{ gap: 9 }}>
                {open.inviteeIds.map((id) => {
                  const ok = open.confirmed.includes(id);
                  const apo = open.apologized.includes(id);
                  return (
                    <div key={id} className="row between">
                      <PersonLine id={id} />
                      <span className={`chip ${ok ? "ok" : apo ? "danger" : "warn"}`}>
                        {ok ? "مؤكد" : apo ? "اعتذر" : "بانتظار التأكيد"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {open.minutes && (
              <Panel title="المحضر" icon={<FileCheck2 size={17} />}>
                <p style={{ fontSize: 13.5, lineHeight: 1.9 }}>{open.minutes}</p>
              </Panel>
            )}

            <Panel title="المخرجات ومتابعتها" icon={<Gavel size={17} />} hint={`${open.outcomes.length} مخرج`}>
              {open.outcomes.length === 0 ? <p className="muted tiny">لم تُسجَّل مخرجات بعد.</p> : (
                <div className="grid" style={{ gap: 11 }}>
                  {open.outcomes.map((o) => (
                    <div key={o.id} className="card pad" style={{ padding: 13, background: o.closed ? "var(--ok-bg)" : undefined, borderColor: o.closed ? "#c6e8da" : undefined }}>
                      <p style={{ fontSize: 13.5, marginBottom: 8 }}>{o.text}</p>
                      <div className="row between wrap" style={{ gap: 8 }}>
                        {o.assignmentRef ? (
                          <span className="chip navy"><ListTodo size={13} /> <span className="t-ref">{o.assignmentRef}</span></span>
                        ) : o.closed ? (
                          <span className="chip ok"><CheckCircle2 size={13} /> أُغلق بسبب موثّق</span>
                        ) : (
                          <span className="chip danger"><TriangleAlert size={13} /> غير مُسند — يمنع إغلاق الاجتماع</span>
                        )}
                        {o.ownerId && <PersonLine id={o.ownerId} />}
                      </div>
                      {o.reason && <p className="tiny muted" style={{ marginTop: 7 }}>{o.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="الملاحظات" icon={<MessageSquare size={17} />}>
              <NoteBoard target={open.id} targetLabel={open.title} />
            </Panel>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ═══════════════════════ القرارات ═══════════════════════ */

export function Decisions() {
  const { me, resolveDecision } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const canApprove = me.role === "governor" || me.role === "deputy" || me.role === "chief";

  async function decide(id: string, action: "approve" | "return") {
    setBusy(id);
    try {
      await resolveDecision(id, action);
    } catch {
      /* رسالة الرفض تظهر من المتجر */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      {!canApprove && (
        <div className="lock-note">
          <TriangleAlert size={17} />
          <span>صفتك «{me.title}» لا تملك صلاحية الاعتماد. تظهر لك المعاملات للاطلاع فقط.</span>
        </div>
      )}

      <div className="grid g-2">
        {decisions.map((d) => {
          const isDone = busy === d.id;
          return (
            <div key={d.id} className="card hover pad" style={{ opacity: isDone ? .6 : 1 }}>
              <div className="row between wrap" style={{ gap: 8, marginBottom: 10 }}>
                <span className="chip gold"><Stamp size={13} /> {d.awaiting === "governor" ? "بانتظار المحافظ" : d.awaiting === "deputy" ? "بانتظار النائب" : "بانتظار مدير المكتب"}</span>
                <PriorityChip p={d.priority} />
              </div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{d.title}</h3>
              <p className="tiny muted" style={{ marginBottom: 6 }}>{d.source} · {entityOf(d.entityId).short}</p>
              {d.amount && <p className="chip navy" style={{ marginBottom: 10 }}>{d.amount}</p>}
              <div className="row between wrap" style={{ gap: 8, marginTop: 12 }}>
                <span className="tiny muted"><Clock3 size={13} style={{ verticalAlign: -2 }} /> {d.age}</span>
                {isDone ? (
                  <span className="chip ok"><CheckCircle2 size={13} /> اعتُمد</span>
                ) : canApprove ? (
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn ghost sm" disabled={!!busy} onClick={() => decide(d.id, "return")}>
                      إعادة
                    </button>
                    <button className="btn gold sm" disabled={!!busy} onClick={() => decide(d.id, "approve")}>
                      <BadgeCheck size={15} /> اعتماد
                    </button>
                  </div>
                ) : <span className="chip">اطلاع فقط</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════ التكليفات ═══════════════════════ */

const statusFilters = ["الكل", "متأخر", "قيد التنفيذ", "قيد المراجعة", "مُسند", "مُغلق"];

export function Assignments() {
  const { assignments, me } = useStore();
  const [filter, setFilter] = useState("الكل");
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => assignments.filter((a) => seesAssignment(me, a)), [assignments, me]);
  const list = filter === "الكل" ? visible : visible.filter((a) => a.status === filter);
  const current = visible.find((a) => a.id === open) ?? null;

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-4">
        <Kpi label="ضمن نطاق رؤيتك" value={visible.length} meta="تكليف" icon={<ListTodo size={17} />} />
        <Kpi label="متأخرة" value={visible.filter((a) => a.status === "متأخر").length} icon={<TriangleAlert size={17} />} tone="danger" />
        <Kpi label="بانتظار الاعتماد" value={visible.filter((a) => a.status === "قيد المراجعة").length} icon={<Stamp size={17} />} tone="warn" />
        <Kpi label="مُغلقة" value={visible.filter((a) => a.status === "مُغلق").length} icon={<CheckCircle2 size={17} />} tone="ok" />
      </div>

      <Pills
        value={filter}
        onChange={setFilter}
        items={statusFilters.map((s) => ({
          key: s, label: s, n: s === "الكل" ? visible.length : visible.filter((a) => a.status === s).length,
        }))}
      />

      <section className="card">
        <div className="card-body flush">
          {list.length === 0 ? <Empty text="لا تكليفات ضمن هذا التصنيف" /> : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>الرقم والعنوان</th><th>الجهة</th><th>المكلَّف</th><th>الأولوية</th>
                    <th>الاستحقاق</th><th>الإنجاز</th><th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id} className="clickable" onClick={() => setOpen(a.id)}>
                      <td style={{ maxWidth: 330 }}>
                        <div className="t-main">{a.title}</div>
                        <div className="t-sub"><span className="t-ref">{a.ref}</span> · {a.source}</div>
                      </td>
                      <td className="tiny">{entityOf(a.entityId).short}</td>
                      <td><PersonLine id={a.ownerId} /></td>
                      <td><PriorityChip p={a.priority} /></td>
                      <td className="tiny">{a.due}</td>
                      <td style={{ minWidth: 130 }}><Bar value={a.progress} /></td>
                      <td><StatusChip status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {current && <AssignmentSheet a={current} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function AssignmentSheet({ a, onClose }: { a: Assignment; onClose: () => void }) {
  const { me, advance } = useStore();
  const isOwner = a.ownerId === me.id;
  const isBoss = ["governor", "deputy", "chief"].includes(me.role);
  const stepIndex = lifecycle.findIndex((l) => l.key === a.status);

  const [busy, setBusy] = useState(false);

  async function act(to: Assignment["status"]) {
    if (busy) return;
    setBusy(true);
    try {
      await advance(a.id, to);
    } catch {
      /* رسالة الرفض تظهر من المتجر */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={a.title}
      sub={`${a.ref} · ${a.source}`}
      onClose={onClose}
      footer={
        <>
          {isOwner && a.status === "مُسند" && (
            <button className="btn gold" disabled={busy} onClick={() => act("مُستلَم")}>
              <CheckCircle2 size={16} /> إقرار الاستلام
            </button>
          )}
          {isOwner && a.status === "مُستلَم" && (
            <button className="btn primary" disabled={busy} onClick={() => act("قيد التنفيذ")}>بدء التنفيذ</button>
          )}
          {isOwner && a.status === "قيد التنفيذ" && (
            <button className="btn primary" disabled={busy} onClick={() => act("قيد المراجعة")}>
              <ArrowLeft size={16} /> تسليم للمراجعة
            </button>
          )}
          {isBoss && a.status === "قيد المراجعة" && (
            <>
              <button className="btn gold" disabled={busy} onClick={() => act("مُغلق")}>
                <BadgeCheck size={16} /> اعتماد وإغلاق
              </button>
              <button className="btn ghost" disabled={busy} onClick={() => act("مُعاد للتصحيح")}>إعادة للتصحيح</button>
            </>
          )}
          {!isOwner && !isBoss && <span className="chip">اطلاع فقط ضمن صلاحيتك</span>}
        </>
      }
    >
      <div className="grid" style={{ gap: 14 }}>
        <div className="card pad">
          <div className="row wrap" style={{ gap: 8, marginBottom: 14 }}>
            <StatusChip status={a.status} />
            <PriorityChip p={a.priority} />
            <ClassChip c={a.classification} />
            {a.escalation > 0 && <span className="chip danger"><AlarmClock size={13} /> مستوى تصعيد {a.escalation}</span>}
          </div>
          <Bar value={a.progress} />
          <div className="sep" />
          <div className="grid" style={{ gap: 10 }}>
            <div className="row between"><span className="tiny muted">الجهة المكلَّفة</span><b style={{ fontSize: 13.5 }}>{entityOf(a.entityId).name}</b></div>
            <div className="row between"><span className="tiny muted">المكلَّف الرئيسي</span><PersonLine id={a.ownerId} /></div>
            {a.partnerIds.length > 0 && (
              <div className="row between"><span className="tiny muted">المشاركون</span><AvaStack ids={a.partnerIds} /></div>
            )}
            <div className="row between"><span className="tiny muted">أصدر التكليف</span><PersonLine id={a.issuerId} /></div>
            <div className="row between"><span className="tiny muted">الموعد النهائي</span><b style={{ fontSize: 13.5 }}>{a.due}</b></div>
            <div className="row between">
              <span className="tiny muted">المهلة المعتمدة</span>
              <span className="chip navy">{slaLabel(a.priority)}</span>
            </div>
            {a.scheduleDays && (
              <div className="row between">
                <span className="tiny muted">الجدول الزمني المتفق عليه</span>
                <span className="chip">{a.scheduleDays} أيام</span>
              </div>
            )}
          </div>
          <div className="sep" />
          <div className="mini-label" style={{ marginBottom: 5 }}>معيار الإغلاق</div>
          <p style={{ fontSize: 13.5 }}>{a.closeCriteria}</p>
        </div>

        <Panel title="دورة الحياة" icon={<Repeat2 size={17} />}>
          <div className="row wrap" style={{ gap: 6 }}>
            {lifecycle.map((l, i) => (
              <span key={l.key} className={`chip ${i < stepIndex ? "ok" : i === stepIndex ? "gold" : ""}`} title={l.hint}>
                {i <= stepIndex && <CheckCircle2 size={12} />} {l.key}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="المتابعة حسب الوصول" icon={<Clock3 size={17} />} hint="من استلم ومتى">
          <Chain chain={a.chain} />
        </Panel>

        {a.attachments.length > 0 && (
          <Panel title="المرفقات" icon={<Paperclip size={17} />}>
            <div className="grid" style={{ gap: 8 }}>
              {a.attachments.map((f) => (
                <div key={f.name} className="row between card pad" style={{ padding: 11 }}>
                  <span className="row" style={{ gap: 9 }}><Paperclip size={15} /> <b style={{ fontSize: 13 }}>{f.name}</b></span>
                  <span className="tiny muted">{f.size}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="الملاحظات" icon={<MessageSquare size={17} />}>
          <NoteBoard target={a.id} targetLabel={`تكليف ${a.ref}`} />
        </Panel>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════ المراسلات ═══════════════════════ */

export function Correspondence() {
  const [tab, setTab] = useState("وارد");
  const list = letters.filter((l) => l.direction === tab);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-4">
        <Kpi label="وارد غير مُعالَج" value={letters.filter((l) => l.direction === "وارد" && !l.handled).length} icon={<Inbox size={17} />} tone="warn" />
        <Kpi label="صادر هذا الأسبوع" value={letters.filter((l) => l.direction === "صادر").length} icon={<ArrowLeft size={17} />} />
        <Kpi label="مؤرشف" value={letters.filter((l) => l.direction === "مؤرشف").length} icon={<FileCheck2 size={17} />} tone="ok" />
        <Kpi label="كتب سرّية" value={letters.filter((l) => l.classification === "سرّي").length} icon={<TriangleAlert size={17} />} tone="danger" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "وارد", label: "الوارد", n: letters.filter((l) => l.direction === "وارد").length },
          { key: "صادر", label: "الصادر", n: letters.filter((l) => l.direction === "صادر").length },
          { key: "مؤرشف", label: "المؤرشف", n: letters.filter((l) => l.direction === "مؤرشف").length },
        ]}
      />

      <section className="card">
        <div className="card-body flush">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>الرقم</th><th>الجهة</th><th>الموضوع</th><th>الإحالة</th><th>الإجراء</th><th>السرّية</th><th>المهلة</th></tr>
              </thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id}>
                    <td><span className="t-ref">{l.number}</span><div className="t-sub">{l.date}</div></td>
                    <td className="t-main" style={{ fontSize: 13 }}>{l.party}</td>
                    <td style={{ maxWidth: 300 }}>{l.subject}</td>
                    <td className="tiny">{l.referredTo}</td>
                    <td className="tiny muted">{l.action}</td>
                    <td><ClassChip c={l.classification} /></td>
                    <td>
                      {l.handled ? <span className="chip ok">مُعالَج</span>
                        : l.dueHours ? <span className={`chip ${l.dueHours <= 24 ? "danger" : "warn"}`}><AlarmClock size={12} /> {l.dueHours} ساعة</span>
                          : <span className="chip">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
