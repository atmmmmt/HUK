"use client";

import { useEffect, useState } from "react";
import {
  AlarmClock, ArrowLeft, Building2, CheckCircle2, Circle, Copy, Download, IdCard, Image as ImageIcon, Plus, Printer, ScrollText, ShieldCheck, Trash2,
  TriangleAlert, Users, XCircle,
} from "lucide-react";
import { audit, entities, entityOf, people, roles } from "@/lib/lookup";
import { escalationRules } from "@/lib/constants";
import { navByPortal } from "@/lib/nav";
import { actionLabels, canManageSystem, reachLabel } from "@/lib/access";
import { useStore, type IssuedCard } from "@/lib/store";
import type { Action, Entity, Person } from "@/lib/types";
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
  const [tier, setTier] = useState<NonNullable<Entity["tier"]>>("main");
  const [units, setUnits] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await addEntity({ name: name.trim(), kind, tier, units: units.split("،").map((u) => u.trim()).filter(Boolean) });
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
        <button className="btn gold btn-add" onClick={() => setAdding(true)}><Plus size={17} /> إضافة جهة جديدة</button>
      </div>

      <Panel title="الجهات والمؤسسات المسجّلة" icon={<Building2 size={17} />} flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>الجهة</th><th>النوع</th><th>تتبع لـ</th><th>المدير</th><th>الوحدات</th><th>الموظفون</th><th>الالتزام</th><th>الحالة</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="t-main">{e.name}</td>
                  <td><span className="chip navy">{e.kind}</span></td>
                  <td className="tiny muted">{e.tier === "governorate" ? "مديرية المحافظة" : "مديريات المحافظة"}</td>
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
                {["مديرية", "مؤسسة", "هيئة", "دائرة", "مكتب", "مجلس"].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="etier">تتبع لـ</label>
              <select id="etier" value={tier} onChange={(e) => setTier(e.target.value as NonNullable<Entity["tier"]>)}>
                <option value="main">مديريات المحافظة — المديريات الرئيسية</option>
                <option value="governorate">مديرية المحافظة — أجهزة المحافظة</option>
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
  const { me, people, setUserActive, setUserContacted } = useStore();
  const [filter, setFilter] = useState("الكل");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [cardFor, setCardFor] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const canManage = canManageSystem(me);
  const tracked = people.filter(tracksContact);
  const contactedCount = tracked.filter(hasContacted).length;
  const markContacted = async (id: string, contacted: boolean) => {
    setMarking(id);
    try { await setUserContacted(id, contacted); } catch { /* المتجر يعرض السبب */ } finally { setMarking(null); }
  };
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
        <div className="card pad row between wrap" style={{ gap: 12 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <b style={{ display: "block", fontSize: 14, marginBottom: 8 }}>تواصل {contactedCount} من أصل {tracked.length} مسؤولاً</b>
            <Bar value={tracked.length ? Math.round((contactedCount / tracked.length) * 100) : 0} />
          </div>
          <button className="btn primary" onClick={() => setReporting(true)}><ImageIcon size={16} /> صورة المتابعة</button>
        </div>
      )}

      {canManage && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn gold btn-add" onClick={() => setAdding(true)}><Plus size={16} /> حساب جديد</button>
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
                    {canManage && tracksContact(p) && (
                      <button
                        className={`chip ${hasContacted(p) ? "ok" : ""}`}
                        style={{ marginInlineEnd: 6 }}
                        disabled={marking === p.id}
                        onClick={() => void markContacted(p.id, !hasContacted(p))}
                        title="اضغط للتبديل"
                      >
                        {hasContacted(p) ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                        {hasContacted(p) ? "تواصل" : "لم يتواصل"}
                      </button>
                    )}
                    {canManage && p.id !== me.id && (
                      <button className="chip navy" style={{ marginInlineEnd: 6 }} onClick={() => setCardFor(p.id)}>
                        <IdCard size={13} /> بطاقة
                      </button>
                    )}
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
      {cardFor && <CardSheet id={cardFor} onClose={() => setCardFor(null)} />}
      {reporting && <ContactReportSheet people={tracked} onClose={() => setReporting(false)} />}
    </div>
  );
}

/* ═══════════════════════ متابعة التواصل ═══════════════════════ */

/** المحافظ ومعاونه ومدير النظام خارج التعميم */
const tracksContact = (p: Person) => !["governor", "assistant", "admin"].includes(p.role);
/** من صدرت بطاقته قبل وجود علامة التواصل يُعدّ متواصلاً */
const hasContacted = (p: Person) => p.contacted ?? !!p.namedByAdmin;

function saveImage(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function printImage(url: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<title>${title}</title><img src="${url}" style="width:100%;display:block;margin:auto" onload="print()">`);
  w.document.close();
  return true;
}

function ContactReportSheet({ people, onClose }: { people: Person[]; onClose: () => void }) {
  const { toast } = useStore();
  const [image, setImage] = useState("");
  useEffect(() => { void drawContactReport(people).then(setImage); }, [people]);

  return (
    <Sheet
      title="صورة متابعة التواصل"
      sub="من تواصل ومن لم يتواصل حتى الآن"
      onClose={onClose}
      footer={
        <>
          <button className="btn gold" disabled={!image} onClick={() => saveImage(image, "متابعة-التواصل.png")}><Download size={16} /> تنزيل صورة</button>
          <button className="btn primary" disabled={!image} onClick={() => { if (!printImage(image, "متابعة التواصل")) toast("اسمح بالنوافذ المنبثقة للطباعة", "warn"); }}><Printer size={16} /> طباعة</button>
        </>
      }
    >
      {image ? <img src={image} alt="متابعة التواصل" style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
        : <div className="skel" style={{ height: 420 }} />}
    </Sheet>
  );
}

/** عمودان: من تواصل باسمه ومنصبه، ومن لم يتواصل بمنصبه؛ يطول اللوح بطول القائمة الأطول */
async function drawContactReport(people: Person[]) {
  const font = getComputedStyle(document.body).fontFamily;
  await document.fonts.ready;
  const done = people.filter(hasContacted);
  const pending = people.filter((p) => !hasContacted(p));

  const W = 1600, P = 60, GAP = 40, HEAD = 320, COL_TOP = HEAD + 50, TITLE = 90, FOOT = 90, ROW = 112, ROW_GAP = 12;
  const colW = (W - 2 * P - GAP) / 2;
  const rows = Math.max(done.length, pending.length, 1);
  const H = COL_TOP + TITLE + rows * (ROW + ROW_GAP) + 40 + FOOT;

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const navy = "#0f2a44", gold = "#c9a24a", green = "#0b7a56", red = "#b3402f", muted = "#6b7280";
  g.direction = "rtl";

  const text = (s: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = "right", maxW = Infinity) => {
    let fs = size;
    g.font = `${weight} ${fs}px ${font}`;
    while (g.measureText(s).width > maxW && fs > size * 0.7) {
      fs -= 1;
      g.font = `${weight} ${fs}px ${font}`;
    }
    g.textAlign = align;
    g.fillStyle = color;
    g.fillText(s, x, y);
  };

  g.fillStyle = "#f6f3ec"; g.fillRect(0, 0, W, H);
  g.fillStyle = navy; g.fillRect(0, 0, W, HEAD);
  g.fillStyle = gold; g.fillRect(0, HEAD, W, 10);
  text("محافظة الرقة — منصة الرقة الذكية", W / 2, 80, 32, "#e6c87c", 700, "center");
  text("متابعة التواصل مع المسؤولين", W / 2, 165, 72, "#fff", 900, "center");
  text(`تواصل ${done.length} من أصل ${people.length} — لم يتواصل ${pending.length}`, W / 2, 235, 36, "#dfe8f1", 700, "center");
  text(new Date().toLocaleDateString("ar-SY-u-nu-latn", { dateStyle: "long" }), W / 2, 285, 28, "#b9c7d6", 600, "center");

  const column = (left: number, title: string, color: string, list: Person[], showName: boolean) => {
    const right = left + colW;
    g.fillStyle = color;
    g.beginPath(); g.roundRect(left, COL_TOP, colW, 70, 16); g.fill();
    text(`${title} (${list.length})`, left + colW / 2, COL_TOP + 47, 36, "#fff", 800, "center");

    if (!list.length) {
      text("لا أحد حتى الآن", left + colW / 2, COL_TOP + TITLE + 66, 30, muted, 700, "center");
      return;
    }
    list.forEach((p, i) => {
      const y = COL_TOP + TITLE + i * (ROW + ROW_GAP);
      g.fillStyle = "#fff"; g.strokeStyle = "#e2dccd"; g.lineWidth = 2;
      g.beginPath(); g.roundRect(left, y, colW, ROW, 14); g.fill(); g.stroke();
      g.fillStyle = color;
      g.beginPath(); g.arc(right - 48, y + ROW / 2, 26, 0, Math.PI * 2); g.fill();
      text(String(i + 1), right - 48, y + ROW / 2 + 9, 26, "#fff", 800, "center");
      const textRight = right - 92, textW = colW - 116;
      if (showName) {
        text(p.name, textRight, y + 48, 34, navy, 800, "right", textW);
        text(p.title, textRight, y + 90, 26, muted, 600, "right", textW);
      } else {
        text(p.title, textRight, y + ROW / 2 + 11, 32, navy, 700, "right", textW);
      }
    });
  };
  column(W - P - colW, "تواصلوا", green, done, true);
  column(P, "لم يتواصلوا بعد", red, pending, false);

  g.fillStyle = navy; g.fillRect(0, H - FOOT, W, FOOT);
  text(pending.length ? "نرجو ممن لم يتواصل المبادرة بالتواصل" : "تواصل الجميع، شكراً لتعاونكم", W / 2, H - 32, 34, "#fff", 800, "center");

  return c.toDataURL("image/png");
}

/* ═══════════════════════ بطاقة الدخول ═══════════════════════ */

const isPlaceholderPhone = (phone: string) => !phone || phone === "—" || phone.startsWith("0930 000");

function CardSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { people, issueCard, toast } = useStore();
  const p = people.find((x) => x.id === id);
  // الاسم في البذرة هو اسم المنصب؛ لا يُعرض اسماً لشخص حتى يُدخله مدير النظام
  const [name, setName] = useState(p?.namedByAdmin ? p.name : "");
  const [phone, setPhone] = useState(p && !isPlaceholderPhone(p.phone) ? p.phone : "");
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<IssuedCard | null>(null);
  const [image, setImage] = useState("");
  if (!p) return null;
  const entity = entityOf(p.entityId);
  const loginUrl = typeof window === "undefined" ? "" : `${window.location.origin}/login`;

  async function issue(e?: React.FormEvent) {
    e?.preventDefault();
    if (name.trim().length < 3 || phone.replace(/\D/g, "").length < 7) return toast("اكتب الاسم الكامل ورقم الجوال", "warn");
    setBusy(true);
    try {
      const c = await issueCard(id, { name: name.trim(), phone: phone.trim() });
      setCard(c);
      setImage(await drawCard(c, entity.name, loginUrl));
    } catch { /* المتجر يعرض السبب */ } finally { setBusy(false); }
  }

  const text = card ? [
    "منصة الرقة الذكية — بطاقة الدخول",
    `الاسم: ${card.person.name}`,
    `المنصب: ${card.person.title}`,
    `الجهة: ${entity.name}`,
    `اسم المستخدم: ${card.username}`,
    `كلمة المرور: ${card.password}`,
    `رابط الدخول: ${loginUrl}`,
    "البطاقة شخصية، لا تشاركها مع أحد.",
  ].join("\n") : "";

  const download = () => saveImage(image, `بطاقة-${card!.person.name}.png`);
  const print = () => {
    if (!printImage(image, "بطاقة الدخول")) toast("اسمح بالنوافذ المنبثقة للطباعة", "warn");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast("نُسخت معلومات البطاقة"); } catch { toast("تعذّر النسخ", "warn"); }
  };

  return (
    <Sheet
      title={card ? "بطاقة الدخول" : "إصدار بطاقة دخول"}
      sub={`${p.title} — ${entity.short}`}
      onClose={onClose}
      footer={card ? (
        <>
          <button className="btn gold" onClick={download}><Download size={16} /> تنزيل صورة</button>
          <button className="btn primary" onClick={print}><Printer size={16} /> طباعة</button>
          <button className="btn ghost" onClick={() => void copy()}><Copy size={16} /> نسخ كنص</button>
        </>
      ) : (
        <>
          <button className="btn gold" onClick={() => void issue()} disabled={busy}><IdCard size={16} /> {busy ? "جارٍ الإصدار…" : "إصدار البطاقة"}</button>
          <button className="btn ghost" onClick={onClose}>إلغاء</button>
        </>
      )}
    >
      {card ? (
        <div className="grid" style={{ gap: 12 }}>
          {image ? <img src={image} alt="بطاقة الدخول" style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
            : <div className="skel" style={{ height: 420 }} />}
          <div className="lock-note">
            <TriangleAlert size={16} />
            <span>كلمة المرور تظهر <b>هذه المرة فقط</b>. سلّم البطاقة الآن، ولو ضاعت أصدر بطاقة جديدة فتتغير كلمة المرور.</span>
          </div>
        </div>
      ) : (
        <form onSubmit={issue} autoComplete="off">
          <div className="field">
            <label htmlFor="cd-name">اسم الشخص الكامل</label>
            <input id="cd-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد محمد العلي" autoFocus />
          </div>
          <div className="field">
            <label htmlFor="cd-phone">رقم الجوال</label>
            <input id="cd-phone" className="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" />
          </div>
          <div className="lock-note" style={{ marginTop: 14 }}>
            <TriangleAlert size={16} />
            <span>
              يُسجَّل الاسم والرقم على هذا الحساب، وتُولَّد <b>كلمة مرور جديدة</b> فتتوقف كلمة المرور القديمة ويخرج أي جهاز داخل بها.
              {(p as { active?: boolean }).active === false && <> الحساب <b>معطّل</b> حالياً؛ فعّله ليتمكن صاحبه من الدخول.</>}
            </span>
          </div>
        </form>
      )}
    </Sheet>
  );
}

/** ترسم البطاقة على لوح بمقاس صورة جوال لتُرسل أو تُطبع كما هي */
async function drawCard(card: IssuedCard, entityName: string, loginUrl: string) {
  const font = getComputedStyle(document.body).fontFamily;
  await document.fonts.ready;
  const W = 1080, H = 1350, P = 80;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const navy = "#0f2a44", gold = "#c9a24a";

  g.fillStyle = "#f6f3ec"; g.fillRect(0, 0, W, H);
  g.fillStyle = navy; g.fillRect(0, 0, W, 250);
  g.fillStyle = gold; g.fillRect(0, 250, W, 10);

  const text = (s: string, x: number, y: number, size: number, color: string, weight = 700, dir: CanvasDirection = "rtl", align: CanvasTextAlign = "right") => {
    g.direction = dir; g.textAlign = align;
    g.font = `${weight} ${size}px ${font}`;
    g.fillStyle = color;
    g.fillText(s, x, y);
  };
  text("محافظة الرقة — منصة الرقة الذكية", W / 2, 105, 34, "#e6c87c", 700, "rtl", "center");
  text("بطاقة الدخول", W / 2, 195, 68, "#fff", 900, "rtl", "center");

  let y = 340;
  const row = (label: string, value: string, opts: { ltr?: boolean; big?: boolean } = {}) => {
    text(label, W - P, y, 28, "#8a7340", 700);
    const size = opts.big ? 54 : 40;
    let v = value;
    g.font = `800 ${size}px ${font}`;
    while (g.measureText(v).width > W - 2 * P && v.length > 4) v = v.slice(0, -2);
    if (v !== value) v = v.slice(0, -1) + "…";
    text(v, W - P, y + size + 14, size, navy, 800, opts.ltr ? "ltr" : "rtl");
    y += size + 74;
    g.fillStyle = "#e2dccd"; g.fillRect(P, y - 32, W - 2 * P, 2);
  };
  row("الاسم", card.person.name);
  row("المنصب", card.person.title);
  row("الجهة", entityName);

  // صندوق بيانات الدخول
  y += 10;
  const boxTop = y - 20, boxH = 300;
  g.fillStyle = "#fff"; g.strokeStyle = gold; g.lineWidth = 4;
  g.beginPath(); g.roundRect(P - 20, boxTop, W - 2 * P + 40, boxH, 24); g.fill(); g.stroke();
  y += 30;
  row("اسم المستخدم", card.username, { ltr: true });
  row("كلمة المرور", card.password, { ltr: true, big: true });

  y = boxTop + boxH + 70;
  text("رابط الدخول", W - P, y, 28, "#8a7340", 700);
  text(loginUrl, W - P, y + 50, 32, navy, 700, "ltr");

  g.fillStyle = navy; g.fillRect(0, H - 110, W, 110);
  text("البطاقة شخصية — لا تشاركها مع أحد", W / 2, H - 42, 34, "#fff", 800, "rtl", "center");

  return c.toDataURL("image/png");
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
          <b>المهل المعتمدة:</b> العاجل و«العاجل وسري» يجب أن يصل رد خلالهما في <b>24 ساعة</b>، والهام في <b>48 ساعة</b> كحد أقصى،
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


/* ═══════════════════════ تحليلات الاستخدام ═══════════════════════ */

type UsageReport = {
  days: number;
  summary: {
    active24: number;
    sessions24: number;
    denied: number;
    usersTracked: number;
  };
  users: Array<{
    userId: string;
    name: string;
    title: string;
    role: string;
    entityId: string;
    active: boolean;
    online: boolean;
    lastLogin: string | null;
    lastLoginISO: string | null;
    lastOpen: string | null;
    lastOpenISO: string | null;
    lastSeen: string | null;
    lastSeenISO: string | null;
    lastExit: string | null;
    lastExitISO: string | null;
    visits: number;
    sessions: number;
    logins: number;
    topPage: string | null;
    topPageVisits: number;
    denied: number;
    troublePage: string | null;
    troubleCount: number;
  }>;
  friction: Array<{ path: string; attempts: number; users: number }>;
};

function usagePageLabel(path: string | null) {
  if (!path) return "—";
  const m = path.match(/^\/(diwan|directorates|admin)\/([^/]+)/);
  if (!m) return path;
  const portal = m[1] as keyof typeof navByPortal;
  return navByPortal[portal].find((n) => n.key === m[2])?.label ?? path;
}

function usageTime(iso: string | null, fallback: string | null) {
  if (!iso) return fallback ?? "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback ?? "—";
  return d.toLocaleString("ar-SY-u-nu-latn", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminUsage() {
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/usage/?days=14", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "تعذّر تحميل التقرير");
      setReport(data as UsageReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحميل التقرير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading && !report) {
    return <div className="card pad"><div className="skel" style={{ height: 260 }} /></div>;
  }

  if (!report) {
    return (
      <div className="card pad" style={{ textAlign: "center" }}>
        <TriangleAlert size={28} style={{ color: "var(--warn)", marginBottom: 10 }} />
        <b style={{ display: "block", marginBottom: 6 }}>تعذّر تحميل تحليلات الاستخدام</b>
        <p className="tiny muted" style={{ marginBottom: 12 }}>{error}</p>
        <button className="btn primary" onClick={() => void load()}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="grid stagger" style={{ gap: 16 }}>
      <div className="row between wrap" style={{ gap: 10 }}>
        <div>
          <b style={{ display: "block", fontSize: 15 }}>تقرير استخدام آخر {report.days} يوماً</b>
          <span className="tiny muted">يسجّل حركة الاستخدام فقط، وليس محتوى المعاملات أو الرسائل.</span>
        </div>
        <button className="btn ghost sm" disabled={loading} onClick={() => void load()}>
          {loading ? "جارٍ التحديث…" : "تحديث التقرير"}
        </button>
      </div>

      <div className="grid g-4">
        <Kpi label="نشط خلال 24 ساعة" value={report.summary.active24} icon={<Users size={17} />} tone="ok" />
        <Kpi label="مرات فتح التطبيق خلال 24 ساعة" value={report.summary.sessions24} icon={<CheckCircle2 size={17} />} tone="navy" />
        <Kpi label="محاولات وصول مرفوضة" value={report.summary.denied} icon={<TriangleAlert size={17} />} tone={report.summary.denied ? "danger" : "ok"} />
        <Kpi label="مستخدمون ظهر لهم نشاط" value={report.summary.usersTracked} icon={<ScrollText size={17} />} />
      </div>

      <Panel title="نشاط المستخدمين" icon={<Users size={17} />} hint="آخر دخول · آخر ظهور · نقاط التعثّر" flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الحالة</th>
                <th>آخر فتح</th>
                <th>آخر ظهور / خروج</th>
                <th>الأكثر استخداماً</th>
                <th>التعثّر</th>
              </tr>
            </thead>
            <tbody>
              {report.users.map((u) => (
                <tr key={u.userId}>
                  <td>
                    <div className="t-main">{u.name}</div>
                    <div className="t-sub">{u.title}</div>
                  </td>
                  <td>
                    {!u.active ? <span className="chip">معطّل</span>
                      : u.online ? <span className="chip ok live">متصل الآن</span>
                        : <span className="chip">غير متصل</span>}
                  </td>
                  <td className="tiny"><div>{usageTime(u.lastOpenISO, u.lastOpen)}</div>{u.lastLoginISO && <div className="muted" style={{ marginTop: 3 }}>دخول: {usageTime(u.lastLoginISO, u.lastLogin)}</div>}</td>
                  <td className="tiny">
                    <div>{usageTime(u.lastSeenISO, u.lastSeen)}</div>
                    {u.lastExitISO && <div className="muted" style={{ marginTop: 3 }}>خرج: {usageTime(u.lastExitISO, u.lastExit)}</div>}
                  </td>
                  <td>
                    <div className="t-main" style={{ fontSize: 12.5 }}>{usagePageLabel(u.topPage)}</div>
                    <div className="t-sub">{u.topPageVisits ? u.topPageVisits + " زيارة" : "لا بيانات بعد"}</div>
                  </td>
                  <td>
                    {u.denied > 0 ? (
                      <>
                        <span className="chip danger">{u.denied} محاولة</span>
                        <div className="t-sub" style={{ marginTop: 5 }}>{usagePageLabel(u.troublePage)}</div>
                      </>
                    ) : <span className="chip ok">لا تعثّر مسجّل</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="أكثر نقاط التعثّر" icon={<TriangleAlert size={17} />} hint="صفحات حاول المستخدمون فتحها ولم تسمح بها صلاحياتهم">
        {report.friction.length === 0 ? (
          <Empty text="لا توجد محاولات وصول مرفوضة ضمن الفترة" hint="هذا مؤشر جيد على وضوح التنقّل والصلاحيات" />
        ) : (
          <div className="grid" style={{ gap: 9 }}>
            {report.friction.map((f, i) => (
              <div key={f.path} className="card pad row between wrap" style={{ padding: 12, gap: 10 }}>
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  <span className={"chip " + (i === 0 ? "danger" : i < 3 ? "warn" : "")}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{usagePageLabel(f.path)}</b>
                    <div className="tiny muted ltr" style={{ marginTop: 3 }}>{f.path}</div>
                  </div>
                </div>
                <span className="tiny muted">{f.attempts} محاولة · {f.users} مستخدم</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
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
