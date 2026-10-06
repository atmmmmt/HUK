"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlarmClock, ArrowLeft, Plus, BadgeCheck, CalendarDays, CheckCircle2, ClipboardList, Clock3, DoorOpen,
  FileCheck2, Gavel, Inbox, ListTodo, MapPin, MessageSquare, Paperclip, Repeat2, Stamp, TriangleAlert,
  Users, Video,
} from "lucide-react";
import { decisions, entities, entityOf, hallOf, letters, meetings } from "@/lib/lookup";
import { lifecycle, todaySchedule } from "@/lib/constants";
import { canAccessSection, canAdvance, canApproveDecision, canSubmitDecision, canIssueAssignment, canManageMeetings, canScheduleMeeting, canRegisterLetters, canRespondRequest, seesAssignment, slaLabel } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { Assignment, Meeting, Person } from "@/lib/types";
import {
  AvaStack, Ava, Bar, Chain, ClassChip, Empty, Kpi, NoteBoard, Panel, PersonLine, Pills, PriorityChip,
  Sheet, StatusChip, Tabs,
} from "@/components/ui";
import MobileToday from "@/components/mobile-home";
import { useSwipeRow } from "@/components/swipe-row";
import { AssignOutcomes, NewAssignmentSheet, NewDecisionSheet, NewMeetingSheet, NewLetterSheet, SlotSheet } from "@/components/forms";
import { DocList, UploadButton } from "@/components/upload";

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
  const showCalendar = canAccessSection(me, "diwan", "calendar");
  const showAssignments = canAccessSection(me, "diwan", "assignments");
  const showDecisions = canAccessSection(me, "diwan", "decisions");
  const showCorrespondence = canAccessSection(me, "diwan", "correspondence");
  const showMeetings = canAccessSection(me, "diwan", "meetings");
  const showPerformance = canAccessSection(me, "directorates", "performance");

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <MobileToday />
      <div className="grid g-5">
        {showCalendar && <Kpi href="/diwan/calendar/" label="مواعيد اليوم" value={todaySchedule.length} meta="برنامج اليوم" icon={<CalendarDays size={17} />} tone="navy" />}
        {showAssignments && <Kpi href="/diwan/assignments/?filter=الكل" label="التكليفات المفتوحة" value={open.length} meta={`${review.length} بانتظار المراجعة`} icon={<ListTodo size={17} />} tone="gold" />}
        {showAssignments && <Kpi href="/diwan/assignments/?filter=متأخر" label="متأخرة ومصعَّدة" value={late.length} meta="تحتاج متابعة" icon={<TriangleAlert size={17} />} tone="danger" trend="down" />}
        {showDecisions && <Kpi href="/diwan/decisions/" label="معاملات التوقيع" value={decisions.length} meta="ضمن نطاق دورك" icon={<Stamp size={17} />} tone="warn" />}
        {showCorrespondence && <Kpi href="/diwan/correspondence/" label="كتب غير مُعالَجة" value={unhandled.length} meta="وردت ولم تُعالج بعد" icon={<Inbox size={17} />} tone="navy" />}
      </div>

      <div className="split">
        <div className="grid" style={{ gap: 16 }}>
          {showCalendar && <Panel title="برنامج اليوم" icon={<Clock3 size={17} />} hint="بتوقيت المحافظة">
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
          </Panel>}

          {showAssignments && <div className="gov-mobile-hide">
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
          </div>}

          {showPerformance && <div className="gov-mobile-hide">
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
          </div>}
        </div>

        <div className="grid" style={{ gap: 16 }}>
          {showAssignments && <div className="gov-mobile-hide">
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
          </div>}

          {showDecisions && <Panel title={canApproveDecision(me) ? "بانتظار اعتمادكم" : "معاملات التوقيع"} icon={<Stamp size={17} />} hint={`${decisions.length} معاملة`}>
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
          </Panel>}

          {showAssignments && <div className="gov-mobile-hide">
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
          </div>}

          {showMeetings && <div className="gov-mobile-hide">
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
          </div>}
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
  const { me, requests, respondRequest } = useStore();
  const [slot, setSlot] = useState<{ id: string; mode: "schedule" | "propose" } | null>(null);
  const interviews = requests.filter((r) => r.kind === "موعد لدى المحافظ" && r.status === "بانتظار الرد");
  const canRespond = canRespondRequest(me, "موعد لدى المحافظ");
  const slotReq = slot ? requests.find((r) => r.id === slot.id) : null;
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

        <Panel title="طلبات المقابلة" icon={<Users size={17} />} hint={`${interviews.length} بانتظار التحديد`}>
          {interviews.length === 0 ? <Empty text="لا طلبات مقابلة معلّقة" hint="تصل هنا طلبات «موعد لدى المحافظ» من الجهات" /> : (
            <div className="grid" style={{ gap: 12 }}>
              {interviews.map((r) => (
                <div key={r.id} className="card pad hover" style={{ padding: 13 }}>
                  <PersonLine id={r.byId} />
                  <p className="tiny" style={{ margin: "8px 0" }}>{r.title}</p>
                  <div className="row between wrap" style={{ gap: 8 }}>
                    <span className="chip">{r.detail}</span>
                    {canRespond ? (
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn ghost sm" onClick={() => setSlot({ id: r.id, mode: "propose" })}>اقتراح وقت</button>
                        <button className="btn primary sm" onClick={() => setSlot({ id: r.id, mode: "schedule" })}>تحديد</button>
                      </div>
                    ) : <span className="chip">اطلاع فقط</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {slot && slotReq && (
        <SlotSheet
          title={slot.mode === "schedule" ? "تحديد موعد المقابلة" : "اقتراح وقت بديل"}
          sub={slotReq.title}
          cta={slot.mode === "schedule" ? "تحديد وإضافة إلى الاجتماعات" : "إرسال الاقتراح"}
          onSubmit={(dayISO, time, note) => respondRequest(slotReq.id, { action: slot.mode, dayISO, time, note })}
          onClose={() => setSlot(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════ الاجتماعات ═══════════════════════ */

/** «اليوم» و«غداً» للاجتماعات المجدولة بتاريخ */
function dayLabel(m: Meeting) {
  const iso = (m as Meeting & { dateISO?: string }).dateISO;
  if (!iso) return m.day;
  const d = new Date(iso + "T00:00:00"); const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  return diff === 0 ? "اليوم" : diff === 1 ? "غداً" : m.day;
}

export function Meetings() {
  const { me, meetings: live, approveMinutes, rsvpMeeting } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = live.find((m) => m.id === openId) ?? null;
  const setOpen = (m: Meeting | null) => { setOpenId(m?.id ?? null); setAssigning(false); };
  const canManage = !!open && canManageMeetings(me);
  const unassigned = open ? open.outcomes.filter((o) => !o.assignmentRef && !o.closed).length : 0;
  const [tab, setTab] = useState("all");
  const list = live.filter((m) => (tab === "all" ? true : tab === "upcoming" ? m.status !== "منعقد" : m.status === "منعقد"));

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
        {canScheduleMeeting(me) && (
          <button className="btn gold btn-add" onClick={() => setCreating(true)}><Plus size={16} /> اجتماع جديد</button>
        )}
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
                <span className="row tiny muted" style={{ gap: 6 }}><CalendarDays size={14} /> {dayLabel(m)} · {m.time}</span>
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

      {creating && <NewMeetingSheet onClose={() => setCreating(false)} />}

      {open && (
        <Sheet
          title={open.title}
          sub={`${open.kind} · ${dayLabel(open)} · ${open.time}`}
          onClose={() => setOpen(null)}
          footer={
            open.inviteeIds.includes(me.id) && open.chairId !== me.id && open.status !== "منعقد" ? (
              <div className="rsvp">
                <button className="btn gold" disabled={busy || open.confirmed.includes(me.id)} onClick={async () => { setBusy(true); try { await rsvpMeeting(open.id, "confirm"); } catch { /* */ } finally { setBusy(false); } }}>
                  <CheckCircle2 size={16} /> {open.confirmed.includes(me.id) ? "حضورك مؤكّد" : "تأكيد الحضور"}
                </button>
                <button className="btn ghost" disabled={busy || open.apologized.includes(me.id)} onClick={async () => { setBusy(true); try { await rsvpMeeting(open.id, "apologize"); } catch { /* */ } finally { setBusy(false); } }}>
                  {open.apologized.includes(me.id) ? "اعتذرت" : "اعتذار"}
                </button>
              </div>
            ) : canManage ? (
              <>
                {!open.minutesApproved && (open.status === "منعقد" || open.status === "جارٍ الآن") && (
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={async () => { setBusy(true); try { await approveMinutes(open.id); } catch { /* المتجر يعرض السبب */ } finally { setBusy(false); } }}
                  >
                    <FileCheck2 size={16} /> اعتماد المحضر
                  </button>
                )}
                {unassigned > 0 && !assigning && (
                  <button className="btn ghost" onClick={() => setAssigning(true)}><Repeat2 size={16} /> تحويل المخرجات إلى تكليفات ({unassigned})</button>
                )}
                {open.minutesApproved && unassigned === 0 && <span className="chip ok"><CheckCircle2 size={13} /> المحضر معتمد وكل المخرجات مُسندة</span>}
              </>
            ) : <span className="chip">اطلاع فقط ضمن صلاحيتك</span>
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
              {assigning ? <AssignOutcomes meetingId={open.id} outcomes={open.outcomes} onDone={() => setAssigning(false)} /> : open.outcomes.length === 0 ? <p className="muted tiny">لم تُسجَّل مخرجات بعد.</p> : (
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

/** المعاملات من جهة المديرية: ما رفعته الجهة فقط */
export function EntityDecisions() {
  return <Decisions own />;
}

export function Decisions({ own = false }: { own?: boolean } = {}) {
  const { me, resolveDecision, requests, respondRequest, documents } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canApprove = canApproveDecision(me);
  const canSubmit = canSubmitDecision(me);
  const canAttachTo = (d: (typeof decisions)[number]) =>
    canApprove || d.submittedBy === me.id || (me.role === "director" ? d.entityId === me.entityId : canSubmit);
  const list = own ? decisions.filter((d) => d.entityId === me.entityId || d.submittedBy === me.id) : decisions;
  const pendingReqs = own ? [] : requests.filter((r) => r.kind !== "موعد لدى المحافظ" && r.status === "بانتظار الرد" && canRespondRequest(me, r.kind));

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
      {canSubmit && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn gold btn-add" onClick={() => setCreating(true)}><Plus size={16} /> معاملة جديدة</button>
        </div>
      )}
      {creating && <NewDecisionSheet onClose={() => setCreating(false)} />}

      {!canApprove && !own && (
        <div className="lock-note">
          <TriangleAlert size={17} />
          <span>صفتك «{me.title}» لا تملك صلاحية الاعتماد. تظهر لك المعاملات للاطلاع فقط.</span>
        </div>
      )}

      <div className="grid g-2">
        {own && !list.length && <Empty text="لا معاملات مرفوعة بانتظار التوقيع" hint="اضغط «معاملة جديدة» لرفع معاملة مع مرفقاتها" />}
        {list.map((d) => {
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
              {d.note && <p className="small" style={{ margin: "0 0 10px", lineHeight: 1.8 }}>{d.note}</p>}
              {(() => {
                const docs = documents.filter((x) => x.decisionId === d.id);
                const canAtt = canAttachTo(d);
                if (!docs.length && !canAtt) return null;
                return (
                  <div className="dec-att">
                    <DocList docs={docs} empty="" />
                    {canAtt && <UploadButton target={{ decisionId: d.id }} label="إرفاق ملف" className="btn ghost sm" />}
                  </div>
                );
              })()}
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
                ) : <span className="chip">{own ? "بانتظار التوقيع" : "اطلاع فقط"}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {pendingReqs.length > 0 && (
        <Panel title="طلبات المديريات بانتظار الرد" icon={<Inbox size={17} />} hint={`${pendingReqs.length} طلب`}>
          <div className="grid g-2">
            {pendingReqs.map((r) => (
              <div key={r.id} className="card pad" style={{ padding: 13 }}>
                <div className="row between wrap" style={{ gap: 8, marginBottom: 8 }}>
                  <span className="chip navy">{r.kind}</span>
                  <span className="tiny muted">{r.at}</span>
                </div>
                <b style={{ fontSize: 14, display: "block", marginBottom: 4 }}>{r.title}</b>
                <p className="tiny muted" style={{ marginBottom: 10 }}>{r.detail}</p>
                <div className="row between wrap" style={{ gap: 8 }}>
                  <PersonLine id={r.byId} />
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn ghost sm" disabled={busy === r.id} onClick={async () => { setBusy(r.id); try { await respondRequest(r.id, { action: "reject" }); } catch { /* */ } finally { setBusy(null); } }}>رفض</button>
                    <button className="btn gold sm" disabled={busy === r.id} onClick={async () => { setBusy(r.id); try { await respondRequest(r.id, { action: "approve" }); } catch { /* */ } finally { setBusy(null); } }}><BadgeCheck size={15} /> موافقة</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ═══════════════════════ التكليفات ═══════════════════════ */

const statusFilters = ["الكل", "متأخر", "قيد التنفيذ", "قيد المراجعة", "مُسند", "مُغلق"];

export function Assignments() {
  const { assignments, me } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [issuing, setIssuing] = useState(false);
  const [filter, setFilter] = useState("الكل");
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => assignments.filter((a) => seesAssignment(me, a)), [assignments, me]);
  const list = filter === "الكل" ? visible : visible.filter((a) => a.status === filter);
  const current = visible.find((a) => a.id === open) ?? null;

  useEffect(() => {
    const requestedFilter = searchParams.get("filter");
    if (requestedFilter && statusFilters.includes(requestedFilter)) setFilter(requestedFilter);
    const requestedOpen = searchParams.get("open");
    if (requestedOpen && visible.some((a) => a.id === requestedOpen)) {
      setOpen(requestedOpen);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("open");
      router.replace(`/diwan/assignments/${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
    }
  }, [searchParams, visible, router]);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-4">
        <Kpi onClick={() => setFilter("الكل")} label="ضمن نطاق رؤيتك" value={visible.length} meta="تكليف" icon={<ListTodo size={17} />} />
        <Kpi onClick={() => setFilter("متأخر")} label="متأخرة" value={visible.filter((a) => a.status === "متأخر").length} icon={<TriangleAlert size={17} />} tone="danger" />
        <Kpi onClick={() => setFilter("قيد المراجعة")} label="بانتظار الاعتماد" value={visible.filter((a) => a.status === "قيد المراجعة").length} icon={<Stamp size={17} />} tone="warn" />
        <Kpi onClick={() => setFilter("مُغلق")} label="مُغلقة" value={visible.filter((a) => a.status === "مُغلق").length} icon={<CheckCircle2 size={17} />} tone="ok" />
      </div>

      <div className="row between wrap" style={{ gap: 12 }}>
        <Pills
          value={filter}
          onChange={setFilter}
          items={statusFilters.map((s) => ({
            key: s, label: s, n: s === "الكل" ? visible.length : visible.filter((a) => a.status === s).length,
          }))}
        />
        {canIssueAssignment(me) && (
          <button className="btn gold btn-add" onClick={() => setIssuing(true)}><ListTodo size={16} /> تكليف جديد</button>
        )}
      </div>

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
                    <AssignmentRow key={a.id} a={a} onOpen={() => setOpen(a.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {current && <AssignmentSheet a={current} onClose={() => setOpen(null)} />}
      {issuing && <NewAssignmentSheet onClose={() => setIssuing(false)} />}
    </div>
  );
}

/** الإجراء التالي المسموح به على التكليف — نفس قواعد أزرار اللوح التفصيلي */
function nextStep(a: Assignment, me: Person): { to: Assignment["status"]; label: string } | null {
  const step: Partial<Record<Assignment["status"], { to: Assignment["status"]; label: string }>> = {
    "مُسند": { to: "مُستلَم", label: "إقرار الاستلام" },
    "مُستلَم": { to: "قيد التنفيذ", label: "بدء التنفيذ" },
    "قيد التنفيذ": { to: "قيد المراجعة", label: "تسليم للمراجعة" },
    "مُعاد للتصحيح": { to: "قيد التنفيذ", label: "استئناف التنفيذ" },
    "متأخر": { to: "قيد المراجعة", label: "تسليم للمراجعة" },
    "قيد المراجعة": { to: "مُغلق", label: "اعتماد وإغلاق" },
  };
  const s = step[a.status];
  // نفس قواعد الخادم تماماً، فلا يظهر إجراء سيُرفض
  return s && canAdvance(me, a, s.to) ? s : null;
}

function AssignmentRow({ a, onOpen }: { a: Assignment; onOpen: () => void }) {
  const { me, advance } = useStore();
  const step = nextStep(a, me);
  const swipe = useSwipeRow(step ? () => { void advance(a.id, step.to).catch(() => {}); } : null);
  return (
    <tr className={`clickable ${step ? "swipable" : ""}`} data-act={step?.label} onClick={onOpen} {...swipe}>
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
  );
}

export function AssignmentSheet({ a, onClose }: { a: Assignment; onClose: () => void }) {
  const { me, advance, setProgress, documents, markSeen } = useStore();
  // فتح المكلَّف للتكليف يسجّل «قُرئ» في سلسلة التسليم ليراها المُصدِر
  useEffect(() => {
    if (a.ownerId === me.id && !a.chain.read) void markSeen(a.id);
  }, [a.id, a.ownerId, a.chain.read, me.id, markSeen]);
  const canAttach = [a.ownerId, a.issuerId, ...(a.partnerIds ?? [])].includes(me.id) || canIssueAssignment(me);
  const stepIndex = lifecycle.findIndex((l) => l.key === a.status);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(a.progress);
  useEffect(() => setPct(a.progress), [a.progress]);

  // الإجراءات المتاحة تُستخرج من قواعد الخادم نفسها (canAdvance)
  const flow: { to: Assignment["status"]; label: string; tone: string; when: Assignment["status"][] }[] = [
    { to: "مُستلَم", label: "إقرار الاستلام", tone: "gold", when: ["مُسند"] },
    { to: "قيد التنفيذ", label: a.status === "مُعاد للتصحيح" ? "استئناف التنفيذ" : "بدء التنفيذ", tone: "primary", when: ["مُستلَم", "مُعاد للتصحيح"] },
    { to: "قيد المراجعة", label: "تسليم للمراجعة", tone: "primary", when: ["قيد التنفيذ", "متأخر", "مُعاد للتصحيح"] },
    { to: "مُغلق", label: "اعتماد وإغلاق", tone: "gold", when: ["قيد المراجعة"] },
    { to: "مُعاد للتصحيح", label: "إعادة للتصحيح", tone: "ghost", when: ["قيد المراجعة"] },
  ];
  const actions = flow.filter((f) => f.when.includes(a.status) && canAdvance(me, a, f.to));
  const canProgress = a.ownerId === me.id && ["مُستلَم", "قيد التنفيذ", "متأخر", "مُعاد للتصحيح"].includes(a.status);

  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch { /* رسالة الرفض تظهر من المتجر */ } finally { setBusy(false); }
  }

  return (
    <Sheet
      title={a.title}
      sub={`${a.ref} · ${a.source}`}
      onClose={onClose}
      footer={
        <>
          {actions.map((f) => (
            <button key={f.to} className={`btn ${f.tone}`} disabled={busy} onClick={() => act(() => advance(a.id, f.to))}>
              {f.to === "مُغلق" ? <BadgeCheck size={16} /> : f.to === "مُستلَم" ? <CheckCircle2 size={16} /> : f.to === "قيد المراجعة" ? <ArrowLeft size={16} /> : null} {f.label}
            </button>
          ))}
          {!actions.length && <span className="chip">{a.status === "مُغلق" ? "التكليف مُغلق" : "اطلاع فقط ضمن صلاحيتك"}</span>}
        </>
      }
    >
      {canProgress && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <b style={{ fontSize: 14 }}>تحديث نسبة الإنجاز</b>
            <span className="chip navy">{pct}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--gold)" }} aria-label="نسبة الإنجاز" />
          <button className="btn primary sm" style={{ marginTop: 8 }} disabled={busy || pct === a.progress} onClick={() => act(() => setProgress(a.id, pct))}>حفظ النسبة</button>
        </div>
      )}
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
            {(a.partnerIds?.length ?? 0) > 0 && (
              <div className="row between"><span className="tiny muted">المشاركون</span><AvaStack ids={a.partnerIds ?? []} /></div>
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

        <Panel title="المرفقات" icon={<Paperclip size={17} />} hint={`${a.attachments.length}`}>
          <div className="grid" style={{ gap: 10 }}>
            {/* المرفقات القديمة بلا ملف فعلي تظهر اسماً فقط، والمرفوعة قابلة للعرض والتنزيل */}
            {a.attachments.filter((f) => !f.docId).map((f) => (
              <div key={f.name} className="row between card pad" style={{ padding: 11 }}>
                <span className="row" style={{ gap: 9 }}><Paperclip size={15} /> <b style={{ fontSize: 13 }}>{f.name}</b></span>
                <span className="tiny muted">{f.size}</span>
              </div>
            ))}
            <DocList docs={documents.filter((d) => d.assignmentId === a.id)} empty={a.attachments.length ? "" : "لا مرفقات بعد"} />
            {canAttach && <UploadButton target={{ assignmentId: a.id }} label="إرفاق ملف" className="btn ghost" />}
          </div>
        </Panel>

        <Panel title="الملاحظات" icon={<MessageSquare size={17} />}>
          <NoteBoard target={a.id} targetLabel={`تكليف ${a.ref}`} />
        </Panel>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════ المراسلات ═══════════════════════ */

export function Correspondence() {
  const { me, letters, letterAction } = useStore();
  const [tab, setTab] = useState("وارد");
  const [letterView, setLetterView] = useState<"all" | "unhandled" | "secret">("all");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const canEdit = canRegisterLetters(me);
  const list = letterView === "secret"
    ? letters.filter((l) => l.classification === "سرّي")
    : letters.filter((l) => l.direction === tab && (letterView !== "unhandled" || !l.handled));
  const act = async (id: string, action: "handle" | "archive") => {
    setBusy(id);
    try { await letterAction(id, action); } catch { /* المتجر يعرض السبب */ } finally { setBusy(null); }
  };

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-4">
        <Kpi onClick={() => { setTab("وارد"); setLetterView("unhandled"); }} label="وارد غير مُعالَج" value={letters.filter((l) => l.direction === "وارد" && !l.handled).length} icon={<Inbox size={17} />} tone="warn" />
        <Kpi onClick={() => { setTab("صادر"); setLetterView("all"); }} label="صادر هذا الأسبوع" value={letters.filter((l) => l.direction === "صادر").length} icon={<ArrowLeft size={17} />} />
        <Kpi onClick={() => { setTab("مؤرشف"); setLetterView("all"); }} label="مؤرشف" value={letters.filter((l) => l.direction === "مؤرشف").length} icon={<FileCheck2 size={17} />} tone="ok" />
        <Kpi onClick={() => setLetterView("secret")} label="كتب سرّية" value={letters.filter((l) => l.classification === "سرّي").length} icon={<TriangleAlert size={17} />} tone="danger" />
      </div>

      <div className="row between wrap" style={{ gap: 12 }}>
      <Tabs
        value={tab}
        onChange={(value) => { setTab(value); setLetterView("all"); }}
        items={[
          { key: "وارد", label: "الوارد", n: letters.filter((l) => l.direction === "وارد").length },
          { key: "صادر", label: "الصادر", n: letters.filter((l) => l.direction === "صادر").length },
          { key: "مؤرشف", label: "المؤرشف", n: letters.filter((l) => l.direction === "مؤرشف").length },
        ]}
      />
        {canEdit && <button className="btn gold btn-add" onClick={() => setAdding(true)}><Inbox size={16} /> قيد كتاب</button>}
      </div>

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
                    <td className="tiny muted">
                      {l.action}
                      {canEdit && l.direction !== "مؤرشف" && (
                        <span className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          {!l.handled && <button className="btn primary sm" disabled={busy === l.id} onClick={() => act(l.id, "handle")}><CheckCircle2 size={14} /> معالجة</button>}
                          <button className="btn ghost sm" disabled={busy === l.id} onClick={() => act(l.id, "archive")}>أرشفة</button>
                        </span>
                      )}
                    </td>
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
          {list.length === 0 && <Empty text="لا كتب في هذا التبويب" />}
        </div>
      </section>

      {adding && <NewLetterSheet onClose={() => setAdding(false)} direction={tab === "صادر" ? "صادر" : "وارد"} />}
    </div>
  );
}
