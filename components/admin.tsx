"use client";

import { useState } from "react";
import {
  AlarmClock, ArrowLeft, Building2, CheckCircle2, Plus, ScrollText, ShieldCheck, Trash2,
  TriangleAlert, Users, XCircle,
} from "lucide-react";
import { audit, entities, entityOf, people, roles } from "@/lib/lookup";
import { escalationRules } from "@/lib/constants";
import { actionLabels, canManageSystem, reachLabel } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { Action, Entity } from "@/lib/types";
import { Ava, Bar, ClassChip, Empty, Kpi, Panel, PersonLine, Pills, Sheet } from "@/components/ui";
import { NewUserSheet } from "@/components/forms";

/* ═══════════════════════ الجهات ═══════════════════════ */

export function AdminEntities() {
  const { addEntity, toggleEntity } = useStore();
  const list = entities;
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Entity["kind"]>("مديرية");
  const [units, setUnits] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await addEntity({ name: name.trim(), kind, units: units.split("،").map((u) => u.trim()).filter(Boolean) });
      setName(""); setUnits(""); setAdding(false);
    } catch {
      /* الرسالة تظهر من المتجر */
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string, active: boolean) {
    void toggleEntity(id, !active).catch(() => {});
  }

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="lock-note" style={{ background: "var(--ok-bg)", borderColor: "#c3e7d8", color: "#0b5c43" }}>
        <CheckCircle2 size={17} style={{ color: "var(--ok)" }} />
        <span>
          <b>لا شيء في النظام ثابت.</b> الجهات والوحدات والأدوار والقاعات وأنواع المعاملات والمهل كلها بيانات تُدار من هنا،
          فيبقى النظام صالحاً مهما تغيّر الهيكل الإداري للمحافظة. الزمن المتوقع لإضافة مديرية كاملة: أقل من عشر دقائق.
        </span>
      </div>

      <div className="row between wrap" style={{ gap: 12 }}>
        <div className="grid g-4" style={{ flex: 1, minWidth: 280 }}>
          <Kpi label="الجهات" value={list.length} icon={<Building2 size={17} />} />
          <Kpi label="المفعّلة" value={list.filter((e) => e.active).length} icon={<CheckCircle2 size={17} />} tone="ok" />
        </div>
        <button className="btn gold" onClick={() => setAdding(true)}><Plus size={17} /> إضافة جهة جديدة</button>
      </div>

      <Panel title="الجهات والمؤسسات المسجّلة" icon={<Building2 size={17} />} flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>الجهة</th><th>النوع</th><th>المدير</th><th>الوحدات</th><th>الموظفون</th><th>الالتزام</th><th>الحالة</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="t-main">{e.name}</td>
                  <td><span className="chip navy">{e.kind}</span></td>
                  <td><PersonLine id={e.managerId} /></td>
                  <td className="tiny muted">{e.units.length ? e.units.join(" · ") : "—"}</td>
                  <td className="tiny">{e.staffCount}</td>
                  <td style={{ minWidth: 120 }}><Bar value={e.compliance} /></td>
                  <td>
                    <button className={`chip ${e.active ? "ok" : ""}`} onClick={() => toggle(e.id, e.active)}>
                      {e.active ? "مفعّلة" : "معطّلة"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {adding && (
        <Sheet
          title="إضافة جهة جديدة"
          sub="تظهر فوراً في بوابة المديريات وتستقبل التكليفات"
          onClose={() => setAdding(false)}
          footer={
            <>
              <button className="btn gold" onClick={add as never} disabled={busy}><Plus size={16} /> {busy ? "جارٍ الحفظ…" : "إضافة"}</button>
              <button className="btn ghost" onClick={() => setAdding(false)}>إلغاء</button>
            </>
          }
        >
          <form onSubmit={add}>
            <div className="field">
              <label htmlFor="ename">اسم الجهة</label>
              <input id="ename" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مديرية النقل" />
            </div>
            <div className="field">
              <label htmlFor="ekind">النوع</label>
              <select id="ekind" value={kind} onChange={(e) => setKind(e.target.value as Entity["kind"])}>
                {["مديرية", "مؤسسة", "دائرة", "مجلس"].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="eunits">الوحدات والأقسام <span className="muted tiny">(افصل بينها بفاصلة عربية ،)</span></label>
              <input id="eunits" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="قسم التراخيص، قسم المراقبة" />
            </div>
            <div className="lock-note" style={{ marginTop: 14 }}>
              <TriangleAlert size={16} />
              <span>بعد الإضافة: عيّن مدير الجهة وأنشئ حسابه، ثم أسند الأدوار من القوالب الجاهزة.</span>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  );
}

/* ═══════════════════════ المستخدمون ═══════════════════════ */

export function AdminUsers() {
  const { me, people, setUserActive } = useStore();
  const [filter, setFilter] = useState("الكل");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const canManage = canManageSystem(me);
  const toggle = async (id: string, active: boolean) => {
    setBusy(id);
    try { await setUserActive(id, active); } catch { /* المتجر يعرض السبب */ } finally { setBusy(null); }
  };
  const kinds = ["الكل", ...Array.from(new Set(people.map((p) => p.role)))];
  const list = filter === "الكل" ? people : people.filter((p) => p.role === filter);

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="grid g-4">
        <Kpi label="الحسابات" value={people.length} icon={<Users size={17} />} />
        <Kpi label="الأدوار المستخدمة" value={new Set(people.map((p) => p.role)).size} icon={<ShieldCheck size={17} />} tone="gold" />
        <Kpi label="إنابات سارية" value={people.filter((p) => p.deputyOf).length} icon={<ArrowLeft size={17} />} tone="warn" />
        <Kpi label="تصاريح سرّية" value={people.filter((p) => p.clearance === "سرّي").length} icon={<TriangleAlert size={17} />} />
      </div>

      {canManage && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn gold" onClick={() => setAdding(true)}><Plus size={16} /> حساب جديد</button>
        </div>
      )}

      <Pills
        value={filter}
        onChange={setFilter}
        items={kinds.map((k) => ({
          key: k,
          label: k === "الكل" ? "الكل" : roles.find((r) => r.key === k)?.title ?? k,
          n: k === "الكل" ? people.length : people.filter((p) => p.role === k).length,
        }))}
      />

      <Panel title="المستخدمون والحسابات" icon={<Users size={17} />} flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>المستخدم</th><th>الجهة</th><th>الدور</th><th>نطاق الرؤية</th><th>التصريح</th><th>الجوال</th><th /></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><PersonLine id={p.id} /></td>
                  <td className="tiny">{entityOf(p.entityId).short}{p.unit ? ` · ${p.unit}` : ""}</td>
                  <td><span className="chip navy">{roles.find((r) => r.key === p.role)?.title ?? p.role}</span></td>
                  <td className="tiny muted">{reachLabel(p)}</td>
                  <td><ClassChip c={p.clearance} /></td>
                  <td className="ltr tiny">{p.phone}</td>
                  <td>
                    {p.id === me.id ? <span className="chip gold">أنت</span>
                      : !entityOf(p.entityId).active ? <span className="chip">جهته معطّلة</span>
                        : canManage ? (
                          <button
                            className={`chip ${(p as { active?: boolean }).active === false ? "danger" : "ok"}`}
                            disabled={busy === p.id}
                            onClick={() => toggle(p.id, (p as { active?: boolean }).active === false)}
                            title="اضغط للتبديل"
                          >
                            {(p as { active?: boolean }).active === false ? "معطّل — تفعيل" : "مفعّل — تعطيل"}
                          </button>
                        ) : <span className="chip">{(p as { active?: boolean }).active === false ? "معطّل" : "مفعّل"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {adding && <NewUserSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ═══════════════════════ الأدوار والصلاحيات ═══════════════════════ */

export function AdminRoles() {
  const [open, setOpen] = useState<string | null>(null);
  const role = roles.find((r) => r.key === open) ?? null;

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="lock-note">
        <ShieldCheck size={17} />
        <span>
          الصلاحيات مبنية على <b>الدور لا على الشخص</b>. إضافة موظف جديد لا تحتاج إلا إسناد دور جاهز،
          وكل دور يُعرَّف بثلاثة محاور: النطاق (ماذا يرى) والإجراء (ماذا يفعل) وحدّ الاعتماد (ماذا يوقّع).
        </span>
      </div>

      <Panel title="مصفوفة الصلاحيات" icon={<ShieldCheck size={17} />} hint="تُقرأ أفقياً: الدور × الإجراء" flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>الدور</th>
                {(Object.keys(actionLabels) as Action[]).map((a) => <th key={a} style={{ textAlign: "center" }}>{actionLabels[a]}</th>)}
                <th>نطاق الرؤية</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.key} className="clickable" onClick={() => setOpen(r.key)}>
                  <td className="t-main">{r.title}</td>
                  {(Object.keys(actionLabels) as Action[]).map((a) => {
                    const g = r.grants[a];
                    return (
                      <td key={a} style={{ textAlign: "center" }}>
                        {g === "full" ? <CheckCircle2 size={17} style={{ color: "var(--ok)" }} />
                          : g === "partial" ? <span className="chip warn" style={{ fontSize: 10.5 }}>جزئي</span>
                            : <XCircle size={16} style={{ color: "var(--line)" }} />}
                      </td>
                    );
                  })}
                  <td className="tiny muted">{r.reach}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid g-3">
        {roles.map((r) => (
          <button key={r.key} className="card hover pad" style={{ textAlign: "right" }} onClick={() => setOpen(r.key)}>
            <div className="row between wrap" style={{ gap: 8, marginBottom: 9 }}>
              <span className="chip navy">{r.scope}</span>
              <span className="chip">{people.filter((p) => p.role === r.key).length} مستخدم</span>
            </div>
            <h3 style={{ fontSize: 15.5, marginBottom: 6 }}>{r.title}</h3>
            <p className="tiny muted">{r.summary}</p>
          </button>
        ))}
      </div>

      {role && (
        <Sheet title={role.title} sub={`النطاق: ${role.scope}`} onClose={() => setOpen(null)}>
          <div className="grid" style={{ gap: 14 }}>
            <div className="card pad">
              <p style={{ fontSize: 13.5, marginBottom: 12 }}>{role.summary}</p>
              <div className="mini-label" style={{ marginBottom: 7 }}>الإجراءات</div>
              <div className="row wrap" style={{ gap: 6 }}>
                {(Object.keys(actionLabels) as Action[]).map((a) => {
                  const g = role.grants[a];
                  return (
                    <span key={a} className={`chip ${g === "full" ? "ok" : g === "partial" ? "warn" : ""}`} style={{ opacity: g === "none" ? .5 : 1 }}>
                      {actionLabels[a]}{g === "partial" ? " (جزئي)" : g === "none" ? " ✕" : " ✓"}
                    </span>
                  );
                })}
              </div>
            </div>

            <Panel title="المستخدمون بهذا الدور" icon={<Users size={17} />}>
              {people.filter((p) => p.role === role.key).length === 0 ? <Empty text="لا مستخدمين" /> : (
                <div className="grid" style={{ gap: 9 }}>
                  {people.filter((p) => p.role === role.key).map((p) => (
                    <div key={p.id} className="row between">
                      <PersonLine id={p.id} />
                      <span className="chip">{entityOf(p.entityId).short}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ═══════════════════════ قواعد التصعيد ═══════════════════════ */

export function AdminEscalation() {
  const { me, escalationLevels, saveEscalation } = useStore();
  const [saving, setSaving] = useState(false);
  const canManage = canManageSystem(me);
  // المستويات المحفوظة في القاعدة تتقدّم على القيم الافتراضية
  const rules = escalationRules.map((r, i) => ({ ...r, level: (escalationLevels?.[i] ?? r.level) as 0 | 1 | 2 | 3 }));

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="lock-note">
        <AlarmClock size={17} />
        <span>
          <b>المهل المعتمدة:</b> العاجل والعاجل جداً يجب أن يصل رد خلاله في <b>24 ساعة</b>، والهام في <b>48 ساعة</b> كحد أقصى،
          أما العادي فيُحدَّد جدوله الزمني عند الإسناد. وعند انتهاء المدة يصل <b>إشعار مراجعة إلى مُصدِر التكليف</b> ليراجع المكلَّف.
        </span>
      </div>

      <Panel title="سُلّم التصعيد التلقائي" icon={<AlarmClock size={17} />} flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>الحدث</th><th>الإجراء الآلي</th><th>المُبلَّغ</th><th>المستوى</th></tr></thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={r.when}>
                  <td className="t-main">{r.when}</td>
                  <td>{r.act}</td>
                  <td className="tiny muted">{r.to}</td>
                  <td>
                    <div className="level-pick">
                      {[0, 1, 2, 3].map((lv) => (
                        <button
                          key={lv}
                          className={`chip ${r.level === lv ? (lv >= 3 ? "danger" : lv === 2 ? "warn" : lv === 1 ? "info" : "") : ""}`}
                          style={{ opacity: r.level === lv ? 1 : .35, minWidth: 26, justifyContent: "center" }}
                          disabled={!canManage || saving || r.level === lv}
                          onClick={async () => {
                            setSaving(true);
                            try { await saveEscalation(rules.map((x, k) => (k === i ? lv : x.level))); } catch { /* */ } finally { setSaving(false); }
                          }}
                        >
                          {lv}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid g-2">
        <Panel title="أنواع المعاملات" icon={<ScrollText size={17} />} hint="تُعرَّف حقولها ومسار اعتمادها">
          <div className="row wrap" style={{ gap: 7 }}>
            {["تكليف عادي", "تكليف عاجل", "كتاب وارد", "كتاب صادر", "قرار اعتماد", "طلب حجز", "طلب موعد", "تمديد مهلة"].map((t) => (
              <span key={t} className="chip navy">{t}</span>
            ))}
          </div>
        </Panel>
        <Panel title="القوالب الرسمية" icon={<ScrollText size={17} />} hint="تُستخدم في الطباعة والتعميم">
          <div className="row wrap" style={{ gap: 7 }}>
            {["قالب محضر اجتماع", "قالب كتاب رسمي", "قالب تكليف", "قالب تقرير أداء", "نص إشعار التكليف", "نص إشعار التصعيد"].map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════ سجل التدقيق ═══════════════════════ */

export function AdminAudit() {
  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="lock-note" style={{ background: "var(--danger-bg)", borderColor: "#f2cdc8", color: "#8c2a1e" }}>
        <Trash2 size={17} style={{ color: "var(--danger)" }} />
        <span>هذا السجل <b>غير قابل للحذف</b> — ولا يملك أي دور صلاحية محوه، بما في ذلك مدير النظام نفسه.</span>
      </div>

      <Panel title="سجل العمليات" icon={<ScrollText size={17} />} hint={`${audit.length} عملية`} flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>العنصر</th><th>الجهاز</th></tr></thead>
            <tbody>
              {audit.map((x) => (
                <tr key={x.id}>
                  <td className="tiny muted">{x.at}</td>
                  <td><PersonLine id={x.actorId} /></td>
                  <td className="t-main" style={{ fontSize: 13 }}>{x.action}</td>
                  <td className="tiny">{x.target}</td>
                  <td className="ltr tiny muted">{x.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
