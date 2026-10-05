"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Building2, CheckCircle2, Clock3, GitFork, Inbox, ListTodo, MailQuestion, Network,
  Send, TrendingUp, TriangleAlert, Users,
} from "lucide-react";
import { entities, entityOf, letters, people, personOf, requests } from "@/lib/lookup";
import { canRaiseRequest, seesAssignment } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { Assignment, Entity } from "@/lib/types";
import { AssignmentSheet } from "@/components/diwan";
import { NewRequestSheet } from "@/components/forms";
import {
  Ava, Bar, Empty, Kpi, NoteBoard, Panel, PersonLine, Pills, PriorityChip, Sheet, StatusChip,
} from "@/components/ui";

/** الجهة التي يعمل عليها المستخدم — قابلة للتبديل لمن يرى كل الجهات */
function useScope() {
  const { me } = useStore();
  const wide = ["governor", "deputy", "followup", "chief", "admin"].includes(me.role);
  const [picked, setPicked] = useState<string>(wide ? "e1" : me.entityId);
  const entityId = wide ? picked : me.entityId;
  return { entityId, setPicked, wide, entity: entityOf(entityId) };
}

function ScopeBar({ entityId, setPicked, wide }: { entityId: string; setPicked: (v: string) => void; wide: boolean }) {
  if (!wide) return null;

  const groups: { label: string; kinds: Entity["kind"][] }[] = [
    { label: "المديريات والمؤسسات", kinds: ["مديرية", "مؤسسة", "دائرة", "مجلس"] },
    { label: "المناطق", kinds: ["منطقة"] },
    { label: "الأحياء", kinds: ["حي"] },
  ];

  const current = entities.find((e) => e.id === entityId);

  return (
    <div className="scope-bar">
      <span className="scope-hint">
        <Network size={15} />
        تعرض بصفتك المتجاوزة للبوابتين — اختر الجهة التي تريد الاطلاع عليها
      </span>

      <div className="scope-pick">
        <label className="field" style={{ margin: 0 }}>
          <span className="sr-only">الجهة</span>
          <select value={entityId} onChange={(e) => setPicked(e.target.value)} aria-label="اختر الجهة">
            {groups.map((g) => {
              const list = entities.filter((e) => g.kinds.includes(e.kind));
              if (!list.length) return null;
              return (
                <optgroup key={g.label} label={g.label}>
                  {list.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>
        {current && <span className="chip navy">{current.kind}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════ قائمة الجهات ═══════════════════════ */

export function Entities() {
  const { assignments } = useStore();
  const [open, setOpen] = useState<Entity | null>(null);
  const jumpToEntities = () => window.setTimeout(() => document.getElementById("entities-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-4">
        <Kpi onClick={jumpToEntities} label="الجهات المفعّلة" value={entities.filter((e) => e.active).length} icon={<Building2 size={17} />} />
        <Kpi onClick={jumpToEntities} label="إجمالي الموظفين" value={entities.reduce((s, e) => s + e.staffCount, 0)} icon={<Users size={17} />} tone="gold" />
        <Kpi href="/directorates/tasks/" label="تكليفات مفتوحة" value={entities.reduce((s, e) => s + e.openTasks, 0)} icon={<ListTodo size={17} />} />
        <Kpi href="/directorates/inbox/?filter=late" label="متأخرة" value={entities.reduce((s, e) => s + e.lateTasks, 0)} icon={<TriangleAlert size={17} />} tone="danger" />
      </div>

      <div id="entities-grid" className="grid g-3">
        {entities.map((e) => {
          const open2 = assignments.filter((a) => a.entityId === e.id && a.status !== "مُغلق").length;
          return (
            <button key={e.id} className="card hover pad" style={{ textAlign: "right" }} onClick={() => setOpen(e)}>
              <div className="row between wrap" style={{ gap: 8, marginBottom: 12 }}>
                <span className={`chip ${e.accent === "gold" ? "gold" : e.accent === "teal" ? "teal" : e.accent === "plum" ? "plum" : "navy"}`}>{e.kind}</span>
                {e.lateTasks > 0 ? <span className="chip danger">{e.lateTasks} متأخر</span> : <span className="chip ok">بلا متأخرات</span>}
              </div>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>{e.name}</h3>
              <p className="tiny muted" style={{ marginBottom: 12 }}>{e.units.length} وحدات · {e.staffCount} موظفاً</p>

              <div className="mini-label" style={{ marginBottom: 5 }}>الالتزام بالمواعيد</div>
              <Bar value={e.compliance} />

              <div className="sep" />
              <div className="row between">
                <PersonLine id={e.managerId} sub="مدير الجهة" />
                <span className="chip">{open2} مفتوح</span>
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <Sheet title={open.name} sub={`${open.kind} · ${open.staffCount} موظفاً`} onClose={() => setOpen(null)}>
          <div className="grid" style={{ gap: 14 }}>
            <div className="card pad">
              <div className="row between" style={{ marginBottom: 12 }}>
                <span className="tiny muted">مدير الجهة</span><PersonLine id={open.managerId} />
              </div>
              <div className="mini-label" style={{ marginBottom: 6 }}>الوحدات والأقسام</div>
              <div className="row wrap" style={{ gap: 6 }}>{open.units.map((u) => <span key={u} className="chip">{u}</span>)}</div>
              <div className="sep" />
              <div className="mini-label" style={{ marginBottom: 6 }}>الالتزام بالمواعيد</div>
              <Bar value={open.compliance} />
            </div>

            <Panel title="موظفو الجهة" icon={<Users size={17} />}>
              <div className="grid" style={{ gap: 9 }}>
                {people.filter((p) => p.entityId === open.id).map((p) => (
                  <div key={p.id} className="row between">
                    <PersonLine id={p.id} />
                    {p.unit && <span className="chip">{p.unit}</span>}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="الملاحظات" icon={<Send size={17} />}>
              <NoteBoard target={open.id} targetLabel={open.short} />
            </Panel>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ═══════════════════════ الوارد إلى المديرية ═══════════════════════ */

export function EntityInbox() {
  const { assignments, me } = useStore();
  const scope = useScope();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "late" | "closed">("all");

  const all = assignments.filter((a) => a.entityId === scope.entityId && seesAssignment(me, a));
  const unread = all.filter((a) => !a.chain.acknowledged);
  const list = filter === "unread" ? unread
    : filter === "late" ? all.filter((a) => a.status === "متأخر")
      : filter === "closed" ? all.filter((a) => a.status === "مُغلق")
        : all;
  const current = all.find((a) => a.id === open) ?? null;
  const inLetters = letters.filter((l) => l.direction === "وارد");

  useEffect(() => {
    const requestedFilter = searchParams.get("filter");
    if (requestedFilter === "late") setFilter("late");
    else if (requestedFilter === "closed") setFilter("closed");
    else if (requestedFilter === "unread") setFilter("unread");
    const requestedOpen = searchParams.get("open");
    if (requestedOpen && all.some((a) => a.id === requestedOpen)) setOpen(requestedOpen);
  }, [searchParams, all]);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <ScopeBar {...scope} />

      <div className="grid g-4">
        <Kpi onClick={() => setFilter("all")} label="تكليفات واردة" value={all.length} icon={<Inbox size={17} />} />
        <Kpi onClick={() => setFilter("unread")} label="لم يُقرّ استلامها" value={unread.length} meta="تُصعَّد بعد 24 ساعة" icon={<Clock3 size={17} />} tone="warn" />
        <Kpi onClick={() => setFilter("late")} label="متأخرة" value={all.filter((a) => a.status === "متأخر").length} icon={<TriangleAlert size={17} />} tone="danger" />
        <Kpi onClick={() => setFilter("closed")} label="مُغلقة" value={all.filter((a) => a.status === "مُغلق").length} icon={<CheckCircle2 size={17} />} tone="ok" />
      </div>

      <Panel title="التكليفات الواردة من الديوان" icon={<Inbox size={17} />} hint={`${list.length} تكليف`} flush>
        {list.length === 0 ? <Empty text="لا تكليفات واردة" hint="ضمن نطاق رؤيتك الحالي" /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>التكليف</th><th>المصدر</th><th>المكلَّف</th><th>الأولوية</th><th>الاستحقاق</th><th>الحالة</th></tr></thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => setOpen(a.id)}>
                    <td style={{ maxWidth: 320 }}>
                      <div className="t-main">{a.title}</div>
                      <div className="t-sub"><span className="t-ref">{a.ref}</span></div>
                    </td>
                    <td className="tiny muted">{a.source}</td>
                    <td><PersonLine id={a.ownerId} /></td>
                    <td><PriorityChip p={a.priority} /></td>
                    <td className="tiny">{a.due}</td>
                    <td><StatusChip status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="كتب واردة محالة إلى الجهات" icon={<Send size={17} />} flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>الرقم</th><th>الموضوع</th><th>الإحالة</th><th>الإجراء المطلوب</th></tr></thead>
            <tbody>
              {inLetters.map((l) => (
                <tr key={l.id}>
                  <td><span className="t-ref">{l.number}</span></td>
                  <td className="t-main" style={{ fontSize: 13 }}>{l.subject}</td>
                  <td className="tiny">{l.referredTo}</td>
                  <td className="tiny muted">{l.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {current && <AssignmentSheet a={current} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ═══════════════════════ المهام الداخلية ═══════════════════════ */

export function EntityTasks() {
  const { assignments, me } = useStore();
  const scope = useScope();
  const [unit, setUnit] = useState("الكل");
  const [open, setOpen] = useState<string | null>(null);

  const all = assignments.filter((a) => a.entityId === scope.entityId && seesAssignment(me, a));
  const units = ["الكل", ...scope.entity.units];
  const list = unit === "الكل" ? all : all.filter((a) => personOf(a.ownerId).unit === unit);
  const current = all.find((a) => a.id === open) ?? null;

  const staff = people.filter((p) => p.entityId === scope.entityId);
  const loads = staff.map((p) => ({
    p, n: all.filter((a) => a.ownerId === p.id && a.status !== "مُغلق").length,
  })).sort((a, b) => b.n - a.n);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <ScopeBar {...scope} />

      <div className="split">
        <div className="grid" style={{ gap: 16 }}>
          <Pills value={unit} onChange={setUnit} items={units.map((u) => ({ key: u, label: u, n: u === "الكل" ? all.length : all.filter((a) => personOf(a.ownerId).unit === u).length }))} />

          <Panel title="المهام وتوزيعها" icon={<ListTodo size={17} />} flush>
            {list.length === 0 ? <Empty text="لا مهام في هذه الوحدة" /> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>المهمة</th><th>الوحدة</th><th>المكلَّف</th><th>الإنجاز</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {list.map((a) => (
                      <tr key={a.id} className="clickable" onClick={() => setOpen(a.id)}>
                        <td style={{ maxWidth: 300 }}>
                          <div className="t-main">{a.title}</div>
                          <div className="t-sub">يستحق {a.due}</div>
                        </td>
                        <td className="tiny">{personOf(a.ownerId).unit ?? "—"}</td>
                        <td><PersonLine id={a.ownerId} /></td>
                        <td style={{ minWidth: 130 }}><Bar value={a.progress} /></td>
                        <td><StatusChip status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="توزيع الأحمال" icon={<Users size={17} />} hint="مهام مفتوحة لكل موظف">
          <div className="grid" style={{ gap: 11 }}>
            {loads.map(({ p, n }) => (
              <div key={p.id} className="row" style={{ gap: 11 }}>
                <Ava id={p.id} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between">
                    <b style={{ fontSize: 13 }}>{p.name}</b>
                    <span className={`chip ${n >= 3 ? "warn" : n === 0 ? "" : "ok"}`}>{n}</span>
                  </div>
                  <div className="bar" style={{ marginTop: 5 }}>
                    <i className={n >= 3 ? "warn" : "ok"} style={{ width: `${Math.min(100, n * 28)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {current && <AssignmentSheet a={current} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ═══════════════════════ الردود والتقارير ═══════════════════════ */

export function EntityReplies() {
  const { assignments, me } = useStore();
  const scope = useScope();
  const [open, setOpen] = useState<string | null>(null);
  const [replyFilter, setReplyFilter] = useState<"submitted" | "review" | "returned">("submitted");

  const all = assignments.filter((a) => a.entityId === scope.entityId && seesAssignment(me, a));
  const submitted = all.filter((a) => a.chain.submitted);
  const shown = replyFilter === "review" ? all.filter((a) => a.status === "قيد المراجعة")
    : replyFilter === "returned" ? all.filter((a) => a.status === "مُعاد للتصحيح")
      : submitted;
  const current = all.find((a) => a.id === open) ?? null;

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <ScopeBar {...scope} />

      <div className="grid g-3">
        <Kpi onClick={() => setReplyFilter("submitted")} label="ردود مرفوعة" value={submitted.length} icon={<Send size={17} />} />
        <Kpi onClick={() => setReplyFilter("review")} label="بانتظار اعتماد الديوان" value={all.filter((a) => a.status === "قيد المراجعة").length} icon={<Clock3 size={17} />} tone="warn" />
        <Kpi onClick={() => setReplyFilter("returned")} label="أُعيد للتصحيح" value={all.filter((a) => a.status === "مُعاد للتصحيح").length} icon={<TriangleAlert size={17} />} tone="danger" />
      </div>

      {shown.length === 0 ? <Empty text="لا توجد عناصر ضمن هذا التصنيف" hint="اختر مؤشراً آخر لعرض بياناته" /> : (
        <div className="grid g-2">
          {shown.map((a) => (
            <button key={a.id} className="card hover pad" style={{ textAlign: "right" }} onClick={() => setOpen(a.id)}>
              <div className="row between wrap" style={{ gap: 8, marginBottom: 10 }}>
                <span className="t-ref">{a.ref}</span>
                <StatusChip status={a.status} />
              </div>
              <h3 style={{ fontSize: 15.5, marginBottom: 8 }}>{a.title}</h3>
              <p className="tiny muted" style={{ marginBottom: 10 }}>سُلّم في {a.chain.submitted}</p>
              <div className="mini-label" style={{ marginBottom: 5 }}>معيار الإغلاق</div>
              <p className="tiny" style={{ marginBottom: 10 }}>{a.closeCriteria}</p>
              <div className="row between">
                <PersonLine id={a.ownerId} />
                <span className="row tiny" style={{ gap: 6, color: "var(--navy-700)", fontWeight: 600 }}>التفاصيل <ArrowLeft size={14} /></span>
              </div>
            </button>
          ))}
        </div>
      )}

      {current && <AssignmentSheet a={current} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ═══════════════════════ الطلبات إلى الديوان ═══════════════════════ */

export function EntityRequests() {
  const scope = useScope();
  const { me, requests: live } = useStore();
  const [kind, setKind] = useState("الكل");
  const [adding, setAdding] = useState(false);
  // يرفع الطلب من يعمل في هذه الجهة نفسها
  const canRaise = canRaiseRequest(me) && me.entityId === scope.entityId;
  const mine = live.filter((r) => r.entityId === scope.entityId);
  const kinds = ["الكل", "حجز قاعة", "موعد لدى المحافظ", "طلب اجتماع", "تمديد مهلة"];
  const list = kind === "الكل" ? mine : mine.filter((r) => r.kind === kind);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <ScopeBar {...scope} />

      <div className="row between wrap" style={{ gap: 12 }}>
        <Pills value={kind} onChange={setKind} items={kinds.map((k) => ({ key: k, label: k, n: k === "الكل" ? mine.length : mine.filter((r) => r.kind === k).length }))} />
        {canRaise && <button className="btn gold btn-add" onClick={() => setAdding(true)}><MailQuestion size={16} /> طلب جديد</button>}
      </div>

      {list.length === 0 ? <Empty text="لا طلبات من هذه الجهة" /> : (
        <div className="grid g-2">
          {list.map((r) => (
            <div key={r.id} className="card pad hover">
              <div className="row between wrap" style={{ gap: 8, marginBottom: 10 }}>
                <span className="chip navy">{r.kind}</span>
                <StatusChip status={r.status} />
              </div>
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>{r.title}</h3>
              <p className="tiny muted" style={{ marginBottom: 12 }}>{r.detail}</p>
              <div className="row between">
                <PersonLine id={r.byId} />
                <span className="tiny muted">{r.at}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && <NewRequestSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ═══════════════════════ هيكل المديرية ═══════════════════════ */

export function EntityStructure() {
  const scope = useScope();
  const staff = people.filter((p) => p.entityId === scope.entityId);
  const byUnit = scope.entity.units.map((u) => ({ unit: u, list: staff.filter((p) => p.unit === u) }));
  const unassigned = staff.filter((p) => !p.unit);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <ScopeBar {...scope} />

      <Panel title={`الشجرة التنظيمية — ${scope.entity.short}`} icon={<GitFork size={17} />}>
        <div className="tree">
          <ul>
            <li>
              <span className="node"><Building2 size={15} /><b>{scope.entity.name}</b><span>{scope.entity.staffCount} موظفاً</span></span>
              <ul>
                {unassigned.map((p) => (
                  <li key={p.id}><span className="node"><Ava id={p.id} size="sm" /><b>{p.name}</b><span>{p.title}</span></span></li>
                ))}
                {byUnit.map(({ unit, list }) => (
                  <li key={unit}>
                    <span className="node"><b>{unit}</b><span>{list.length} موظفاً</span></span>
                    {list.length > 0 && (
                      <ul>
                        {list.map((p) => (
                          <li key={p.id}><span className="node"><Ava id={p.id} size="sm" /><b>{p.name}</b><span>{p.title}</span></span></li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      </Panel>

      <Panel title="الموظفون ومهامهم الدائمة" icon={<Users size={17} />}>
        <div className="grid g-2">
          {staff.map((p) => (
            <div key={p.id} className="card pad" style={{ padding: 13 }}>
              <PersonLine id={p.id} />
              <ul className="grid" style={{ gap: 5, marginTop: 9 }}>
                {p.duties.map((d) => (
                  <li key={d} className="row tiny" style={{ gap: 7, alignItems: "flex-start", color: "var(--ink-2)" }}>
                    <CheckCircle2 size={13} style={{ color: "var(--gold)", marginTop: 3 }} />{d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ═══════════════════════ مؤشرات الأداء ═══════════════════════ */

export function EntityPerformance() {
  const { assignments } = useStore();
  const scope = useScope();
  const e = scope.entity;
  const all = assignments.filter((a) => a.entityId === e.id);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((a) => m.set(a.status, (m.get(a.status) ?? 0) + 1));
    return [...m.entries()];
  }, [all]);

  const avg = all.length ? Math.round(all.reduce((s, a) => s + a.progress, 0) / all.length) : 0;
  const staff = people.filter((p) => p.entityId === e.id);
  const bestResponse = [...staff].sort((a, b) => a.avgResponseHours - b.avgResponseHours)[0];
  const jump = (id: string) => window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <ScopeBar {...scope} />

      <div className="lock-note" style={{ background: "var(--gold-soft)", borderColor: "#e7d4a6", color: "#7a5d10" }}>
        <TrendingUp size={17} style={{ color: "var(--gold)" }} />
        <span>
          <b>مؤشرات الالتزام معتمدة رسمياً</b> في التقييم الوظيفي وفي القرارات الإدارية، بقرار مكتب السيد المحافظ —
          فهي ليست مؤشراً استرشادياً بل مرجعاً يُبنى عليه.
        </span>
      </div>

      <div className="grid g-4">
        <Kpi onClick={() => jump("performance-status")} label="الالتزام بالمواعيد" value={e.compliance} meta="٪ خلال 30 يوماً" icon={<TrendingUp size={17} />} tone={e.compliance >= 85 ? "ok" : e.compliance >= 70 ? "warn" : "danger"} />
        <Kpi onClick={() => jump("performance-status")} label="متوسط الإنجاز" value={avg} meta="٪ للتكليفات المفتوحة" icon={<ListTodo size={17} />} />
        <Kpi href="/directorates/inbox/?filter=late" label="تكليفات متأخرة" value={e.lateTasks} icon={<TriangleAlert size={17} />} tone="danger" />
        <Kpi onClick={() => jump("performance-response")} label="أسرع استجابة" value={bestResponse?.avgResponseHours ?? 0} meta={bestResponse?.name} icon={<Clock3 size={17} />} tone="ok" />
      </div>

      <div className="split">
        <div id="performance-status">
        <Panel title="توزيع التكليفات حسب الحالة" icon={<ListTodo size={17} />}>
          <div className="grid" style={{ gap: 12 }}>
            {byStatus.map(([s, n]) => (
              <div key={s} className="row" style={{ gap: 12 }}>
                <span style={{ flex: "0 0 130px" }}><StatusChip status={s} /></span>
                <div style={{ flex: 1 }}>
                  <div className="bar"><i style={{ width: `${(n / all.length) * 100}%` }} /></div>
                </div>
                <b style={{ flex: "0 0 30px", textAlign: "left", fontSize: 13 }}>{n}</b>
              </div>
            ))}
          </div>
        </Panel>
        </div>

        <div id="performance-response">
        <Panel title="زمن الاستجابة لكل موظف" icon={<Clock3 size={17} />} hint="بالساعات — الأقل أفضل">
          <div className="grid" style={{ gap: 11 }}>
            {[...staff].sort((a, b) => a.avgResponseHours - b.avgResponseHours).map((p) => (
              <div key={p.id} className="row" style={{ gap: 11 }}>
                <Ava id={p.id} size="sm" />
                <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                <div className="bar" style={{ flex: "0 0 96px" }}>
                  <i className={p.avgResponseHours <= 6 ? "ok" : p.avgResponseHours <= 12 ? "warn" : "danger"} style={{ width: `${Math.min(100, p.avgResponseHours * 5)}%` }} />
                </div>
                <b className="ltr" style={{ flex: "0 0 42px", textAlign: "left", fontSize: 12.5 }}>{p.avgResponseHours}س</b>
              </div>
            ))}
          </div>
        </Panel>
        </div>
      </div>

      <Panel title="مقارنة الجهات" icon={<TrendingUp size={17} />} hint="الالتزام بالمواعيد" flush>
        <div className="chart-scroll">
          <div className="chart-bars">
            {entities.filter((x) => x.kind !== "ديوان").map((x) => (
              <div key={x.id} className="chart-col">
                <b className="chart-val">{x.compliance}%</b>
                <div className="chart-track">
                  <i
                    className={x.id === e.id ? "gold" : ""}
                    style={{ height: `${x.compliance}%` }}
                  />
                </div>
                <span className="chart-label">{x.short}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
